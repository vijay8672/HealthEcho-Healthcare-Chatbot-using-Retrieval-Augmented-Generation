# chatbot.py

import os
from google.cloud import firestore
from dotenv import load_dotenv
from langchain_text_splitters import Language
from src.chain.chain_builder import conversation_chain
from logging_module.logger import logger
from src.conversations.save_conversation import save_conversation_history
from src.conversations.fetch_conversation import get_all_conversations
from langdetect import detect
import uuid

load_dotenv()

os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = os.getenv("GOOGLE_SETUP_CREDENTIALS")
db = firestore.Client()


def chatbot(query: str, session_id: str) -> str:
    try:
        logger.info(f"Chatbot request for session {session_id}: {query}")
        
        language = detect(query)
        logger.info(f"Detected language: {language}")

        # Fetch conversation history from Firestore
        conversation_history = get_all_conversations(session_id)
        if not conversation_history:
            conversation_history = []  # Ensure it's a list

        # Generate the assistant response using history from Firestore
        assistant_response = conversation_chain(query, session_id)
        logger.info(f"Chatbot response for session {session_id}: {assistant_response}")

        # Save conversation history to Firestore
        save_conversation_history(query, str(assistant_response.content), language=language,session_id=session_id)

        return assistant_response

    except Exception as e:
        logger.error(f"Error in chatbot function: {e}")
        return "An error occurred while processing your request."

if __name__ == "__main__":
    while True:
        user_query = input("Enter your question (or type 'exit'): ")
        if user_query.lower() == "exit":
            break

        session_id = str(uuid.uuid4())  # Use a fixed session ID in production
        response = chatbot(user_query, session_id)
        print(f"Chatbot: {response}")