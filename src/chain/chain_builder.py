"""
Build and execute LLM chains.
"""
import os
import time
from typing import List, Dict, Any, Optional
from langchain_groq import ChatGroq
from langchain.schema import HumanMessage, AIMessage

from ..utils.logger import get_logger
from ..retrieval.context_builder import ContextBuilder
from ..conversation.history_manager import HistoryManager
from ..conversation.language_detector import detect_language
from .prompt_templates import create_hr_assistant_prompt, create_general_assistant_prompt
from ..config import (
    GROQ_API_KEY, LLM_MODEL_NAME, HR_EMAILS, ENABLE_EMAIL_ESCALATION,
    INTENT_CLASSIFIER_CONFIDENCE_THRESHOLD
)
from ..utils.api_status import api_status_checker
from ..utils.email_service import EmailService
from ..intent.intent_classifier import IntentClassifier
from ..ner.entity_extractor import EntityExtractor
from ..cache.redis_cache import RedisCache
from ..document_processing.version_control import DocumentVersionControl

logger = get_logger(__name__)

class ChainBuilder:
    """Build and execute LLM chains."""

    def __init__(self,
                 model_name: str = LLM_MODEL_NAME,
                 api_key: str = GROQ_API_KEY,
                 context_builder: ContextBuilder = None,
                 history_manager: HistoryManager = None,
                 email_service: EmailService = None):
        """
        Initialize the chain builder.

        Args:
            model_name: Name of the LLM model to use
            api_key: API key for the LLM provider
            context_builder: Context builder for document retrieval
            history_manager: History manager for conversation history
            email_service: Email service for sending emails
        """
        # Validate API key
        if not api_key:
            logger.error("GROQ_API_KEY not found in environment variables")
            raise ValueError("GROQ_API_KEY is required but not set")
        
        # Validate model name
        if not model_name:
            logger.error("LLM_MODEL_NAME not found in environment variables")
            raise ValueError("LLM_MODEL_NAME is required but not set")
            
        logger.info(f"Initializing ChainBuilder with model: {model_name}")
        print(f"🛠️ Using GROQ_API_KEY: {api_key[:5]}...*** (from config)")
        
        self.model_name = model_name
        self.api_key = api_key
        self.context_builder = context_builder or ContextBuilder()
        self.history_manager = history_manager or HistoryManager()
        self.email_service = email_service or EmailService()

        # Initialize new components
        logger.info("Initializing intent classifier and entity extractor")
        self.intent_classifier = IntentClassifier()
        self.entity_extractor = EntityExtractor()
        self.redis_cache = RedisCache()
        self.version_control = DocumentVersionControl()

        # HR escalation settings
        self.hr_emails = HR_EMAILS
        self.enable_email_escalation = ENABLE_EMAIL_ESCALATION

        # Initialize LLM with optimized settings
        try:
            logger.info("Initializing ChatGroq LLM with optimized settings")
            self.llm = ChatGroq(
                model=model_name,
                groq_api_key=api_key,
                max_tokens=800,  # Limit token generation for faster responses
                temperature=0.1,  # Low temperature for more deterministic responses
                timeout=60,  # Increased timeout to handle complex queries
                # Optimize for efficiency and consistency
                model_kwargs={
                    "top_p": 0.9,  # Slightly reduce the token sampling pool
                    "frequency_penalty": 0.2,  # Discourage repetition
                    "presence_penalty": 0.6,  # Encourage diversity
                },
            )
            logger.info("ChatGroq LLM initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize ChatGroq LLM: {str(e)}")
            raise

    def format_response(self, text: str) -> str:
        """
        Format the response for better readability.

        Args:
            text: Raw response text

        Returns:
            Formatted response text
        """
        # The response is already in markdown format, so we just need to ensure
        # proper spacing and formatting
        paragraphs = text.split("\n\n")
        formatted_output = []

        for para in paragraphs:
            lines = para.splitlines()

            # Convert to Headings if keywords are found
            if any(
                para.startswith(keyword)
                for keyword in [
                    "What is",
                    "Causes of",
                    "Symptoms of",
                    "Types of",
                    "Transmission of",
                    "Prevention of",
                ]
            ):
                formatted_output.append(f"### {para}")

            # Bullet Points - Only if line starts with "-" or "*"
            elif all(line.strip().startswith(("-", "*")) for line in lines if line.strip()):
                formatted_output.extend([line.strip() for line in lines])

            # Numbered Lists - Only if line starts with a number
            elif all(
                line.strip()[0].isdigit() and line.strip()[1] == "."
                for line in lines if line.strip()
            ):
                formatted_output.extend(lines)

            # General Paragraph - No bullet points added
            else:
                formatted_output.append(para)

        return "\n\n".join(formatted_output)

    def run_chain(self, query: str, device_id: str, files_info: List[Dict[str, Any]] = None, retry_count: int = 0) -> Dict[str, Any]:
        """
        Run the LLM chain for a query.

        Args:
            query: User query
            device_id: Device ID for conversation history
            files_info: List of files attached to the message
            retry_count: Number of times this request has been retried

        Returns:
            Dictionary with response and metadata
        """
        try:
            # Check cache first
            logger.info(f"Checking cache for query: {query[:50]}...")
            cached_response = self.redis_cache.get_cached_query(query)
            if cached_response:
                logger.info("Cache hit - using cached response")
                return cached_response
            logger.info("Cache miss - proceeding with LLM call")

            # Log API key presence and model name
            logger.debug(f"GROQ_API_KEY present: {'YES' if bool(self.api_key) else 'NO'}")
            logger.debug(f"LLM_MODEL_NAME: {self.model_name}")

            # Check if Groq API is operational
            logger.info("Checking Groq API status")
            if not api_status_checker.is_groq_operational():
                logger.warning("Groq API appears to be down or experiencing issues")
                return {
                    "content": "I'm sorry, but our language model service is currently experiencing issues. Please try again in a few minutes.",
                    "language": "en",
                    "sources": [],
                    "error": {
                        "type": "ServiceUnavailable",
                        "message": "Groq API is not operational"
                    }
                }

            # Detect language
            try:
                logger.info("Detecting language")
                language = detect_language(query)
                logger.info(f"Detected language: {language}")
            except Exception as e:
                logger.error(f"Language detection failed: {e}")
                language = "en"  # Default to English

            # Classify intent
            try:
                logger.info("Classifying intent")
                intent, confidence = self.intent_classifier.classify(query)
                logger.info(f"Detected intent: {intent} (confidence: {confidence:.2f})")
            except Exception as e:
                logger.error(f"Intent classification failed: {e}")
                intent, confidence = "unknown", 0.0

            # Extract entities
            try:
                logger.info("Extracting entities")
                entities = self.entity_extractor.extract_entities(query)
                logger.info(f"Extracted entities: {entities}")
            except Exception as e:
                logger.error(f"Entity extraction failed: {e}")
                entities = []

            # Process files if provided
            if files_info:
                logger.info(f"Processing {len(files_info)} attached files")
                for file_info in files_info:
                    file_path = file_info.get("path")
                    if file_path:
                        try:
                            # Check if file needs re-indexing
                            if self.version_control.check_version(file_path):
                                logger.info(f"Re-indexing file: {file_path}")
                                self.version_control.reindex_document(file_path)
                        except Exception as e:
                            logger.error(f"Error processing file {file_path}: {e}")

            # Get conversation history
            try:
                logger.info("Retrieving conversation history")
                max_history_items = 5  # Only use the 5 most recent exchanges
                history = self.history_manager.get_history(device_id)[-max_history_items:]
                logger.info(f"Retrieved {len(history)} history items")
            except Exception as e:
                logger.error(f"Error retrieving conversation history: {e}")
                history = []

            # Convert history to message format
            history_messages = []
            if history:
                for msg in history:
                    history_messages.append(HumanMessage(content=msg["user_query"]))
                    history_messages.append(AIMessage(content=msg["assistant_response"]))

            # Build context
            try:
                logger.info("Building context")
                context_result = self.context_builder.build_context(
                    query,
                    max_tokens=1500,
                    files_info=files_info
                )
                context = context_result["context"]
                sources = context_result["sources"]
                logger.info(f"Built context with {len(context)} characters and {len(sources)} sources")
            except Exception as e:
                logger.error(f"Error building context: {e}")
                context = ""
                sources = []

            # Create and format prompt
            try:
                logger.info("Creating prompt")
                prompt_template = create_hr_assistant_prompt(language=language)
                formatted_prompt = prompt_template.format_messages(
                    context=context,
                    query=query,
                    history=history_messages
                )
                logger.info("Prompt created successfully")
                logger.debug(f"Full prompt sent to LLM: {formatted_prompt}")
            except Exception as e:
                logger.error(f"Error creating prompt: {e}")
                raise

            # --- Groq API call debug logging ---
            start_time = time.time()
            logger.info(f"Sending request to Groq API (attempt {retry_count + 1})")
            logger.debug(f"Groq API key present: {'YES' if self.api_key else 'NO'}")
            logger.debug(f"Groq model: {self.model_name}")
            try:
                # If using langchain_groq, we can't log HTTP details, but we can log prompt/model
                response = self.llm.invoke(formatted_prompt)
                response_time = time.time() - start_time
                logger.info(f"LLM response received in {response_time:.2f} seconds")
                raw_response = response.content if hasattr(response, "content") else str(response)
                logger.debug(f"Raw response from LLM: {raw_response}")
            except Exception as e:
                import traceback
                response_time = time.time() - start_time
                logger.error(f"Groq LLM call failed after {response_time:.2f} seconds: {str(e)}")
                logger.error(f"Traceback for Groq LLM call:\n{traceback.format_exc()}")
                return {
                    "content": f"[LLM ERROR] {str(e)}",
                    "language": "en",
                    "sources": [],
                    "error": {
                        "type": type(e).__name__,
                        "message": str(e),
                        "traceback": traceback.format_exc(),
                        "retry_attempted": retry_count > 0
                    }
                }

            # Check if response needs escalation
            needs_escalation = "[ESCALATE_TO_HR]" in raw_response
            if needs_escalation:
                raw_response = raw_response.replace("[ESCALATE_TO_HR]", "").strip()
                logger.info(f"Escalation needed for query: {query[:50]}...")

                if self.enable_email_escalation and self.hr_emails:
                    confirmation_message = "\n\n**Would you like me to escalate this question to the HR team?** They can provide a more specific answer to your question."
                    raw_response += confirmation_message

            # Format response
            try:
                logger.info("Formatting response")
                formatted_response = self.format_response(raw_response)
                logger.info("Response formatted successfully")
            except Exception as e:
                logger.error(f"Error formatting response: {e}")
                formatted_response = raw_response

            # Prepare result
            result = {
                "content": formatted_response,
                "language": language,
                "sources": sources,
                "response_time": response_time,
                "escalated": needs_escalation,
                "intent": intent,
                "intent_confidence": confidence,
                "entities": entities
            }

            # Cache the response
            try:
                logger.info("Caching response")
                self.redis_cache.cache_query(query, result)
                logger.info("Response cached successfully")
            except Exception as e:
                logger.error(f"Error caching response: {e}")

            logger.info(f"Successfully processed query: {query[:50]}...")
            return result

        except Exception as e:
            import traceback
            error_type = type(e).__name__
            error_trace = traceback.format_exc()
            logger.error(f"Error running chain: {error_type}: {e}")
            logger.error(f"Traceback: {error_trace}")
            error_message = self._get_error_message(e, error_type)
            return {
                "content": error_message,
                "language": "en",
                "sources": [],
                "error": {
                    "type": error_type,
                    "message": str(e),
                    "traceback": error_trace,
                    "retry_attempted": retry_count > 0
                }
            }

    def _get_error_message(self, error: Exception, error_type: str) -> str:
        """
        Get a user-friendly error message with detailed logging.
        
        Args:
            error: The exception that occurred
            error_type: Type of the exception
            
        Returns:
            User-friendly error message
        """
        error_str = str(error).lower()
        
        # Log the specific error type and message
        logger.error(f"Error type: {error_type}")
        logger.error(f"Error message: {error_str}")
        
        # Map error types to user-friendly messages
        if "timeout" in error_str or error_type == "TimeoutError":
            logger.error("Request timed out - LLM took too long to respond")
            return "The request took too long to process. This might be due to a complex query or temporary service issues."
            
        elif "api key" in error_str or "authentication" in error_str:
            logger.error("Authentication failed - Invalid or missing API key")
            return "There was an issue with the API authentication. Please check the API key configuration."
            
        elif "rate limit" in error_str or "too many requests" in error_str:
            logger.error("Rate limit exceeded - Too many requests")
            return "The service is currently experiencing high demand. Please try again in a few moments."
            
        elif "connection" in error_str or "network" in error_str:
            logger.error("Network error - Connection issues")
            return "There was a network connection issue. Please check your internet connection and try again."
            
        elif "model" in error_str and "not found" in error_str:
            logger.error("Model not found - Invalid model name")
            return "The specified language model is not available. Please check the model configuration."
            
        elif "context length" in error_str or "token limit" in error_str:
            logger.error("Context length exceeded - Query too long")
            return "The query is too long or complex. Please try breaking it down into smaller parts."
            
        elif "invalid request" in error_str:
            logger.error("Invalid request - Malformed input")
            return "The request could not be processed. Please check your input and try again."
            
        elif "service unavailable" in error_str:
            logger.error("Service unavailable - LLM service down")
            return "The language model service is currently unavailable. Please try again later."
            
        else:
            logger.error(f"Unknown error type: {error_type}")
            return "I'm sorry, I encountered an error while processing your request. Please try again."
