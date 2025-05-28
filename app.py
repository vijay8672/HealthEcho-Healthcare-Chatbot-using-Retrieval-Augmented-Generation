"""
Main application entry point for the Advanced HR Assistant Chatbot.
Optimized for performance with local document processing and vector search.
"""
import os
import time
from pathlib import Path
from flask import Flask, render_template, request, jsonify, session
from flask_cors import CORS
from markdown import markdown

from src.utils.logger import get_logger
from src.chain.chain_builder import ChainBuilder
from src.conversation.history_manager import HistoryManager
# Language detection is handled by the chain builder
from src.speech.speech_to_text import SpeechToText
from src.speech.text_to_speech import TextToSpeech
from src.document_processing.training_pipeline import TrainingPipeline
from src.auth.auth_service import AuthService
from src.utils.email_service import EmailService
from src.config import HR_EMAILS, ENABLE_EMAIL_ESCALATION

logger = get_logger(__name__)

# Initialize Flask app
app = Flask(__name__,
           static_folder=os.path.join(os.path.dirname(__file__), "static"),
           template_folder=os.path.join(os.path.dirname(__file__), "templates"))
CORS(app)  # Enable CORS for all routes

# Set a secret key for session management
app.secret_key = os.environ.get('FLASK_SECRET_KEY', os.urandom(24))

# Initialize components
chain_builder = ChainBuilder()
history_manager = HistoryManager()
speech_to_text = SpeechToText()
text_to_speech = TextToSpeech()
auth_service = AuthService()
email_service = EmailService()

# Track session history
session_history = {}

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
        files_info = data.get("files_info", [])  # Get files info if available

        # Track if this is the first message
        is_first_message = device_id not in session_history
        session_history[device_id] = True

        # Process any unprocessed files first
        if files_info:
            logger.info(f"Processing {len(files_info)} files for query")
            pipeline = TrainingPipeline()

            # Process each file if it hasn't been processed yet
            for file_info in files_info:
                file_name = file_info.get("name")
                if file_name:
                    raw_dir = Path(app.root_path) / "data" / "raw"
                    file_path = raw_dir / file_name

                    # Check if the file exists and hasn't been processed
                    processed_marker = Path(app.root_path) / "data" / "processed" / file_name
                    if file_path.exists() and not processed_marker.exists():
                        logger.info(f"Processing file for query: {file_name}")
                        pipeline.process_file(file_path)
                    else:
                        logger.info(f"File already processed or not found: {file_name}")

        # Process query
        query_start_time = time.time()

        # Pass files info to the chain builder
        response = chain_builder.run_chain(
            user_query,
            device_id,
            files_info=files_info
        )

        response_content = response["content"]
        language = response["language"]
        sources = response["sources"]
        escalated = response.get("escalated", False)

        # Apply markdown formatting
        response_content = markdown(response_content)

        # Clean up response for first-time users
        if is_first_message:
            # Remove any standard introduction text if present
            response_content = response_content.split("I'm an HR assistant")[-1].strip()

        # Save conversation history
        history_manager.add_interaction(
            user_query=user_query,
            assistant_response=response_content,
            language=language,
            device_id=device_id,
            sources=sources,
            files_info=files_info
        )

        # Return response with sources and escalation info
        return jsonify({
            "response": response_content,
            "sources": sources,
            "language": language,
            "response_time": time.time() - query_start_time,
            "escalated": escalated
        })

    except Exception as e:
        import traceback
        error_type = type(e).__name__
        error_trace = traceback.format_exc()

        # Log detailed error information
        logger.error(f"Error processing query: {error_type}: {e}")
        logger.error(f"Traceback: {error_trace}")

        error_message = str(e)
        # Provide a more detailed error message for debugging
        # but sanitize it to avoid exposing sensitive information
        safe_error = error_message.replace(os.path.dirname(__file__), "[APP_PATH]")

        # Check if the error contains information from the chain builder
        if hasattr(e, 'response') and hasattr(e.response, 'json'):
            try:
                error_data = e.response.json()
                if 'error' in error_data:
                    # Use the error message from the chain builder
                    return jsonify({
                        "error": "An error occurred while processing your request.",
                        "message": error_data.get('content', "Please try again later."),
                        "details": safe_error if len(safe_error) < 200 else safe_error[:197] + "..."
                    }), 500
            except:
                pass

        # If we have a response from the chain builder with an error field
        if isinstance(response, dict) and 'error' in response:
            return jsonify({
                "response": response.get('content', "I'm sorry, I encountered an error while processing your request."),
                "error": "An error occurred while processing your request.",
                "error_type": response['error'].get('type', 'Unknown'),
                "details": response['error'].get('message', '')
            }), 500

        # Default error response
        return jsonify({
            "error": "An error occurred while processing your request.",
            "message": "Please try again later or simplify your query.",
            "details": safe_error if len(safe_error) < 200 else safe_error[:197] + "..."
        }), 500

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
            text = speech_to_text.recognize_speech()

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
        history_manager.clear_history(device_id)

        # Clear session tracking
        if device_id in session_history:
            del session_history[device_id]

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
        history = history_manager.get_history(device_id)

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
        result = email_service.send_escalation_email(
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
        company_name = data.get("company_name")

        # Validate required fields
        if not all([email, password, full_name]):
            return jsonify({
                "success": False,
                "message": "Email, password, and full name are required"
            }), 400

        # Register the user
        result = auth_service.register_user(
            email=email,
            password=password,
            full_name=full_name,
            company_name=company_name
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
        result = auth_service.login_user(
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
        user = auth_service.user_model.get_user_by_id(user_id)
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

if __name__ == "__main__":
    # Check if we should process HR files on startup
    process_files = os.environ.get('PROCESS_HR_FILES', 'false').lower() == 'true'

    if process_files:
        try:
            logger.info("Processing HR files on startup")
            pipeline = TrainingPipeline()
            pipeline.process_hr_files(Path("Hr Files"))
        except Exception as e:
            logger.error(f"Error processing HR files on startup: {e}")
    else:
        logger.info("Skipping HR files processing on startup. Set PROCESS_HR_FILES=true to enable.")

    # Start the application
    app.run(host="0.0.0.0", port=5000, debug=True)