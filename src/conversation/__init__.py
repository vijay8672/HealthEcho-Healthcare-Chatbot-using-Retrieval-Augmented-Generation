"""
Conversation package initialization.
"""
from .language_detector import detect_language
from .history_manager import HistoryManager

__all__ = [
    'detect_language',
    'HistoryManager'
]
