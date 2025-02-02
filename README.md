## Cache Augumented Generation in chatbot


How It Works (Explained Simply):
conversation.py
• Manages conversation history for each session.
vectorstore_retriever.py
• Loads some example documents and creates a vector-based search index (vector store) so that if you want to add context later, you can retrieve similar documents.
advanced_prompt.py
• Defines a fancy prompt template that tells the assistant to be helpful and answers in a given language while using any extra context.
chain_builder.py
• Combines the language model (ChatGroq), the advanced prompt, and (optionally) retrieval context. It also wraps everything with conversation history.
chatbot.py
• Provides a function to answer a question and an interactive chat loop.
This modular design follows common data science and software engineering standards—keeping components separate, using clear functions and type hints, and loading configuration from environment variables.