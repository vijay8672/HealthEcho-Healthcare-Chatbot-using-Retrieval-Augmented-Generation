"""
Detect language of user input with robust error handling and logging.
"""

from langdetect import detect as langdetect_detect, DetectorFactory, LangDetectException
from typing import Optional

from ..utils.logger import get_logger

logger = get_logger(__name__)

# Ensures consistent results across runs
DetectorFactory.seed = 42


def detect_language(text: str, default: str = "en") -> str:
    """
    Detect the language of the input text using langdetect.

    Args:
        text (str): Input text.
        default (str): Default fallback language code if detection fails.

    Returns:
        str: Detected language code (e.g., 'en', 'es', 'fr').
    """
    if not text or not text.strip():
        logger.warning("Empty or whitespace-only input provided. Defaulting to %s.", default)
        return default

    try:
        language: Optional[str] = langdetect_detect(text)
        if not language:
            logger.warning("Language detection returned None. Defaulting to %s.", default)
            return default

        logger.info("Detected language: %s", language)
        return language

    except LangDetectException as e:
        logger.warning("Language detection failed: %s. Defaulting to %s.", str(e), default)
        return default

    except Exception as e:
        logger.error("Unexpected error in detect_language: %s. Defaulting to %s.", str(e), default)
        return default
