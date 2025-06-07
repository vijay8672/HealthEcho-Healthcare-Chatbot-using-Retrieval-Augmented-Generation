"""
Main application entry point for the Advanced HR Assistant Chatbot.
Optimized for performance with local document processing and vector search.
"""
import os
import time
import asyncio
from pathlib import Path
from dotenv import load_dotenv
import multiprocessing

# Must be at the very top for Windows multiprocessing
multiprocessing.set_start_method('spawn', force=True)

# Load environment variables from .env file
load_dotenv()

# Validate required environment variables
if not os.getenv("GROQ_API_KEY"):
    raise ValueError("❌ GROQ_API_KEY is not set in the environment or .env file")

# Now import all other modules
from flask import Flask, render_template, request, jsonify, session
from flask_cors import CORS
from markdown import markdown
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
import uvicorn

from src.utils.logger import get_logger
from src.chain.chain_builder import ChainBuilder
from src.conversation.history_manager import HistoryManager
# Language detection is handled by the chain builder
from src.speech.speech_to_text import SpeechToText
from src.speech.text_to_speech import TextToSpeech
from src.document_processing.training_pipeline import TrainingPipeline
from src.auth.auth_service import AuthService
from src.utils.email_service import EmailService
from src.config import HR_EMAILS, ENABLE_EMAIL_ESCALATION, GROQ_API_KEY
from src.config import REDIS_HOST, REDIS_PORT, REDIS_PASSWORD
from src.cache.redis_cache import RedisCache

# Initialize Redis cache
redis_cache = RedisCache()

# Initialize FastAPI app
fastapi_app = FastAPI()

# Initialize logger
logger = get_logger(__name__)

# Global variables for lazy initialization
_chain_builder = None
_history_manager = None
_speech_to_text = None
_text_to_speech = None
_auth_service = None
_email_service = None
_session_history = {}

def get_chain_builder():
    """Lazy initialization of ChainBuilder."""
    global _chain_builder
    if _chain_builder is None:
        _chain_builder = ChainBuilder()
    return _chain_builder

def get_history_manager():
    """Lazy initialization of HistoryManager."""
    global _history_manager
    if _history_manager is None:
        _history_manager = HistoryManager()
    return _history_manager

def get_speech_to_text():
    """Lazy initialization of SpeechToText."""
    global _speech_to_text
    if _speech_to_text is None:
        _speech_to_text = SpeechToText()
    return _speech_to_text

def get_text_to_speech():
    """Lazy initialization of TextToSpeech."""
    global _text_to_speech
    if _text_to_speech is None:
        _text_to_speech = TextToSpeech()
    return _text_to_speech

def get_auth_service():
    """Lazy initialization of AuthService."""
    global _auth_service
    if _auth_service is None:
        _auth_service = AuthService()
    return _auth_service

def get_email_service():
    """Lazy initialization of EmailService."""
    global _email_service
    if _email_service is None:
        _email_service = EmailService()
    return _email_service

def run_async_in_sync(coro):
    """Helper function to run async functions in sync context."""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as executor:
                future = executor.submit(asyncio.run, coro)
                return future.result()
        else:
            return loop.run_until_complete(coro)
    except RuntimeError:
        return asyncio.run(coro)

def initialize_services():
    """Initialize core services only once."""
    if os.environ.get("WERKZEUG_RUN_MAIN") == "true":
        logger.info("Initializing core services...")
        
        # Initialize essential services
        get_chain_builder()
        get_history_manager()
        
        # Initialize optional services based on configuration
        if ENABLE_EMAIL_ESCALATION and HR_EMAILS:
            get_email_service()
        
        # Process HR files if configured
        if os.environ.get('PROCESS_HR_FILES', 'false').lower() == 'true':
            try:
                logger.info("Processing HR files on startup")
                pipeline = TrainingPipeline()
                pipeline.process_hr_files(Path("data/raw files"))
            except Exception as e:
                logger.error(f"Error processing HR files on startup: {e}")
        else:
            logger.info("Skipping HR files processing on startup. Set PROCESS_HR_FILES=true to enable.")

