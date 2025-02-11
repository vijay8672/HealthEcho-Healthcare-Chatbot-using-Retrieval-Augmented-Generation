# conversation.py
import os
from google.cloud import firestore
from dotenv import load_dotenv
from logging_module.logger import logger

load_dotenv()
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = os.getenv("GOOGLE_SETUP_CREDENTIALS")

def get_all_conversations():
    try:
        db = firestore.Client()
        collection = db.collection('conversations')
        
        # Retrieve all documents from the collection
        documents = collection.stream()

        all_conversations = []
        for doc in documents:
            data = doc.to_dict()
            print(f"Document Data: {data}")  # Debugging print
            # Retrieve messages from each document
            messages = data.get('messages', [])
            all_conversations.append(messages)

        return all_conversations

    except Exception as e:
        logger.error(f"An error occurred while retrieving all conversation history: {e}")
        return None

if __name__ == "__main__":
    # Retrieve all conversations from all sessions
    all_conversations = get_all_conversations()
    print(all_conversations)
