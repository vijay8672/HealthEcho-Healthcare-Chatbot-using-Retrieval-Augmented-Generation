import os
import datetime
import time  # Import time module
from google.cloud import firestore
from dotenv import load_dotenv
from logging_module.logger import logger

# Load environment variables
load_dotenv()

# Set Google Cloud credentials
credentials_path = os.getenv("GOOGLE_SETUP_CREDENTIALS")
if not credentials_path:
    raise ValueError("GOOGLE_SETUP_CREDENTIALS environment variable not set.")
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = credentials_path

# Initialize Firestore client
try:
    db = firestore.Client()
except Exception as e:
    logger.error(f"Firestore Client Initialization Error: {e}")
    raise  # Raising instead of exit(1) for better error handling

def save_conversation_history(user_query, assistant_response, language, device_id, query_start_time, response_end_time):
    """
    Saves a conversation entry to Firestore using the user's device ID as the document ID.
    Also calculates the model response time.

    Parameters:
        user_query (str): The user's query.
        assistant_response (str): The assistant's response.
        language (str): The language of the conversation.
        device_id (str): Unique device identifier for the user.
        query_start_time (float): Timestamp when the query was received.
        response_end_time (float): Timestamp when the response was generated.
    """
    try:
        if not device_id:
            raise ValueError("Device ID is required but not provided.")

        conversation_ref = db.collection("conversations").document(device_id)

        # Calculate model response time in seconds
        response_time = round(response_end_time - query_start_time, 3)

        # Capture timestamps
        query_timestamp = datetime.datetime.utcfromtimestamp(query_start_time)
        response_timestamp = datetime.datetime.utcfromtimestamp(response_end_time)

        # Create message object with detailed timestamp information
        message_data = {
            "user_query": user_query,
            "language": language,
            "query_timestamp": query_timestamp,
            "assistant_response": assistant_response,
            "response_timestamp": response_timestamp,
            "response_time_seconds": response_time  # Response time in seconds
        }

        # Append the message to the existing array using ArrayUnion
        conversation_ref.set({
            "messages": firestore.ArrayUnion([message_data])  # Ensures messages are stored in an array
        }, merge=True)  # merge=True prevents overwriting the existing document

        logger.info(f"Conversation saved (Device ID: {device_id}, Response Time: {response_time} seconds)")

    except Exception as e:
        logger.error(f"Error saving to Firestore: {e}")

# Test example
if __name__ == "__main__":
    test_device_id = "test-device-12345"  # Example device ID (Replace with actual frontend value)
    start_time = time.time()
    time.sleep(1)  # Simulate processing delay
    end_time = time.time()
    save_conversation_history("What is AI?", "AI stands for Artificial Intelligence.", "en", test_device_id, start_time, end_time)
