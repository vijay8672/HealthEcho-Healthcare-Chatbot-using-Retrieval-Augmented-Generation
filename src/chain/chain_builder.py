# chain_builder.py
import os
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_core.runnables import RunnablePassthrough
from langchain_core.runnables.history import RunnableWithMessageHistory

from src.conversation_history.conversation import get_session_history
from src.vectorstore_retriever.vectorstore_retriever import create_vectorstore, get_retriever
from src.prompt_template.advanced_prompt import create_advanced_prompt_template


def create_chatbot_chain(session_id: str = "default") -> object:
    """
    Creates a chatbot chain that integrates:
      - ChatGroq (the language model)
      - An advanced prompt template
      - A vectorstore retriever (for document context, if desired)
      - Conversation history management

    The chain expects an input that is a dict. If a raw string is passed,
    the base input function treats it as the question. The output dict is merged
    with default values so that it always contains:
      - "context"
      - "question"
      - "Language"
      - "messages"

    Returns:
        A runnable chain object with integrated message history.
    """
    # Load environment variables
    load_dotenv()
    groq_api_key = os.getenv("GROQ_API_KEY")
    if not groq_api_key:
        raise ValueError("GROQ_API_KEY environment variable is not set.")
    model_name = "llama-3.3-70b-versatile"
    
    # Initialize ChatGroq model
    model = ChatGroq(model=model_name, groq_api_key=groq_api_key)
    
    # (Optional) Build vectorstore retriever if you want to include retrieved context.
    vector_store = create_vectorstore()
    retriever = get_retriever(vector_store, k=1)
    # For this example, we’re not auto‑populating "context" with retrieved text.
    
    # Create advanced prompt template
    prompt = create_advanced_prompt_template()
    
    # Create a base runnable that converts the input into the required dict,
    # merging in default keys if any are missing.
    def base_input_fn(x):
         defaults = {"context": "", "Language": "English", "question": "", "messages": []}
         if isinstance(x, dict):
             merged = {**defaults, **x}
         else:
             merged = {"context": "", "Language": "English", "question": x, "messages": []}
         return merged
         
    base_input_runnable = RunnablePassthrough(base_input_fn)
    
    # Build the chain by chaining the runnables
    chain = base_input_runnable | prompt | model
    
    # Wrap the chain with message history management.
    # The input_messages_key ("messages") tells the history runner where to find the conversation messages.
    chain_with_history = RunnableWithMessageHistory(chain, get_session_history, input_messages_key="messages")
    
    return chain_with_history