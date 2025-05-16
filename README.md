# Advanced Multi-Model RAG Chatbot

An advanced HR assistant chatbot that uses Retrieval-Augmented Generation (RAG) to provide accurate responses based on company HR documents.

## Features

- **Local Document Processing**: Process and index HR documents (PDF, DOCX, TXT, MD) without cloud dependencies
- **Vector Search**: Fast and accurate retrieval of relevant information using FAISS
- **Conversational AI**: Natural language understanding and generation using Groq's Llama 3 model
- **Voice Interaction**: Speech-to-text and text-to-speech capabilities
- **Modern UI/UX**: Responsive design with multiple themes and advanced features
- **Source Attribution**: View the sources used to generate responses
- **Document Upload**: Add new documents through the UI
- **Chat History**: Save and manage conversation history
- **Export Functionality**: Export conversations for record-keeping
- **Email Escalation**: Automatically escalate unanswered HR questions to designated HR personnel

## Architecture

The chatbot uses a modular architecture with the following components:

1. **Document Processing**: Extract text from documents, chunk into manageable pieces, and generate embeddings
2. **Vector Database**: Store and retrieve document embeddings for similarity search
3. **Retrieval System**: Find relevant document chunks based on user queries
4. **LLM Chain**: Generate responses using retrieved context and conversation history
5. **Conversation Management**: Track and manage conversation history
6. **Speech Processing**: Convert between speech and text
7. **Web Interface**: Modern, responsive UI for user interaction

## Getting Started

### Prerequisites

- Python 3.9+
- Virtual environment (recommended)

### Installation

1. Clone the repository
2. Create and activate a virtual environment:
   ```
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```
   pip install -r requirements.txt
   ```
4. Set up environment variables:
   - Create a `.env` file with your API keys and configuration:
     ```
     # Required
     GROQ_API_KEY=your_api_key_here

     # Optional - Email Escalation (if enabled)
     SMTP_SERVER=smtp.gmail.com
     SMTP_PORT=587
     SMTP_USERNAME=your_email@gmail.com
     SMTP_PASSWORD=your_app_password
     SENDER_EMAIL=your_email@gmail.com
     HR_EMAILS=hr1@company.com,hr2@company.com
     ENABLE_EMAIL_ESCALATION=true
     ```

### Running the Chatbot

1. Start the application:
   ```
   python run_chatbot.py
   ```
2. Open your browser and navigate to `http://localhost:5000`

## Adding HR Documents

Place your HR documents in the `Hr Files` directory. The following formats are supported:
- PDF (`.pdf`)
- Microsoft Word (`.docx`)
- Text files (`.txt`)
- Markdown files (`.md`)

The documents will be automatically processed and indexed when the application starts.

## Customization

- **Themes**: Choose from light, dark, blue, or green themes
- **Voice Settings**: Enable or disable voice responses
- **Model Settings**: Adjust model parameters in `config.py`

## Development

### Project Structure

```
/advanced_rag_chatbot
│
├── app.py                      # Main application entry point
├── config.py                   # Configuration settings
│
├── /database                   # Database modules
│   ├── models.py               # SQLite database models
│   ├── conversation_store.py   # Conversation storage and retrieval
│   └── vector_store.py         # Vector database for embeddings
│
├── /document_processing        # Document processing modules
│   ├── file_processor.py       # Process different file types
│   ├── text_chunker.py         # Split documents into chunks
│   ├── embedding_generator.py  # Generate embeddings for chunks
│   └── training_pipeline.py    # End-to-end training pipeline
│
├── /retrieval                  # Retrieval modules
│   ├── vector_search.py        # Vector similarity search
│   └── context_builder.py      # Build context from retrieved chunks
│
├── /chain                      # LLM chain modules
│   ├── prompt_templates.py     # Prompt templates for different scenarios
│   └── chain_builder.py        # Build and execute LLM chains
│
├── /conversation               # Conversation modules
│   ├── history_manager.py      # Manage conversation history
│   └── language_detector.py    # Detect language of user input
│
├── /speech                     # Speech processing modules
│   ├── speech_to_text.py       # Convert speech to text
│   └── text_to_speech.py       # Convert text to speech
│
├── /utils                      # Utility modules
│   ├── logger.py               # Logging functionality
│   ├── error_handler.py        # Error handling utilities
│   └── email_service.py        # Email service for escalations
│
├── /static                     # Static files
│   ├── css/
│   │   └── styles.css          # Main stylesheet
│   ├── js/
│   │   └── app.js              # Main JavaScript
│   └── images/                 # Image assets
│
├── /templates                  # HTML templates
│   └── index.html              # Main application page
│
└── /data                       # Data directory
    ├── /embeddings             # Stored embeddings
    ├── /processed              # Processed documents
    ├── /raw                    # Raw input documents
    └── /db                     # SQLite database files
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.
