## HealthEcho - Healthcare Chatbot using Cache Augumented Generation

    Welcome to the **Cache-Augmented Generation (CAG) Chatbot**! This project integrates advanced techniques to enhance chatbot performance by using caching mechanisms to store and retrieve prior conversation histories and relevant documents, creating a more efficient and contextually aware AI assistant.


## Table of Contents
- [Introduction](#introduction)
- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [Cache-Augmented Generation](#cache-augmented-generation-cag)
- [Customization](#customization)
- [Contributing](#contributing)
- [License](#license)

## Introduction

This chatbot project utilizes Cache-Augmented Generation (CAG), which integrates both conversation history and document retrieval techniques to enhance the chatbot's ability to provide relevant, contextual, and fast responses. This approach significantly improves the performance of chatbot applications in handling user queries that require context from previous interactions or specific documents.

## Features

- **Improved Performance**: By caching past conversation history and relevant documents, response time is reduced.
- **Context-Aware Responses**: The chatbot remembers prior conversations and integrates context for more coherent and meaningful answers.
- **Efficient Document Retrieval**: Using a vector store, the chatbot can pull relevant documents to answer specific questions.
- **Extensible**: Easily customizable for adding new sources of data or improving response templates.

## Installation

To get started, follow the steps below:

1. Clone this repository:
    ```bash
    git clone https://github.com/yourusername/chatbot_project.git
    cd chatbot_project
    ```

2. Create and activate a virtual environment (optional but recommended):
    ```bash
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
    CHROMA_DB_PATH=your_chroma_db_path
    ```

## Usage

After installing the dependencies, you can run the chatbot. Here's how you can get started:

1. Open a terminal and navigate to the project directory.
2. Run the `chatbot.py` script to start the chatbot:
    ```bash
    python chatbot.py
    ```

3. The chatbot will prompt for user input, process the queries, and provide responses based on cached conversation history and document retrieval.

## Project Structure

This project has the following structure:

chatbot_project/
├── .env                      # Environment variables (API keys, etc.)
├── chatbot.py                # Main chatbot interface
├── chain_builder.py          # Combines all components into a single pipeline
├── conversation.py           # Manages conversation history
├── advanced_prompt.py        # Defines the advanced prompt template
├── vectorstore_retriever.py  # Handles document loading and retrieval
└── requirements.txt          # List of required dependencies

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more details.


