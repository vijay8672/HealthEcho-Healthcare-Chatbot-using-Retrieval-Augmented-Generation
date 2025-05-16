"""
Conversation storage and retrieval functionality.
"""
import time
from typing import List, Dict, Any

from ..utils.logger import get_logger
from .models import ConversationModel
from ..config import MAX_HISTORY_MESSAGES

logger = get_logger(__name__)

class ConversationStore:
    """Manages conversation storage and retrieval."""
    
    def __init__(self):
        """Initialize the conversation store."""
        self.model = ConversationModel()
        self._cache = {}  # Simple in-memory cache for frequent requests
    
    def save_conversation(self, user_query: str, assistant_response: str, 
                         language: str, device_id: str, 
                         query_start_time: float = None, 
                         response_end_time: float = None) -> int:
        """
        Save a conversation entry to the database.
        
        Args:
            user_query: The user's query
            assistant_response: The assistant's response
            language: The detected language code
            device_id: Unique identifier for the user/device
            query_start_time: Timestamp when query was received (defaults to current time)
            response_end_time: Timestamp when response was generated (defaults to current time)
            
        Returns:
            The ID of the saved conversation entry
        """
        # Use current time if timestamps not provided
        if query_start_time is None:
            query_start_time = time.time()
        if response_end_time is None:
            response_end_time = time.time()
        
        try:
            conversation_id = self.model.save_conversation(
                device_id=device_id,
                user_query=user_query,
                assistant_response=assistant_response,
                language=language,
                query_timestamp=query_start_time,
                response_timestamp=response_end_time
            )
            
            # Invalidate cache for this device
            if device_id in self._cache:
                del self._cache[device_id]
                
            logger.info(f"Saved conversation for device {device_id} with ID {conversation_id}")
            return conversation_id
            
        except Exception as e:
            logger.error(f"Error saving conversation: {e}")
            return None
    
    def get_conversation_history(self, device_id: str, limit: int = MAX_HISTORY_MESSAGES) -> List[Dict[str, Any]]:
        """
        Get conversation history for a device.
        
        Args:
            device_id: Unique identifier for the user/device
            limit: Maximum number of messages to retrieve
            
        Returns:
            List of conversation entries
        """
        # Check cache first
        cache_key = f"{device_id}_{limit}"
        if cache_key in self._cache:
            return self._cache[cache_key]
        
        try:
            conversations = self.model.get_conversations(device_id, limit)
            
            # Format the conversations for easier consumption
            formatted_conversations = []
            for conv in conversations:
                formatted_conversations.append({
                    "user_query": conv["user_query"],
                    "assistant_response": conv["assistant_response"],
                    "language": conv["language"],
                    "timestamp": conv["query_timestamp"]
                })
            
            # Update cache
            self._cache[cache_key] = formatted_conversations
            
            logger.info(f"Retrieved {len(formatted_conversations)} conversations for device {device_id}")
            return formatted_conversations
            
        except Exception as e:
            logger.error(f"Error retrieving conversation history: {e}")
            return []