def create_app():
    """Create and configure the Flask application."""
    app = Flask(__name__,
               static_folder=os.path.join(os.path.dirname(__file__), "static"),
               template_folder=os.path.join(os.path.dirname(__file__), "templates"))
    CORS(app)  # Enable CORS for all routes

    # Set a secret key for session management
    app.secret_key = os.environ.get('FLASK_SECRET_KEY', os.urandom(24))

    @app.route("/")
    def index():
        """Render the main application page."""
        return render_template("index.html")

    @app.route("/api/query", methods=["POST"])
    def query():
        """Process a text query and return the response."""
        try:
            data = request.json
            user_query = data["query"]
            device_id = data["device_id"]
            files_info = data.get("files_info", [])

            # Track if this is the first message
            is_first_message = device_id not in _session_history
            _session_history[device_id] = True

            # Process any unprocessed files first
            if files_info:
                logger.info(f"Processing {len(files_info)} files for query")
                pipeline = TrainingPipeline()

                for file_info in files_info:
                    file_name = file_info.get("name")
                    if file_name:
                        raw_dir = Path(app.root_path) / "data" / "raw"
                        file_path = raw_dir / file_name
                        processed_marker = Path(app.root_path) / "data" / "processed" / file_name
                        
                        if file_path.exists() and not processed_marker.exists():
                            logger.info(f"Processing file for query: {file_name}")
                            pipeline.process_file(file_path)
                        else:
                            logger.info(f"File already processed or not found: {file_name}")

            # Process query
            query_start_time = time.time()
            
            logger.debug(f"_chain_builder before get_chain_builder: {_chain_builder}")
            chain_builder = get_chain_builder()
            logger.debug(f"chain_builder instance after get_chain_builder: {chain_builder}")

            # Check cache first using sync method
            cached = redis_cache.get_cached_query_sync(user_query)
            if cached:
                logger.debug("Returning cached response from sync cache")
                return jsonify({
                    "response": cached["content"],
                    "sources": cached.get("sources", []),
                    "language": cached.get("language", "en"),
                    "response_time": time.time() - query_start_time,
                    "escalated": cached.get("escalated", False)
                })

            # Call the asynchronous run_chain method using the synchronous wrapper
            result = run_async_in_sync(
                chain_builder.run_chain(
                    user_query,
                    device_id,
                    files_info=files_info
                )
            )
            
            logger.debug(f"Raw result from run_chain_sync (now run_async_in_sync): {result}")

            # The result from run_async_in_sync is already the awaited response
            response = result

            logger.debug(f"Raw response from ChainBuilder (after async check): {response}")

            # Handle case where response from chain builder is None or not a dict
            if response is None or not isinstance(response, dict):
                logger.error(f"Chain builder in Flask route returned unexpected response type: {type(response)}. Value: {response}")
                response_content = "I'm sorry, I encountered an internal issue and couldn't process your request."\
                                   " Please try again later or simplify your query."
                language = "en"
                sources = []
                escalated = False
            else:
                # Extract response data safely
                response_content = response.get("content", "")
                language = response.get("language", "en")
                sources = response.get("sources", [])
                escalated = response.get("escalated", False)

            # If response_content is still empty after extraction, provide a generic message
            if not response_content.strip():
                response_content = "I'm sorry, I couldn't find a helpful response. Please try rephrasing your query."

            # Apply markdown formatting
            response_content = markdown(response_content)

            # Clean up response for first-time users
            if is_first_message:
                response_content = response_content.split("I'm an HR assistant")[-1].strip()

            # Save conversation history
            history_manager = get_history_manager()
            history_manager.add_interaction(
                user_query=user_query,
                assistant_response=response_content,
                language=language,
                device_id=device_id,
                sources=sources,
                files_info=files_info
            )

            result = {
                "response": response_content,
                "sources": sources,
                "language": language,
                "response_time": time.time() - query_start_time,
                "escalated": escalated
            }

            # Cache the result using sync method
            redis_cache.cache_query_sync(user_query, result)

            return jsonify(result)

        except Exception as e:
            import traceback
            error_type = type(e).__name__
            error_trace = traceback.format_exc()
            logger.error(f"Error processing query: {error_type}: {e}")
            logger.error(f"Traceback: {error_trace}")
            
            safe_error = str(e).replace(os.path.dirname(__file__), "[APP_PATH]")
            return jsonify({
                "error": "An error occurred while processing your request.",
                "message": "Please try again later or simplify your query.",
                "details": safe_error if len(safe_error) < 200 else safe_error[:197] + "..."
            })

    @app.route("/api/speech-to-text", methods=["POST"])
    def speech_to_text_api():
        """Convert speech to text."""
        try:
            # Get audio data from request
            audio_data = request.files.get("audio")

            if audio_data:
                # Save audio to temporary file
                temp_path = Path(app.root_path) / "temp_audio.wav"
                audio_data.save(temp_path)

                # Process audio file
                # TODO: Implement audio file processing
                text = "Audio file processing not implemented yet"
            else:
                # Record audio directly
                text = get_speech_to_text().recognize_speech()

            return jsonify({"text": text})

        except Exception as e:
            logger.error(f"Error in speech-to-text: {e}")
            return jsonify({"error": str(e)}), 500

    @app.route("/api/upload-document", methods=["POST"])
    def upload_document():
        """Upload a document without immediate processing."""
        try:
            # Check if file was uploaded
            if "file" not in request.files:
                logger.warning("No file found in request")
                return jsonify({"error": "No file uploaded", "success": False}), 400

            file = request.files["file"]

            if file.filename == "":
                logger.warning("Empty filename in request")
                return jsonify({"error": "No file selected", "success": False}), 400

            # Log file information
            logger.info(f"Uploading file: {file.filename}, Content-Type: {file.content_type}, Size: {file.content_length} bytes")

            # Save file to raw directory
            raw_dir = Path(app.root_path) / "data" / "raw"
            os.makedirs(raw_dir, exist_ok=True)

            file_path = raw_dir / file.filename

            # Check if file already exists
            if file_path.exists():
                logger.info(f"File already exists, overwriting: {file_path}")

            # Save the file
            file.save(file_path)

            # Verify file was saved correctly
            if not file_path.exists():
                logger.error(f"File was not saved correctly: {file_path}")
                return jsonify({"error": "File could not be saved", "success": False}), 500

            logger.info(f"File uploaded successfully: {file_path}")

            # Return success without processing the file
            # Processing will happen when the user sends a query
            return jsonify({
                "success": True,
                "filename": file.filename,
                "file_path": str(file_path),
                "file_size": os.path.getsize(file_path)
            })

        except Exception as e:
            import traceback
            error_trace = traceback.format_exc()
            logger.error(f"Error uploading document: {e}")
            logger.error(f"Traceback: {error_trace}")
            return jsonify({"error": str(e), "success": False}), 500

    @app.route("/api/clear-history", methods=["POST"])
    def clear_history():
        """Clear conversation history for a device."""
        try:
            data = request.json
            device_id = data["device_id"]

            # Clear history
            history_manager = get_history_manager()
            history_manager.clear_history(device_id)

            # Clear session tracking
            if device_id in _session_history:
                del _session_history[device_id]

            return jsonify({"success": True})

        except Exception as e:
            logger.error(f"Error clearing history: {e}")
            return jsonify({"error": str(e)}), 500

    @app.route("/api/confirm-escalation", methods=["POST"])
    def confirm_escalation():
        """Confirm escalation and send email to HR."""
        try:
            data = request.json
            user_query = data["query"]
            device_id = data["device_id"]

            # Get conversation history for context
            history = get_history_manager().get_history(device_id)

            # Check if email escalation is enabled
            if not ENABLE_EMAIL_ESCALATION:
                return jsonify({
                    "success": False,
                    "message": "Email escalation is not enabled"
                }), 400

            # Check if HR emails are configured
            if not HR_EMAILS:
                return jsonify({
                    "success": False,
                    "message": "No HR email addresses configured"
                }), 400

            # Send escalation email
            result = get_email_service().send_escalation_email(
                hr_emails=HR_EMAILS,
                user_query=user_query,
                conversation_history=history
            )

            if result["success"]:
                return jsonify({
                    "success": True,
                    "message": "Your question has been escalated to the HR team. They will follow up with you directly."
                })
            else:
                logger.error(f"Error sending escalation email: {result['message']}")
                return jsonify({
                    "success": False,
                    "message": "There was an error escalating your question. Please try again later."
                }), 500

        except Exception as e:
            logger.error(f"Error confirming escalation: {e}")
            return jsonify({"error": str(e)}), 500

    @app.route("/api/file-preview", methods=["GET"])
    def file_preview():
        """Get file content for preview."""
        try:
            filename = request.args.get("filename")
            if not filename:
                return jsonify({"error": "No filename provided"}), 400

            # Construct file path
            raw_dir = Path(app.root_path) / "data" / "raw"
            file_path = raw_dir / filename

            # Check if file exists
            if not file_path.exists():
                return jsonify({"error": f"File {filename} not found"}), 404

            # Get file extension
            file_extension = file_path.suffix.lower()

            # Return file content based on type
            if file_extension in ['.txt', '.md']:
                # Text files
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                return jsonify({
                    "success": True,
                    "content": content,
                    "content_type": "text"
                })
            elif file_extension in ['.pdf', '.docx']:
                # Binary files - return file path for frontend to handle
                return jsonify({
                    "success": True,
                    "file_path": str(file_path),
                    "content_type": file_extension[1:]  # Remove the dot
                })
            else:
                return jsonify({
                    "error": f"Unsupported file type: {file_extension}"
                }), 400

        except Exception as e:
            logger.error(f"Error getting file preview: {e}")
            return jsonify({"error": str(e)}), 500

    @app.route("/api/process-hr-files", methods=["POST"])
    def process_hr_files():
        """Process HR files from a directory."""
        try:
            data = request.json
            directory = data.get("directory", "Hr Files")
            force_reprocess = data.get("force_reprocess", False)

            # Process HR files
            pipeline = TrainingPipeline()
            num_processed = pipeline.process_hr_files(Path(directory), force_reprocess=force_reprocess)

            return jsonify({
                "success": True,
                "files_processed": num_processed,
                "force_reprocess": force_reprocess
            })

        except Exception as e:
            logger.error(f"Error processing HR files: {e}")
            return jsonify({"error": str(e)}), 500

    @app.route("/api/register", methods=["POST"])
    def register():
        """Register a new user."""
        try:
            data = request.json
            email = data.get("email")
            password = data.get("password")
            full_name = data.get("full_name")
            employee_id = data.get("employee_id")

            # Validate required fields (remove employee_id)
            if not all([email, password, full_name]):
                return jsonify({
                    "success": False,
                    "message": "Email, password, and full name are required"
                }), 400

            # Register the user
            result = get_auth_service().register_user(
                email=email,
                password=password,
                full_name=full_name,
                employee_id=employee_id
            )

            if result["success"]:
                return jsonify(result), 201
            else:
                return jsonify(result), 400

        except Exception as e:
            logger.error(f"Error registering user: {e}")
            return jsonify({
                "success": False,
                "message": f"An error occurred: {str(e)}"
            }), 500

    @app.route("/api/login", methods=["POST"])
    def login():
        """Authenticate a user."""
        try:
            data = request.json
            email = data.get("email")
            password = data.get("password")

            # Validate required fields
            if not all([email, password]):
                return jsonify({
                    "success": False,
                    "message": "Email and password are required"
                }), 400

            # Authenticate the user
            result = get_auth_service().login_user(
                email=email,
                password=password
            )

            if result["success"]:
                # Store user info in session
                session["user_id"] = result["user"]["id"]
                session["email"] = result["user"]["email"]

                return jsonify(result), 200
            else:
                return jsonify(result), 401

        except Exception as e:
            logger.error(f"Error logging in user: {e}")
            return jsonify({
                "success": False,
                "message": f"An error occurred: {str(e)}"
            }), 500

    @app.route("/api/logout", methods=["POST"])
    def logout():
        """Log out a user."""
        try:
            # Clear session
            session.clear()

            return jsonify({
                "success": True,
                "message": "Logged out successfully"
            }), 200

        except Exception as e:
            logger.error(f"Error logging out user: {e}")
            return jsonify({
                "success": False,
                "message": f"An error occurred: {str(e)}"
            }), 500

    @app.route("/api/user", methods=["GET"])
    def get_user():
        """Get the current user's information."""
        try:
            # Check if user is logged in
            user_id = session.get("user_id")
            if not user_id:
                return jsonify({
                    "success": False,
                    "message": "Not authenticated"
                }), 401

            # Get user info
            user = get_auth_service().user_model.get_user_by_id(user_id)
            if not user:
                session.clear()
                return jsonify({
                    "success": False,
                    "message": "User not found"
                }), 404

            return jsonify({
                "success": True,
                "user": {
                    "id": user["id"],
                    "email": user["email"],
                    "full_name": user["full_name"],
                    "company_name": user["company_name"]
                }
            }), 200

        except Exception as e:
            logger.error(f"Error getting user: {e}")
            return jsonify({
                "success": False,
                "message": f"An error occurred: {str(e)}"
            }), 500

    @app.route("/api/hr-representatives", methods=["GET"])
    def get_hr_representatives():
        """Get list of HR representatives."""
        try:
            # This is a demo implementation. In production, this would come from a database
            hr_reps = [
                {"id": "hr1", "name": "John Smith", "email": "john.smith@company.com", "department": "HR Operations"},
                {"id": "hr2", "name": "Sarah Johnson", "email": "sarah.j@company.com", "department": "Employee Relations"},
                {"id": "hr3", "name": "Michael Brown", "email": "michael.b@company.com", "department": "Benefits"}
            ]
            return jsonify({"success": True, "representatives": hr_reps})
        except Exception as e:
            logger.error(f"Error getting HR representatives: {e}")
            return jsonify({"error": str(e)}), 500

    @app.route("/api/submit-escalation", methods=["POST"])
    def submit_escalation():
        """Submit a new HR escalation."""
        try:
            data = request.json
            required_fields = ["hrPerson", "issueType", "issueDescription", "priority"]
            
            # Validate required fields
            for field in required_fields:
                if field not in data:
                    return jsonify({
                        "success": False,
                        "message": f"Missing required field: {field}"
                    }), 400

            # Get user details from session
            user_details = session.get("user_details", {})
            if not user_details:
                return jsonify({
                    "success": False,
                    "message": "User not authenticated"
                }), 401

            # Create escalation record
            escalation_data = {
                "user_id": user_details.get("id"),
                "user_name": user_details.get("name"),
                "user_email": user_details.get("email"),
                "hr_person": data["hrPerson"],
                "issue_type": data["issueType"],
                "description": data["issueDescription"],
                "priority": data["priority"],
                "status": "pending",
                "created_at": time.time()
            }

            # In production, this would be saved to a database
            logger.info(f"New escalation created: {escalation_data}")

            # Send email notification to HR
            if ENABLE_EMAIL_ESCALATION:
                email_service = get_email_service()
                hr_email = next((rep["email"] for rep in get_hr_representatives().json["representatives"] 
                               if rep["id"] == data["hrPerson"]), None)
                
                if hr_email:
                    email_service.send_escalation_email(
                        hr_emails=[hr_email],
                        user_query=f"New HR Escalation: {data['issueType']} - {data['issueDescription']}",
                        conversation_history=[{
                            "user_query": f"Priority: {data['priority']}\nIssue Type: {data['issueType']}\nDescription: {data['issueDescription']}",
                            "assistant_response": f"Escalated to: {data['hrPerson']}"
                        }]
                    )

            return jsonify({
                "success": True,
                "message": "Your issue has been escalated to HR. They will contact you shortly.",
                "escalation_id": f"ESC-{int(time.time())}"  # Demo escalation ID
            })

        except Exception as e:
            logger.error(f"Error submitting escalation: {e}")
            return jsonify({"error": str(e)}), 500

    @app.route("/api/chats/<chat_id>", methods=["GET"])
    def get_chat(chat_id):
        """Get paginated messages for a specific chat."""
        try:
            # Get pagination parameters
            page = int(request.args.get("page", 1))
            page_size = int(request.args.get("page_size", 20))
            
            # Get chat history from history manager
            history_manager = get_history_manager()
            messages = history_manager.get_chat_messages(chat_id, page, page_size)
            
            # Get total message count for pagination
            total_messages = history_manager.get_chat_message_count(chat_id)
            
            return jsonify({
                "success": True,
                "messages": messages,
                "pagination": {
                    "page": page,
                    "page_size": page_size,
                    "total_messages": total_messages,
                    "total_pages": (total_messages + page_size - 1) // page_size
                }
            })
            
        except Exception as e:
            logger.error(f"Error getting chat messages: {e}")
            return jsonify({"error": str(e)}), 500

    @app.route("/api/chats/<chat_id>/count", methods=["GET"])
    def get_chat_message_count_api(chat_id):
        """Get total number of messages for a specific chat."""
        try:
            history_manager = get_history_manager()
            total_messages = history_manager.get_chat_message_count(chat_id)
            return jsonify({
                "success": True,
                "count": total_messages
            })
        except Exception as e:
            logger.error(f"Error getting chat message count: {e}")
            return jsonify({"error": str(e)}), 500

    return app

