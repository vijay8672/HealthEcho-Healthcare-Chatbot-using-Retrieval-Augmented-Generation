## chain_builder.py


from langchain_groq import ChatGroq
from langchain.schema import HumanMessage, AIMessage
from src.retriever.vectorstore_retriever import retrieve_context
from src.conversation.fetch_conversation import fetch_conversations
from logging_module.logger import logger
from src.prompt_template.prompts import advanced_prompt_template
import os

# Groq Model Setup
groq_api_key = os.getenv("GROQ_API_KEY")
groq_model_name = "llama3-8b-8192"
model = ChatGroq(
    model=groq_model_name,
    groq_api_key=groq_api_key,
    max_tokens=500,      # Maximum tokens for response
    temperature=0.2,     # Lower value for factual consistency
    model_kwargs={
        # Only include parameters explicitly supported by ChatGroq
        "top_p": 0.9,  # Uncomment if needed
        "frequency_penalty": 0.2,  # Uncomment if needed
        "presence_penalty": 0.6  # Uncomment if needed
    }
)
def format_response(text: str) -> str:
    """Formats the response into paragraphs, bullet points, and numbered lists."""
    logger.info("Formatting response for better readability.")
    paragraphs = text.split("\n\n")
    formatted_output = []

    for para in paragraphs:
        lines = para.splitlines()

        # Format numbered points
        if all(line.strip().startswith(f"{i}.") for i, line in enumerate(lines, start=1)):
            formatted_output.append(para)
        
        # Format bullet points
        elif all(line.strip().startswith("-") or line.strip().startswith("*") for line in lines):
            formatted_output.append(para)
        
        # General paragraph
        else:
            formatted_output.append(f"<p>{para}</p>")

    return "\n".join(formatted_output)

def conversation_chain(query: str, device_id: str):
    """Manages the conversation flow and context retrieval."""
    logger.info(f"Starting conversation chain for device: {device_id}")

    # Fetch conversation history
    conversation_history = fetch_conversations(device_id)
    logger.info(f"Retrieved {len(conversation_history)} messages from conversation history.")
    
    history_messages = [
        msg
        for message in conversation_history
        for msg in (
            HumanMessage(content=message.get("user_query", "")),
            AIMessage(content=message.get("assistant_response", ""))
        )
    ]

    # Retrieve context
    logger.info("Attempting to retrieve context using vector search.")
    context_docs = retrieve_context(query)
    if context_docs:
        logger.info(f"Retrieved {len(context_docs)} context documents from vector search.")
    else:
        logger.info("No relevant context found using vector search.")
    
    context_str = "\n".join([doc.get("content", "") for doc in context_docs]) if context_docs else ""

    # Create prompt using the reusable function
    prompt_template = advanced_prompt_template(language="English", role="medical assistant")

    # Include context in prompt if available
    context_section = f"Relevant Information: {context_str}\n" if context_str else ""
    formatted_prompt = prompt_template.format_messages(input=f"{context_section}{query}", history=history_messages)
    logger.info("Formatted prompt ready for model invocation.")

    # Invoke model and return response
    try:
        response = model.invoke(formatted_prompt)
        formatted_response = format_response(response.content if hasattr(response, 'content') else str(response))
        logger.info("Model successfully generated a response.")
        return formatted_response
    except Exception as e:
        logger.error(f"Error in chain execution: {e}")
        return "An error occurred while processing your request."

if __name__ == "__main__":
    query = input("Enter your query: ")
    device_id = "dummy_device_123"
    response = conversation_chain(query, device_id)
    print("Response:", response)
