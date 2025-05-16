"""
Manage conversation history.
"""
from typing import List, Dict, Any
import time

from ..utils.logger import get_logger
from ..database.conversation_store import ConversationStore
from ..config import MAX_HISTORY_MESSAGES

logger = get_logger(__name__)

class HistoryManager:
    """Manage conversation history."""

    def __init__(self, conversation_store: ConversationStore = None):
        """
        Initialize the history manager.

        Args:
            conversation_store: Store for conversation data
        """
        self.conversation_store = conversation_store or ConversationStore()
        self._session_history = {}  # In-memory cache for current session

    def add_interaction(self,
                       user_query: str,
                       assistant_response: str,
                       language: str,
                       device_id: str,
                       sources: List[Dict[str, Any]] = None,
                       files_info: List[Dict[str, Any]] = None) -> None:
        """
        Add an interaction to the conversation history.

        Args:
            user_query: User query
            assistant_response: Assistant response
            language: Detected language
            device_id: Device ID
            sources: List of sources used in the response
            files_info: List of files attached to the message
        """
        query_start_time = time.time() - 1  # Approximate start time (1 second ago)
        response_end_time = time.time()

        # Save to database
        self.conversation_store.save_conversation(
            user_query=user_query,
            assistant_response=assistant_response,
            language=language,
            device_id=device_id,
            query_start_time=query_start_time,
            response_end_time=response_end_time
        )

        # Update in-memory cache
        if device_id not in self._session_history:
            self._session_history[device_id] = []

        self._session_history[device_id].append({
            "user_query": user_query,
            "assistant_response": assistant_response,
            "language": language,
            "timestamp": response_end_time,
            "sources": sources or [],
            "files_info": files_info or []
        })

        # Limit the size of the in-memory cache
        if len(self._session_history[device_id]) > MAX_HISTORY_MESSAGES:
            self._session_history[device_id] = self._session_history[device_id][-MAX_HISTORY_MESSAGES:]

        logger.info(f"Added interaction to history for device {device_id}")

    def get_history(self, device_id: str) -> List[Dict[str, Any]]:
        """
        Get conversation history for a device.

        Args:
            device_id: Device ID

        Returns:
            List of conversation entries
        """
        # Check in-memory cache first
        if device_id in self._session_history and self._session_history[device_id]:
            logger.info(f"Retrieved {len(self._session_history[device_id])} messages from session history")
            return self._session_history[device_id]

        # Fall back to database
        history = self.conversation_store.get_conversation_history(device_id, MAX_HISTORY_MESSAGES)

        # Update in-memory cache
        self._session_history[device_id] = history

        logger.info(f"Retrieved {len(history)} messages from database")
        return history

    def clear_history(self, device_id: str) -> None:
        """
        Clear conversation history for a device.

        Args:
            device_id: Device ID
        """
        # Clear in-memory cache
        if device_id in self._session_history:
            self._session_history[device_id] = []

        logger.info(f"Cleared history for device {device_id}")

        # Note: We don't delete from the database, just clear the in-memory cache
