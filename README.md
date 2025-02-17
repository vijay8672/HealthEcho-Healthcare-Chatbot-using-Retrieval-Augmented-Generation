# HealthEcho - Healthcare Chatbot using Retrieval-Augmented Generation (RAG)

Welcome to the **Retrieval-Augmented Generation (RAG) Chatbot**! This project integrates advanced techniques to enhance chatbot performance by using vector retrieval mechanisms to store and retrieve prior conversation histories and relevant documents, creating a more efficient and contextually aware AI assistant.

![image](https://github.com/user-attachments/assets/f0df6e4b-46af-4b75-9bcc-b012c6173121)

---

## Table of Contents
- [Introduction](#introduction)
- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [Retrieval-Augmented Generation](#retrieval-augmented-generation-rag)
- [Customization](#customization)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

---

## Introduction

This chatbot project utilizes Retrieval-Augmented Generation (RAG), which integrates both conversation history and document retrieval techniques to enhance the chatbot's ability to provide relevant, contextual, and accurate responses. This approach significantly improves the performance of chatbot applications in handling user queries that require context from previous interactions or specific documents.

---

## Features

- **Improved Performance**: By caching past conversation history and relevant documents, response time is reduced.
- **Context-Aware Responses**: The chatbot remembers prior conversations and integrates context for more coherent and meaningful answers.
- **Efficient Document Retrieval**: Using FAISS vector search, the chatbot efficiently retrieves relevant documents to answer specific questions.
- **Markdown Support**: Responses are formatted with markdown for better readability and UI.
- **Responsive UI**: The chatbot features a ChatGPT-like interface with dark mode toggle, full-page responsiveness, and a typing indicator.
- **Extensible**: Easily customizable for adding new sources of data or improving response templates.

---

## Installation

To get started, follow the steps below:

1. Clone this repository:
    ```bash
    git clone https://github.com/vijay8672/HealthEcho-Healthcare-Chatbot-using-Retrieval-Augmented-Generation.git
    ```

2. Create and activate a virtual environment (optional but recommended):
    ```bash
    # If using conda
    conda create -p venv python==3.X -y  # Create virtual environment
    conda activate venv/                 # Activate the virtual environment
    
    # Or using venv
    python -m venv venv
    source venv/bin/activate  # On Windows, use 'venv\Scripts\activate'
    ```

3. Install the required dependencies:
    ```bash
    pip install -r requirements.txt
    ```

4. Set up environment variables:
    Create a `.env` file in the root of the project with the following details:
    ```
    OPENAI_API_KEY=your_openai_api_key
    HF_TOKEN= your_huggingface_token
    ```

---

## Usage

After installing the dependencies, you can run the chatbot. Here's how you can get started:

1. Open a terminal and navigate to the project directory.
2. Run the `app.py` script to start the chatbot:
    ```bash
    python app.py
    ```

3. Open your browser and go to `http://localhost:5000` to interact with the chatbot.

---

## Project Structure

This project has the following structure:

    RAG in chatbot_project/
    ├── .env                      # Environment variables (API keys, etc.)
    ├── app.py                    # Main Flask application
    ├── src/
    │   ├── chain/
    │   │   └── chain_builder.py  # Combines all components into a single pipeline
    │   ├── conversation/
    │   │   └── save_conversation.py # Manages conversation history
    │   │   └── fetch_conversation.py # fetches conversation history
    │   ├── prompt/
    │   │   └── advanced_prompt.py   # Defines the advanced prompt template
    │   └── retriever/
    │       └── vectorstore_retriever.py  # Handles document loading and retrieval
    │   └── store/
    │       └── vectorstore.py  # scrapes the data from WHO website and stores the embeddings in google cloud bucket
    ├── templates/
    │   └── index.html             # Frontend UI template
    ├── static/
    │       └── styles.css         # Custom CSS
    └── requirements.txt           # List of required dependencies

---

## Retrieval-Augmented Generation (RAG)

This chatbot uses RAG to enhance its performance by:
- Retrieving relevant information from embeddings stored in google storage bucket using FAISS vector search.
- Integrating conversation history for contextual understanding.
- Generating accurate and context-aware responses using the Groq model (llama3-8b-8192).

The chatbot first checks the conversation history for context, then retrieves relevant data from the embeddings stored in google bucket if needed. If no history or vector data is found, the model generates a response based on the current query.

---

## Customization

You can customize the chatbot by:
- Modifying prompt templates in `src/prompt/advanced_prompt.py`.
- Changing vector retrieval settings in `src/retriever/vectorstore_retriever.py`.
- Adjusting UI elements in `templates/index.html` and `static/css/styles.css`.

---

## Deployment

This project is containerized using Docker for both frontend (Nginx) and backend (Flask) services. The containers are then deployed on **Azure Container Registry** for seamless scalability and management.  

### Containerization

1. Build Docker image :
    ```bash
    docker build -t healthecho_chatbot .
    ```

2. Push the Docker images to Azure Container Registry:
    ```bash
    docker tag chatbot-frontend health_chatbot.azurecr.io/chatbot-frontend:v1
    docker tag chatbot-backend healthchatbot.azurecr.io/chatbot-backend:v1

    docker push healthchatbot.azurecr.io/chatbot-frontend:v1
    docker push healthchatbot.azurecr.io/chatbot-backend:v1
    ```
    
---

## Contributing

Contributions are welcome! If you'd like to contribute to this project, please follow these steps:
1. Fork the repository.
2. Create a new branch (`git checkout -b feature-branch-name`).
3. Make your changes and commit them (`git commit -m 'Add new feature'`).
4. Push to the branch (`git push origin feature-branch-name`).
5. Open a pull request.

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more details.
