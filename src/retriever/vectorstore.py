# vectorstore.py 


import os
import requests
import logging
from bs4 import BeautifulSoup
from langchain_core.documents import Document
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from logging_module.logger import logger
from dotenv import load_dotenv
load_dotenv()

HUGGINGFACE_TOKEN=os.getenv("HF_TOKEN")


def fetch_disease_info(url: str) -> str:
    """
    Fetches and cleans disease information from the given URL.
    Args:
        url (str): The URL of the disease information page.
    Returns:
        str: Cleaned text content of the page.
    """
    logger.info(f"Fetching data from {url}...")
    response = requests.get(url)
    if response.status_code != 200:
        logger.error(f"Failed to retrieve content from {url}")
        return ""
    
    soup = BeautifulSoup(response.content, 'html.parser')
    paragraphs = soup.find_all('p')
    logger.info(f"Fetched {len(paragraphs)} paragraphs from {url}")
    text = "\n".join([para.get_text() for para in paragraphs])
    return text

def load_documents() -> list:
    """
    Loads documents to be used for retrieval.
    In a real project, you might load from files, databases, or APIs.
    """
    urls = [
        "https://www.who.int/news-room/fact-sheets/detail/dengue-and-severe-dengue",
        "https://www.who.int/news-room/fact-sheets/detail/malaria",
        "https://www.who.int/news-room/fact-sheets/detail/tuberculosis"
    ]
    docs = []
    for url in urls:
        content = fetch_disease_info(url)
        if content:
            docs.append(
                Document(
                    page_content=content,
                    metadata={"source": url}
                )
            )
    logger.info(f"Loaded {len(docs)} documents.")
    return docs



def create_vectorstore(persist_directory: str = "vectorstore"):
    """
    Creates a vector store from loaded documents using HuggingFace embeddings
    and persists the vector data locally in the specified directory.

    Args:
        persist_directory (str): Directory where the vector data will be stored.
    """
    # Create directory if it doesn't exist
    if not os.path.exists(persist_directory):
        os.makedirs(persist_directory)
    logger.info("creating the vectorstore database locally")
    
    # Load documents
    docs = load_documents()

    # Initialize HuggingFace Embeddings
    embeddings = HuggingFaceEmbeddings(model_name="abhinand/MedEmbed-small-v0.1")
    
    # Create the Chroma vector store
    vector_store = Chroma.from_documents(docs, embedding=embeddings, persist_directory=persist_directory)
    
    # Since Chroma already persists automatically when we specify a persist_directory,
    # no need to call persist() explicitly.
    
    return vector_store


if __name__ == "__main__":
    vector_store = create_vectorstore()  # Load vectorstore
    logger.info("created vectorstore successfully")