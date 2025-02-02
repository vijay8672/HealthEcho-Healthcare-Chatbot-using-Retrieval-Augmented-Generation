# conversation.py
from langchain_core.chat_history import BaseChatMessageHistory
from langchain_community.chat_message_histories import ChatMessageHistory
from langchain_core.runnables.history import RunnableWithMessageHistory

# In‑memory store for conversation histories
history_store = {}

def get_session_history(session_id: str) -> BaseChatMessageHistory:
    """
    Returns the conversation history for a given session.
    Creates a new history if none exists for that session.
    """
    if session_id not in history_store:
        history_store[session_id] = ChatMessageHistory()
    return history_store[session_id]
