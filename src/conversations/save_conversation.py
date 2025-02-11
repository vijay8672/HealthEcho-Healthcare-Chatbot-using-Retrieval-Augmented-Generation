## save_conversation.py


import os
import uuid
import datetime
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

try:
    db = firestore.Client()
except Exception as e:
    logger.error(f"Firestore Client Initialization Error: {e}")
    raise  # Raising instead of exit(1) for better error handling

def generate_session_id():
    """Generate a unique session ID."""
    return str(uuid.uuid4())

def save_conversation_history(user_query, assistant_response, language, session_id=None):
    try:
        session_id = session_id or generate_session_id()
        conversation_ref = db.collection("conversations").document(session_id)

        # Generate timestamp manually
        timestamp = datetime.datetime.utcnow()

        # Create message object
        message_data = {
            "user_query": user_query,
            "assistant_response": assistant_response,
            "language": language,
            "timestamp": timestamp  # Use a Python datetime object
        }

        # Append the message to the existing array using ArrayUnion
        conversation_ref.set({
            "messages": firestore.ArrayUnion([message_data])  # Ensures messages are stored in an array
        }, merge=True)  # merge=True prevents overwriting the existing document

        logger.info(f"Conversation saved (Session ID: {session_id}, Language: {language})")

    except Exception as e:
        logger.error(f"Error saving to Firestore: {e}")

if __name__ == "__main__":
    test_session_id = generate_session_id()
    save_conversation_history("what is dengue", "dengue is a viral fever", "English", test_session_id)
    save_conversation_history("quelles sont les symptômes", "fièvre, mal de tête, etc.", "French", test_session_id)
