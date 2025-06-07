"""
Configuration settings for the Advanced RAG Chatbot.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Base directories
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
EMBEDDINGS_DIR = DATA_DIR / "embeddings"
PROCESSED_DIR = DATA_DIR / "processed"
RAW_DIR = DATA_DIR / "raw_files"
DB_DIR = DATA_DIR / "db"
MODELS_DIR = DATA_DIR / "models"
# src/config.py

# Add this if it's missing
FAISS_INDEX_PATH = "data/faiss_index/index.faiss"  # or wherever your index file should be


# Create directories if they don't exist
for directory in [DATA_DIR, EMBEDDINGS_DIR, PROCESSED_DIR, RAW_DIR, DB_DIR, MODELS_DIR]:
    directory.mkdir(exist_ok=True, parents=True)

# Database settings
DATABASE_PATH = DB_DIR / "chatbot.db"
# src/config.py

SIMILARITY_THRESHOLD = 0.6  # Already present
MAX_VECTOR_SEARCH_TOP_K = 20  # ← ADD THIS LINE


# Model settings
EMBEDDING_MODEL_NAME = "sentence-transformers/multi-qa-mpnet-base-dot-v1"
LLM_MODEL_NAME = os.getenv("GROQ_MODEL", "llama3-8b-8192")  # Using Groq's Llama 3 model

# Vector search settings
VECTOR_DIMENSION = 768  # Dimension of the embedding vectors
SIMILARITY_THRESHOLD = 0.45  # Minimum similarity score for retrieval
MAX_CONTEXT_DOCUMENTS = 5  # Maximum number of documents to include in context

# Conversation settings
MAX_HISTORY_MESSAGES = 10  # Maximum number of messages to keep in conversation history

# Speech settings
SPEECH_RECOGNITION_DURATION = 10  # Duration in seconds for speech recording
SPEECH_SAMPLE_RATE = 16000  # Sample rate for speech recording

# API Keys (load from environment variables)
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise ValueError("❌ GROQ_API_KEY is not set in the environment or .env file.")

# Log the loaded API key (safely masked)
print(f"✅ GROQ_API_KEY loaded: {GROQ_API_KEY[:5]}...***")

# Redis settings
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
REDIS_PASSWORD = None


# Add ENABLE_CACHE flag
ENABLE_CACHE = os.getenv("ENABLE_CACHE", "true").lower() == "true"

# ML Model settings
INTENT_CLASSIFIER_CONFIDENCE_THRESHOLD = 0.6
NER_CONFIDENCE_THRESHOLD = 0.7
MAX_EMBEDDING_CACHE_SIZE = 3000  # Maximum number of embeddings to cache

# Document versioning settings
MAX_DOCUMENT_VERSIONS = 5
DOCUMENT_BACKUP_DIR = DATA_DIR / "backups"
AUTO_REINDEX_ON_UPDATE = True

# UI settings
DEFAULT_THEME = "light"
AVAILABLE_THEMES = ["light", "dark", "blue", "green"]

# Email settings
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SENDER_EMAIL = os.getenv("SENDER_EMAIL", "")

# HR escalation settings
HR_EMAILS = os.getenv("HR_EMAILS", "").split(",") if os.getenv("HR_EMAILS") else []
ENABLE_EMAIL_ESCALATION = os.getenv("ENABLE_EMAIL_ESCALATION", "false").lower() == "true"
