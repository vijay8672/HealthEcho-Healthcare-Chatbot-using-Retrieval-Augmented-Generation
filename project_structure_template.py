import os
import sys
from pathlib import Path

project_file_structure = [
    "src/",
    "src/__init__.py",
    "src/chatbot_code/",
    "src/chatbot_code/chatbot.py",
    "src/chatbot_code/__init__.py",
    "src/cache_implementation/",
    "src/cache_implementation/cache_manager.py",
    "src/cache_implementation/__init__.py",
    "src/llm_integration/",
    "src/llm_integration/llm_integration.py",
    "src/llm_integration/__init__.py",
    "src/api_endpoint/",
    "src/api_endpoint/api_routes.py",
    "src/api_endpoint/__init__.py",
    "src/logging/",
    "src/logging/__init__.py",
    "src/logging/logger.py",
    "src/exceptions/",
    "src/exceptions/exception.py",
    "src/exceptions/__init__.py",
    "src/utils/",
    "src/utils/utils.py",
    "src/utils/__init__.py",
    "README.md",
    "Dockerfile",
    "config/",
    "config/config.yaml"
]


for dir_or_file in project_file_structure:
    path=Path(dir_or_file)

    if dir_or_file.endswith("/"):
        path.mkdir(parents=True, exist_ok=True)

    else:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.touch()