# FastAPI routes
@fastapi_app.post("/api/query")
async def handle_query(request: Request):
    """FastAPI endpoint for processing queries."""
    try:
        data = await request.json()
        user_query = data.get("query", "")
        device_id = data.get("device_id", "unknown")
        files_info = data.get("files_info", [])

        # Check cache first
        cached = await redis_cache.get_cached_query(user_query)
        if cached:
            return JSONResponse(content={"cached": True, "data": cached})

        # Process any unprocessed files first
        if files_info:
            logger.info(f"Processing {len(files_info)} files for query")
            pipeline = TrainingPipeline()

            for file_info in files_info:
                file_name = file_info.get("name")
                if file_name:
                    raw_dir = Path(os.path.dirname(__file__)) / "data" / "raw"
                    file_path = raw_dir / file_name
                    processed_marker = Path(os.path.dirname(__file__)) / "data" / "processed" / file_name
                    
                    if file_path.exists() and not processed_marker.exists():
                        logger.info(f"Processing file for query: {file_name}")
                        pipeline.process_file(file_path)
                    else:
                        logger.info(f"File already processed or not found: {file_name}")

        # Process query using chain builder
        chain_builder = get_chain_builder()
        
        # Get response from chain builder
        response = await chain_builder.run_chain(user_query, device_id, files_info=files_info)
        
        if not response:
            return JSONResponse(
                status_code=500,
                content={"error": "Failed to generate response"}
            )

        # Format response
        if isinstance(response, dict):
            response_content = response.get("content", "")
            language = response.get("language", "en")
            sources = response.get("sources", [])
            escalated = response.get("escalated", False)
        else:
            response_content = str(response)
            language = "en"
            sources = []
            escalated = False

        # Apply markdown formatting
        response_content = markdown(response_content)

        # Save conversation history
        history_manager = get_history_manager()
        history_manager.add_interaction(
            user_query=user_query,
            assistant_response=response_content,
            language=language,
            device_id=device_id,
            sources=sources,
            files_info=files_info
        )

        result = {
            "response": response_content,
            "sources": sources,
            "language": language,
            "escalated": escalated
        }
        
        # Cache the result
        await redis_cache.cache_query(user_query, result)
        
        return JSONResponse(content={"cached": False, "data": result})

    except Exception as e:
        import traceback
        error_type = type(e).__name__
        error_trace = traceback.format_exc()
        logger.error(f"Error processing query: {error_type}: {e}")
        logger.error(f"Traceback: {error_trace}")
        
        safe_error = str(e).replace(os.path.dirname(__file__), "[APP_PATH]")
        return JSONResponse(
            status_code=500,
            content={
                "error": "An error occurred while processing your request.",
                "message": "Please try again later or simplify your query.",
                "details": safe_error if len(safe_error) < 200 else safe_error[:197] + "..."
            }
        )

