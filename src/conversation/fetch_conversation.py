## fetch_conversation.py


import os
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

# Initialize Firestore Client once (better performance)
try:
    db = firestore.Client()
except Exception as e:
    logger.error(f"Firestore Client Initialization Error: {e}")
    raise  # Raising instead of exit(1) for better error handling

def fetch_conversations(device_id: str):
    """
    Fetches conversation history for a given device ID.

    Parameters:
        device_id (str): Unique device identifier.

    Returns:
        list: List of conversation messages, or an empty list if no messages exist.
    """
    try:
        if not device_id:
            raise ValueError("Device ID is required but not provided.")

        collection = db.collection('conversations')
        document_ref = collection.document(device_id)
        document = document_ref.get()

        if document.exists:
            data = document.to_dict()
            messages = data.get('messages', [])
            logger.info(f"Retrieved {len(messages)} messages for Device ID: {device_id}")
            return messages
        else:
            logger.info(f"No conversation found for Device ID: {device_id}")
            return []  # Return empty list instead of None

    except Exception as e:
        logger.error(f"An error occurred while retrieving conversation history: {e}")
        return []  # Return empty list on failure

# Test
if __name__ == "__main__":
    test_device_id = "test-device-12345"  # Replace with an actual device ID
    all_conversations = fetch_conversations(test_device_id)
    print(all_conversations)
