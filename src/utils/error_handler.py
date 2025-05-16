"""
Error handling utilities.
"""
import traceback
from typing import Dict, Any, Callable, TypeVar, Optional

from .logger import get_logger

logger = get_logger(__name__)

# Type variables for generic functions
T = TypeVar('T')
R = TypeVar('R')

def safe_execute(func: Callable[..., R], 
                default_return: Optional[R] = None, 
                error_message: str = "Error executing function", 
                log_traceback: bool = True, 
                **kwargs) -> R:
    """
    Safely execute a function and handle exceptions.
    
    Args:
        func: Function to execute
        default_return: Default return value if function fails
        error_message: Message to log on error
        log_traceback: Whether to log the traceback
        **kwargs: Arguments to pass to the function
        
    Returns:
        Function result or default return value
    """
    try:
        return func(**kwargs)
    except Exception as e:
        if log_traceback:
            logger.error(f"{error_message}: {e}\n{traceback.format_exc()}")
        else:
            logger.error(f"{error_message}: {e}")
        return default_return

class ErrorResponse:
    """Standard error response format."""
    
    @staticmethod
    def create(message: str, 
              code: str = "error", 
              details: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Create a standardized error response.
        
        Args:
            message: Error message
            code: Error code
            details: Additional error details
            
        Returns:
            Error response dictionary
        """
        return {
            "success": False,
            "error": {
                "code": code,
                "message": message,
                "details": details or {}
            }
        }
    
    @staticmethod
    def from_exception(exception: Exception, 
                      code: str = "error", 
                      include_traceback: bool = False) -> Dict[str, Any]:
        """
        Create an error response from an exception.
        
        Args:
            exception: Exception instance
            code: Error code
            include_traceback: Whether to include the traceback
            
        Returns:
            Error response dictionary
        """
        details = {}
        
        if include_traceback:
            details["traceback"] = traceback.format_exc()
        
        return ErrorResponse.create(
            message=str(exception),
            code=code,
            details=details
        )
