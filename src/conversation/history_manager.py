from typing import List, Dict, Any, Optional
import time
import threading

from ..utils.logger import get_logger
from ..database.conversation_store import ConversationStore
from ..config import MAX_HISTORY_MESSAGES

logger = get_logger(__name__)


class HistoryManager:
    """Manages conversation history with thread-safe in-memory caching and persistent storage."""

    def __init__(self, conversation_store: Optional[ConversationStore] = None):
        """
        Initialize the HistoryManager.

        Args:
            conversation_store (Optional[ConversationStore]): Optional store for persisting conversation history.
        """
        self.conversation_store = conversation_store or ConversationStore()
        self._session_history: Dict[str, List[Dict[str, Any]]] = {}
        self._lock = threading.Lock()

    def add_interaction(
        self,
        user_query: str,
        assistant_response: str,
        language: str,
        device_id: str,
        sources: Optional[List[Dict[str, Any]]] = None,
        files_info: Optional[List[Dict[str, Any]]] = None,
    ) -> None:
        """
        Add an interaction to the conversation history.

        Args:
            user_query (str): The user query.
            assistant_response (str): The assistant response.
            language (str): Detected language code.
            device_id (str): Device/session identifier.
            sources (Optional[List[Dict[str, Any]]]): Sources used for the response.
            files_info (Optional[List[Dict[str, Any]]]): Metadata about any attached files.
        """
        timestamp = time.time()
        query_start_time = timestamp - 1  # Estimate query start time

        try:
            self.conversation_store.save_conversation(
                user_query=user_query,
                assistant_response=assistant_response,
                language=language,
                device_id=device_id,
                query_start_time=query_start_time,
                response_end_time=timestamp,
            )
        except Exception as e:
            logger.error(f"[ERROR] Failed to persist conversation for device {device_id}: {e}")

        entry = {
            "user_query": user_query,
            "assistant_response": assistant_response,
            "language": language,
            "timestamp": timestamp,
            "sources": sources or [],
            "files_info": files_info or [],
        }

        with self._lock:
            history = self._session_history.setdefault(device_id, [])
            history.append(entry)
            if len(history) > MAX_HISTORY_MESSAGES:
                self._session_history[device_id] = history[-MAX_HISTORY_MESSAGES:]

        logger.info(f"[INFO] Interaction added to in-memory history for device {device_id}.")

    def get_history(self, device_id: str) -> List[Dict[str, Any]]:
        """
        Retrieve conversation history for a device.

        Args:
            device_id (str): The device/session identifier.

        Returns:
            List[Dict[str, Any]]: A list of conversation entries.
        """
        with self._lock:
            if device_id in self._session_history and self._session_history[device_id]:
                logger.info(f"[INFO] In-memory history found for device {device_id}.")
                return self._session_history[device_id]

        try:
            history = self.conversation_store.get_conversation_history(device_id, MAX_HISTORY_MESSAGES)
            with self._lock:
                self._session_history[device_id] = history
            logger.info(f"[INFO] Retrieved {len(history)} entries from persistent store for device {device_id}.")
            return history
        except Exception as e:
            logger.error(f"[ERROR] Failed to retrieve history for device {device_id}: {e}")
            return []

    def get_chat_messages(self, chat_id: str, page: int = 1, page_size: int = 20) -> List[Dict[str, Any]]:
        """
        Retrieve paginated chat messages by chat ID.

        Args:
            chat_id (str): Unique chat identifier.
            page (int): Page number (1-indexed).
            page_size (int): Number of messages per page.

        Returns:
            List[Dict[str, Any]]: Messages for the requested page.
        """
        try:
            offset = max(0, (page - 1) * page_size)
            messages = self.conversation_store.get_chat_messages(chat_id, offset, page_size)
            logger.info(f"[INFO] Retrieved {len(messages)} messages for chat {chat_id}, page {page}.")
            return messages
        except Exception as e:
            logger.error(f"[ERROR] Failed to fetch chat messages for chat {chat_id}: {e}")
            return []

    def get_chat_message_count(self, chat_id: str) -> int:
        """
        Get the total number of messages in a chat.

        Args:
            chat_id (str): Unique chat identifier.

        Returns:
            int: Total message count.
        """
        try:
            count = self.conversation_store.model.get_chat_message_count(chat_id)
            logger.info(f"[INFO] Total message count for chat {chat_id}: {count}.")
            return count
        except Exception as e:
            logger.error(f"[ERROR] Failed to retrieve message count for chat {chat_id}: {e}")
            return 0

    def clear_history(self, device_id: str) -> None:
        """
        Clear in-memory history for a device.

        Args:
            device_id (str): The device/session identifier.
        """
        with self._lock:
            self._session_history[device_id] = []
        logger.info(f"[INFO] Cleared in-memory history for device {device_id}.")
