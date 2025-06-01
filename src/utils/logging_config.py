"""
Logging configuration for the application.
Handles UTF-8 encoding and prevents duplicate logs in development.
"""
import logging
import sys
from pathlib import Path

def configure_logging(debug: bool = False) -> None:
    """
    Configure logging for the application.
    
    Args:
        debug: Whether to run in debug mode
    """
    # Create logs directory if it doesn't exist
    log_dir = Path(__file__).resolve().parent.parent.parent / "logs"
    log_dir.mkdir(exist_ok=True)
    
    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.DEBUG if debug else logging.INFO)
    
    # Remove any existing handlers to prevent duplicate logs
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)
    
    # Create console handler with UTF-8 encoding
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.DEBUG if debug else logging.INFO)
    
    # Create file handler for persistent logs
    file_handler = logging.FileHandler(
        log_dir / "app.log",
        encoding='utf-8',
        mode='a'
    )
    file_handler.setLevel(logging.DEBUG)
    
    # Create formatters
    console_formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    file_formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    # Set formatters
    console_handler.setFormatter(console_formatter)
    file_handler.setFormatter(file_formatter)
    
    # Add handlers to root logger
    root_logger.addHandler(console_handler)
    root_logger.addHandler(file_handler)
    
    # Prevent duplicate logs from Flask
    logging.getLogger('werkzeug').setLevel(logging.WARNING)
    
    # Log initial configuration
    root_logger.info("Logging configured successfully")
    if debug:
        root_logger.debug("Debug mode enabled") 