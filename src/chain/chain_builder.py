from langchain_core.prompts import ChatPromptTemplate
from src.conversations.fetch_conversation import get_all_conversations
from src.retriever.vectorstore_retriever import retrieve_context, get_retriever
from src.prompt_template.prompts import create_advanced_prompt_template
from logging_module.logger import logger
from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
import os
from langchain_groq import ChatGroq
from dotenv import load_dotenv
import uuid
from langchain.schema import HumanMessage, AIMessage

load_dotenv()

model_name = "abhinand/MedEmbed-small-v0.1"
embeddings = HuggingFaceEmbeddings(model_name=model_name)

vector_store = Chroma(
    persist_directory=r"C:\\Generative AI Projects\\CAG in Chatbot\\vectorstore",
    embedding_function=embeddings
)

groq_api_key = os.getenv("GROQ_API_KEY")
groq_model_name = "llama3-8b-8192"
model = ChatGroq(model=groq_model_name, groq_api_key=groq_api_key, max_tokens=500)

def conversation_chain(query: str, session_id: str):
    logger.info(f"Starting conversation chain for session: {session_id}")

    # Step 1: Retrieve conversation history from Firestore
    conversation_history = get_all_conversations(session_id)
    
    # Convert conversation history to a list of message objects
    history_messages = []
    if conversation_history:
        for message in conversation_history:
            history_messages.append(HumanMessage(content=message.get("user_query", "")))
            history_messages.append(AIMessage(content=message.get("assistant_response", "")))

    # Step 2: Retrieve context from vectorstore
    retriever = get_retriever(vector_store)
    context_docs = retrieve_context(retriever, query)
    context_str = "\n".join([doc.page_content for doc in context_docs]) if context_docs else ""
    
    # Step 3: Build the prompt template and format the input
    prompt_template = create_advanced_prompt_template("english", "medical assistant")
    formatted_prompt = prompt_template.format(input=query, history=history_messages, context=context_str)

    # Step 4: Generate the response from the model
    logger.info("Generating model response...")
    try:
        logger.info(f"Formatted Prompt: {formatted_prompt}")
        response = model.invoke(formatted_prompt)  # Fix: Removed dictionary wrapping
        return response
    except Exception as e:
        logger.error(f"Error in chain execution: {e}")
        return "An error occurred while processing your request."

if __name__ == "__main__":
    session_id = str(uuid.uuid4())
    response = conversation_chain(query="What is hepatitis?", session_id=session_id)
    print(response)
