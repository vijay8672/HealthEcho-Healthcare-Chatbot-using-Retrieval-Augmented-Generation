## chatbot.py


import time  # Import time module
from src.chain.chain_builder import conversation_chain
from src.conversation.save_conversation import (
    save_conversation_history,
)  # Importing the save function
from logging_module.logger import logger
from langdetect import detect, LangDetectException  # Importing langdetect


def detect_language(text: str) -> str:
    """Detect the language of the input text."""
    try:
        # Detect the language of the input text
        language = detect(text)
        logger.info(f"Detected language: {language}")
        return language
    except LangDetectException:
        # Default to English if language detection fails
        logger.warning("Language detection failed. Defaulting to English.")
        return "en"


def process_query(query: str, device_id: str) -> str:
    """Process a single query and return the response."""
    try:
        # Detect the language of the query
        language = detect_language(query)

        # Record start time
        query_start_time = time.time()

        # Process the query using the conversation chain
        response = conversation_chain(query, device_id)

        # Record end time after response is generated
        response_end_time = time.time()

        # Extract the content from the AIMessage object
        response_content = (
            response.content if hasattr(response, "content") else str(response)
        )

        # Save the conversation history with timestamps for response time calculation
        save_conversation_history(
            user_query=query,
            assistant_response=response_content,  # Use extracted text content
            language=language,  # Save the detected language
            device_id=device_id,
            query_start_time=query_start_time,  # Start time
            response_end_time=response_end_time,  # End time
        )

        return response_content

    except Exception as e:
        logger.error(f"Error during conversation: {e}")
        return "An error occurred. Please try again."


if __name__ == "__main__":
    query = input("Enter your query: ")
    device_id = "dummy_device_123"
    response = process_query(query, device_id)
    print("Response:", response)
