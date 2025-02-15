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
    max_tokens=700,      # Reduced tokens for faster response
    temperature=0.1,     # Lower temperature for concise answers
    model_kwargs={
        "top_p": 0.9,
        "frequency_penalty": 0.2,
        "presence_penalty": 0.6
    }
)

def format_response(text: str) -> str:
    """Formats the response for proper Markdown rendering."""
    logger.info("Formatting response for better readability.")
    paragraphs = text.split("\n\n")
    formatted_output = []

    for para in paragraphs:
        lines = para.splitlines()

        # Convert to Headings if keywords are found
        if any(para.startswith(keyword) for keyword in [
            "What is", "Causes of", "Symptoms of", "Types of", 
            "Transmission of", "Prevention of"
        ]):
            formatted_output.append(f"### {para}")
        
        # Bullet Points - Only if line starts with "-" or "*"
        elif all(line.strip().startswith(("-", "*")) for line in lines):
            formatted_output.extend([line.strip() for line in lines])
        
        # Numbered Lists - Only if line starts with a number
        elif all(line.strip()[0].isdigit() and line.strip()[1] == '.' for line in lines):
            formatted_output.extend(lines)
        
        # General Paragraph - No bullet points added
        else:
            formatted_output.append(para)

    return "\n\n".join(formatted_output)



def conversation_chain(query: str, device_id: str):
    """Manages the conversation flow and context retrieval."""
    logger.info(f"Starting conversation chain for device: {device_id}")

    # Fetch conversation history
    conversation_history = fetch_conversations(device_id)
    logger.info(f"Retrieved {len(conversation_history)} messages from conversation history.")
    
    # Limit to the most recent 5 messages for context
    history_messages = [
        msg
        for message in conversation_history[-5:]  # Only use the last 5 messages
        for msg in (
            HumanMessage(content=message.get("user_query", "")),
            AIMessage(content=message.get("assistant_response", ""))
        )
    ]

    # Retrieve context (limit to top 3 relevant docs)
    logger.info("Attempting to retrieve context using vector search.")
    context_docs = retrieve_context(query)[:3]  # Limit to top 3 context documents
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
