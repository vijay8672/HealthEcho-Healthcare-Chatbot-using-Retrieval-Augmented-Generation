"""
Convert text to speech.
"""
import pyttsx3
from typing import Optional

from ..utils.logger import get_logger

logger = get_logger(__name__)

class TextToSpeech:
    """Convert text to speech using pyttsx3."""
    
    def __init__(self, rate: int = 175, volume: float = 1.0):
        """
        Initialize the text-to-speech converter.
        
        Args:
            rate: Speech rate (words per minute)
            volume: Volume (0.0 to 1.0)
        """
        self.rate = rate
        self.volume = volume
        self.engine = None  # Lazy initialization
    
    def _initialize_engine(self):
        """Initialize the TTS engine."""
        if self.engine is None:
            self.engine = pyttsx3.init()
            self.engine.setProperty('rate', self.rate)
            self.engine.setProperty('volume', self.volume)
            logger.info("TTS engine initialized")
    
    def speak(self, text: str) -> None:
        """
        Convert text to speech and play it.
        
        Args:
            text: Text to speak
        """
        if not text:
            logger.warning("Empty text provided to speak")
            return
        
        try:
            self._initialize_engine()
            
            logger.info(f"Speaking: {text[:50]}...")
            self.engine.say(text)
            self.engine.runAndWait()
            
        except Exception as e:
            logger.error(f"Error speaking text: {e}")
    
    def set_voice(self, voice_id: Optional[str] = None, gender: Optional[str] = None) -> bool:
        """
        Set the voice to use.
        
        Args:
            voice_id: ID of the voice to use
            gender: Gender of the voice ('male' or 'female')
            
        Returns:
            True if successful, False otherwise
        """
        try:
            self._initialize_engine()
            
            voices = self.engine.getProperty('voices')
            
            if not voices:
                logger.warning("No voices available")
                return False
            
            # Find voice by ID or gender
            if voice_id:
                for voice in voices:
                    if voice.id == voice_id:
                        self.engine.setProperty('voice', voice.id)
                        logger.info(f"Set voice to {voice.id}")
                        return True
            
            if gender:
                gender = gender.lower()
                for voice in voices:
                    # Check if gender is in the voice name or ID
                    voice_info = voice.id + voice.name
                    if (gender == 'male' and ('male' in voice_info.lower() or 'david' in voice_info.lower())) or \
                       (gender == 'female' and ('female' in voice_info.lower() or 'zira' in voice_info.lower())):
                        self.engine.setProperty('voice', voice.id)
                        logger.info(f"Set voice to {voice.id} ({gender})")
                        return True
            
            # If no matching voice found, use the first one
            self.engine.setProperty('voice', voices[0].id)
            logger.info(f"Set voice to {voices[0].id} (default)")
            return True
            
        except Exception as e:
            logger.error(f"Error setting voice: {e}")
            return False