@fastapi_app.get("/api/cache/stats")
async def cache_stats():
    """FastAPI endpoint for getting cache statistics."""
    try:
        stats = await redis_cache.get_cache_stats()
        return JSONResponse(content=stats)
    except Exception as e:
        logger.error(f"Error getting cache stats: {e}")
        return JSONResponse(
            status_code=500,
            content={"error": "Failed to retrieve cache statistics"}
        )

def run_fastapi():
    """Run the FastAPI server."""
    import uvicorn
    uvicorn.run(
        "app:fastapi_app",
        host="0.0.0.0",
        port=8000,
        log_level="info",
        access_log=True,
        reload=False
    )

if __name__ == "__main__":
    # Initialize services and start FastAPI (only once by the main process)
    initialize_services()
    
    # Start FastAPI in a separate process
    fastapi_process = multiprocessing.Process(target=run_fastapi)
    fastapi_process.daemon = True  # Make it a daemon process
    fastapi_process.start()

    # Create Flask app
    flask_app = create_app()

    try:
        # Run Flask app, explicitly disable reloader to avoid multiprocessing conflicts
        flask_app.run(host="0.0.0.0", port=5000, debug=True, use_reloader=False)
    except KeyboardInterrupt:
        print("\nShutting down servers...")
    finally:
        # Clean up FastAPI process when Flask exits
        if fastapi_process.is_alive():
            fastapi_process.terminate()
            fastapi_process.join(timeout=5)
    