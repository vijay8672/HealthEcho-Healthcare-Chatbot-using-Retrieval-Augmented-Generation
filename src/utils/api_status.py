"""
Utility for checking API service status.
"""
import time
import requests
from typing import Dict, Any, Optional
import threading
from ..utils.logger import get_logger

logger = get_logger(__name__)

class APIStatusChecker:
    """Check and monitor API service status."""
    
    def __init__(self):
        """Initialize the API status checker."""
        self.status_cache = {}
        self.cache_expiry = {}
        self.cache_duration = 300  # Cache status for 5 minutes
        self._lock = threading.Lock()
        
    def check_groq_status(self, force_refresh: bool = False) -> Dict[str, Any]:
        """
        Check Groq API status.
        
        Args:
            force_refresh: Force a refresh of the cached status
            
        Returns:
            Dictionary with status information
        """
        service_name = "groq"
        
        # Return cached status if available and not expired
        if not force_refresh and service_name in self.status_cache:
            if time.time() < self.cache_expiry.get(service_name, 0):
                return self.status_cache[service_name]
        
        # Default status
        status = {
            "operational": True,
            "message": "Service appears to be operational",
            "last_checked": time.time()
        }
        
        try:
            # Make a simple request to the Groq API to check status
            # This is a lightweight request that doesn't consume tokens
            response = requests.get(
                "https://api.groq.com/v1/health",
                timeout=5
            )
            
            if response.status_code == 200:
                status["operational"] = True
                status["message"] = "Groq API is operational"
            else:
                status["operational"] = False
                status["message"] = f"Groq API returned status code {response.status_code}"
                status["status_code"] = response.status_code
                
        except requests.RequestException as e:
            status["operational"] = False
            status["message"] = f"Error connecting to Groq API: {str(e)}"
            logger.warning(f"Groq API status check failed: {e}")
        
        # Update cache with thread safety
        with self._lock:
            self.status_cache[service_name] = status
            self.cache_expiry[service_name] = time.time() + self.cache_duration
        
        return status
    
    def is_groq_operational(self) -> bool:
        """
        Check if Groq API is operational.
        
        Returns:
            True if operational, False otherwise
        """
        status = self.check_groq_status()
        return status.get("operational", False)

# Singleton instance
api_status_checker = APIStatusChecker()
