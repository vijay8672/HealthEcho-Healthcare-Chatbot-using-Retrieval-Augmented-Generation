"""
Convert speech to text.
"""
import numpy as np
import whisper
import sounddevice as sd
from typing import Dict, Any, Optional

from ..utils.logger import get_logger
from ..config import SPEECH_RECOGNITION_DURATION, SPEECH_SAMPLE_RATE

logger = get_logger(__name__)

class SpeechToText:
    """Convert speech to text using Whisper."""
    
    def __init__(self, model_size: str = "small"):
        """
        Initialize the speech-to-text converter.
        
        Args:
            model_size: Size of the Whisper model to use
        """
        self.model_size = model_size
        self.model = None  # Lazy loading
    
    def _load_model(self):
        """Load the Whisper model."""
        if self.model is None:
            logger.info(f"Loading Whisper model: {self.model_size}")
            self.model = whisper.load_model(self.model_size)
            logger.info("Whisper model loaded")
    
    def record_audio(self, 
                    duration: int = SPEECH_RECOGNITION_DURATION, 
                    samplerate: int = SPEECH_SAMPLE_RATE) -> np.ndarray:
        """
        Record audio from the microphone.
        
        Args:
            duration: Duration of recording in seconds
            samplerate: Sample rate in Hz
            
        Returns:
            NumPy array of audio data
        """
        logger.info(f"Recording audio for {duration} seconds")
        
        # Record audio
        recording = sd.rec(
            int(duration * samplerate),
            samplerate=samplerate,
            channels=1,
            dtype=np.float32
        )
        sd.wait()  # Wait for recording to complete
        
        # Remove extra dimension
        audio_data = np.squeeze(recording)
        
        logger.info(f"Recorded {len(audio_data) / samplerate:.2f} seconds of audio")
        return audio_data
    
    def transcribe(self, audio_data: Optional[np.ndarray] = None) -> Dict[str, Any]:
        """
        Transcribe audio to text.
        
        Args:
            audio_data: Audio data as NumPy array (if None, will record)
            
        Returns:
            Dictionary with transcription result
        """
        self._load_model()
        
        try:
            # Record audio if not provided
            if audio_data is None:
                audio_data = self.record_audio()
            
            # Transcribe audio
            result = self.model.transcribe(audio_data)
            
            logger.info(f"Transcribed: {result['text'][:50]}...")
            return result
            
        except Exception as e:
            logger.error(f"Error transcribing audio: {e}")
            return {"text": "", "error": str(e)}
    
    def recognize_speech(self) -> str:
        """
        Record and transcribe speech.
        
        Returns:
            Transcribed text
        """
        print("Listening... Speak now!")
        
        try:
            # Record and transcribe
            result = self.transcribe()
            
            # Extract text
            text = result.get("text", "").strip()
            
            if text:
                print(f"You said: {text}")
            else:
                print("No speech detected")
            
            return text
            
        except Exception as e:
            logger.error(f"Error recognizing speech: {e}")
            print("Error recognizing speech. Please try again.")
            return ""
