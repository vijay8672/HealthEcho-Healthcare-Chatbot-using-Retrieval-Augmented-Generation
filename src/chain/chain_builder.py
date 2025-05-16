"""
Build and execute LLM chains.
"""
import os
from typing import List, Dict, Any, Optional
from langchain_groq import ChatGroq
from langchain.schema import HumanMessage, AIMessage

from ..utils.logger import get_logger
from ..retrieval.context_builder import ContextBuilder
from ..conversation.history_manager import HistoryManager
from ..conversation.language_detector import detect_language
from .prompt_templates import create_hr_assistant_prompt, create_general_assistant_prompt
from ..config import GROQ_API_KEY, LLM_MODEL_NAME, HR_EMAILS, ENABLE_EMAIL_ESCALATION
from ..utils.api_status import api_status_checker
from ..utils.email_service import EmailService

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
        self.model_name = model_name
        self.api_key = api_key
        self.context_builder = context_builder or ContextBuilder()
        self.history_manager = history_manager or HistoryManager()
        self.email_service = email_service or EmailService()

        # HR escalation settings
        self.hr_emails = HR_EMAILS
        self.enable_email_escalation = ENABLE_EMAIL_ESCALATION

        # Initialize LLM with optimized settings
        self.llm = ChatGroq(
            model=model_name,
            groq_api_key=api_key,
            max_tokens=700,  # Limit token generation for faster responses
            temperature=0.1,  # Low temperature for more deterministic responses
            timeout=60,  # Increased timeout to handle complex queries
            # Optimize for efficiency and consistency
            model_kwargs={
                "top_p": 0.9,  # Slightly reduce the token sampling pool
                "frequency_penalty": 0.2,  # Discourage repetition
                "presence_penalty": 0.6,  # Encourage diversity
            },
        )

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
            # Check if Groq API is operational
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
            language = detect_language(query)

            # Limit history to reduce context size and improve performance
            max_history_items = 5  # Only use the 5 most recent exchanges
            history = self.history_manager.get_history(device_id)[-max_history_items:]

            # Convert history to message format - only if we have history
            history_messages = []
            if history:
                for msg in history:
                    history_messages.append(HumanMessage(content=msg["user_query"]))
                    history_messages.append(AIMessage(content=msg["assistant_response"]))

            # Build context with optimized token limit
            # Include files_info if available
            context_result = self.context_builder.build_context(
                query,
                max_tokens=1500,
                files_info=files_info
            )
            context = context_result["context"]
            sources = context_result["sources"]

            # Log context size for monitoring
            logger.info(f"Context size: {len(context)} characters, {len(sources)} sources")

            # Create prompt
            prompt_template = create_hr_assistant_prompt(language=language)

            # Format prompt
            formatted_prompt = prompt_template.format_messages(
                context=context,
                query=query,
                history=history_messages
            )

            # Invoke model with timeout handling
            import time
            start_time = time.time()

            # Log the request attempt
            logger.info(f"Sending request to Groq API (attempt {retry_count + 1})")

            response = self.llm.invoke(formatted_prompt)

            # Log response time
            response_time = time.time() - start_time
            logger.info(f"LLM response time: {response_time:.2f} seconds")

            # Get raw response content
            raw_response = response.content if hasattr(response, "content") else str(response)

            # Check if response needs escalation
            needs_escalation = "[ESCALATE_TO_HR]" in raw_response

            # Remove the escalation tag if present
            if needs_escalation:
                raw_response = raw_response.replace("[ESCALATE_TO_HR]", "").strip()
                logger.info(f"Escalation needed for query: {query[:50]}...")

                # Add a note about confirmation to the response
                if self.enable_email_escalation and self.hr_emails:
                    # We'll add a confirmation message to the response
                    confirmation_message = "\n\n**Would you like me to escalate this question to the HR team?** They can provide a more specific answer to your question."
                    raw_response += confirmation_message

            # Format response
            formatted_response = self.format_response(raw_response)

            # Prepare result
            result = {
                "content": formatted_response,
                "language": language,
                "sources": sources,
                "response_time": response_time,
                "escalated": needs_escalation
            }

            logger.info(f"Generated response for query: {query[:50]}...")
            return result

        except Exception as e:
            import traceback
            error_type = type(e).__name__
            error_trace = traceback.format_exc()

            # Log detailed error information
            logger.error(f"Error running chain: {error_type}: {e}")
            logger.error(f"Traceback: {error_trace}")

            # Determine if we should retry
            should_retry = False
            max_retries = 2  # Maximum number of retries

            # Check error types that are suitable for retry
            if retry_count < max_retries:
                # Network/connection errors are good candidates for retry
                if ("timeout" in str(e).lower() or
                    error_type == "TimeoutError" or
                    "connection" in str(e).lower() or
                    "network" in str(e).lower() or
                    "rate limit" in str(e).lower()):
                    should_retry = True
                    logger.info(f"Will retry request (attempt {retry_count + 1} of {max_retries})")

            # Attempt retry if appropriate
            if should_retry:
                # Exponential backoff: wait longer for each retry
                import time
                wait_time = 2 ** retry_count  # 1, 2, 4, 8... seconds
                logger.info(f"Waiting {wait_time} seconds before retry")
                time.sleep(wait_time)

                # Force refresh the API status check before retrying
                api_status_checker.check_groq_status(force_refresh=True)

                # Retry with incremented retry count
                return self.run_chain(query, device_id, files_info, retry_count + 1)

            # If we're not retrying or have exhausted retries, return an error message

            # Check if it's a timeout error
            if "timeout" in str(e).lower() or error_type == "TimeoutError":
                error_message = "The request took too long to process. This might be due to a complex query or temporary service issues."
            # Check if it's an API key error
            elif "api key" in str(e).lower() or "authentication" in str(e).lower():
                error_message = "There was an issue with the API authentication. Please check the API key configuration."
            # Check if it's a rate limit error
            elif "rate limit" in str(e).lower() or "too many requests" in str(e).lower():
                error_message = "The service is currently experiencing high demand. Please try again in a few moments."
            # Check if it's a connection error
            elif "connection" in str(e).lower() or "network" in str(e).lower():
                error_message = "There was a network connection issue. Please check your internet connection and try again."
            # Default error message
            else:
                error_message = "I'm sorry, I encountered an error while processing your request. Please try again."

            # Add a retry suggestion
            error_message += " If the problem persists, try simplifying your question or try again later."

            return {
                "content": error_message,
                "language": "en",
                "sources": [],
                "error": {
                    "type": error_type,
                    "message": str(e),
                    "retry_attempted": retry_count > 0
                }
            }
