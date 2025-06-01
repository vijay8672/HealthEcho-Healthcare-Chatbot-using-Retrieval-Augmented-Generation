"""
Environment setup verification script.
This script checks if all required environment variables are properly set.
"""
import os
from dotenv import load_dotenv
from pathlib import Path

def mask_key(key: str) -> str:
    """Mask an API key for safe display."""
    if not key or len(key) < 8:
        return "***"
    return key[:5] + "..." + key[-3:]

def check_environment():
    """Check environment variables and print their status."""
    # Load environment variables from .env file
    load_dotenv()
    
    print("\n🔍 Environment Setup Check")
    print("=" * 50)
    
    # Check GROQ_API_KEY
    groq_key = os.getenv("GROQ_API_KEY")
    if groq_key:
        print(f"✅ GROQ_API_KEY: {mask_key(groq_key)}")
    else:
        print("❌ GROQ_API_KEY: Not set")
    
    # Check GROQ_MODEL
    groq_model = os.getenv("GROQ_MODEL")
    if groq_model:
        print(f"✅ GROQ_MODEL: {groq_model}")
    else:
        print("ℹ️ GROQ_MODEL: Using default (llama3-8b-8192)")
    
    # Check other important environment variables
    env_vars = {
        "SMTP_SERVER": "Email server",
        "SMTP_PORT": "Email port",
        "SMTP_USERNAME": "Email username",
        "SMTP_PASSWORD": "Email password",
        "SENDER_EMAIL": "Sender email",
        "HR_EMAILS": "HR email addresses",
        "ENABLE_EMAIL_ESCALATION": "Email escalation"
    }
    
    print("\n📧 Email Configuration")
    print("-" * 50)
    for var, description in env_vars.items():
        value = os.getenv(var)
        if value:
            if var in ["SMTP_PASSWORD"]:
                print(f"✅ {description}: {mask_key(value)}")
            else:
                print(f"✅ {description}: {value}")
        else:
            print(f"ℹ️ {description}: Not set")
    
    # Check data directories
    print("\n📁 Data Directories")
    print("-" * 50)
    base_dir = Path(__file__).resolve().parent
    data_dirs = [
        base_dir / "data",
        base_dir / "data" / "embeddings",
        base_dir / "data" / "processed",
        base_dir / "data" / "raw",
        base_dir / "data" / "db",
        base_dir / "data" / "models"
    ]
    
    for directory in data_dirs:
        if directory.exists():
            print(f"✅ {directory.name}: Exists")
        else:
            print(f"ℹ️ {directory.name}: Not created yet (will be created on first run)")

if __name__ == "__main__":
    check_environment() 