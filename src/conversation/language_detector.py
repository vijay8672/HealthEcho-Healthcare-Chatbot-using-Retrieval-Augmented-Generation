"""
Detect language of user input.
"""
from langdetect import detect as langdetect_detect, LangDetectException

from ..utils.logger import get_logger

logger = get_logger(__name__)

def detect_language(text: str) -> str:
    """
    Detect the language of the input text.
    
    Args:
        text: Input text
        
    Returns:
        Language code (e.g., 'en', 'es', 'fr')
    """
    try:
        language = langdetect_detect(text)
        logger.info(f"Detected language: {language}")
        return language
    except LangDetectException:
        logger.warning("Language detection failed. Defaulting to English.")
        return "en"
