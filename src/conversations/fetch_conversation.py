# fetch_conversation.py

import os
from google.cloud import firestore
from dotenv import load_dotenv
from logging_module.logger import logger

load_dotenv()
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = os.getenv("GOOGLE_SETUP_CREDENTIALS")

def get_all_conversations(session_id: str):
    try:
        db = firestore.Client()
        collection = db.collection('conversations')

        # Query the conversation based on the session_id
        document_ref = collection.document(session_id)  # Directly use the session_id to retrieve the conversation document
        document = document_ref.get()  # Get the document data

        if document.exists:
            data = document.to_dict()
            print(f"Document Data: {data}")  # Debugging print
            # Return the conversation messages
            return data.get('messages', [])
        else:
            logger.info(f"No conversation found for session ID: {session_id}")
            return None

    except Exception as e:
        logger.error(f"An error occurred while retrieving conversation history: {e}")
        return None

if __name__ == "__main__":
    # Test with a sample session_id
    session_id = "1fde9dff-88c1-442d-a3d6-bb5b6bf7653a"  # Replace with an actual session ID to test
    all_conversations = get_all_conversations(session_id)
    print(all_conversations)
