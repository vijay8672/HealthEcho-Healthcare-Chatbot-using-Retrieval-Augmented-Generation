import os
import datetime
import time  # Import time module
from google.cloud import firestore
from dotenv import load_dotenv
from logging_module.logger import logger
import re

# Load environment variables
load_dotenv()

# Set Google Cloud credentials
# Set the relative path to the JSON file within the project directory
credentials_path = os.path.abspath(
    os.path.join(
        os.path.dirname(__file__), "..", "..", "healthecho-chatbot-2b245fc7609a.json"
    )
)

# Check if the file exists
if not os.path.isfile(credentials_path):
    raise FileNotFoundError("Service account key file not found at the specified path.")

# Set the GOOGLE_APPLICATION_CREDENTIALS environment variable
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = credentials_path

# Initialize Firestore client
try:
    db = firestore.Client()
except Exception as e:
    logger.error(f"Firestore Client Initialization Error: {e}")
    raise  # Raising instead of exit(1) for better error handling


def save_conversation_history(
    user_query,
    assistant_response,
    language,
    device_id,
    query_start_time,
    response_end_time,
):
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

        # Initialize Firestore client (safer in multi-threaded scenarios)
        db = firestore.Client()
        conversation_ref = db.collection("conversations").document(device_id)

        # Clean the assistant's response text
        assistant_response = re.sub(r"<[^>]*>", "", assistant_response)

        # Calculate model response time in seconds
        response_time = round(response_end_time - query_start_time, 3)

        # Create message object with detailed timestamp information
        message_data = {
            "user_query": user_query,
            "language": language,
            "query_timestamp": datetime.datetime.utcfromtimestamp(query_start_time),
            "assistant_response": assistant_response,
            "response_timestamp": datetime.datetime.utcfromtimestamp(response_end_time),
            "response_time_seconds": response_time,
        }

        # Append the message to the existing array using ArrayUnion
        conversation_ref.set(
            {"messages": firestore.ArrayUnion([message_data])}, merge=True
        )

        logger.info(
            f"Conversation saved (Device ID: {device_id}, Response Time: {response_time} seconds)"
        )

    except Exception as e:
        logger.error(f"Error saving to Firestore: {e}")


# Test example
if __name__ == "__main__":
    test_device_id = (
        "test-device-12345"  # Example device ID (Replace with actual frontend value)
    )
    start_time = time.time()
    time.sleep(1)  # Simulate processing delay
    end_time = time.time()
    save_conversation_history(
        "What is AI?",
        "AI stands for Artificial Intelligence.",
        "en",
        test_device_id,
        start_time,
        end_time,
    )
