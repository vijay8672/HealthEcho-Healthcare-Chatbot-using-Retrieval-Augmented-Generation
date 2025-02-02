# vectorstore_retriever.py
from langchain_core.documents import Document
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma

def load_documents() -> list:
    """
    Loads documents to be used for retrieval.
    In a real project, you might load from files, databases, or APIs.
    """
    docs = [
        Document(
            page_content="LangChain is an AI framework for building LLM-powered applications.",
            metadata={"source": "official_docs", "category": "AI"}
        ),
        Document(
            page_content="LangChain is useful for building chatbots and intelligent applications.",
            metadata={"source": "official_docs", "category": "AI"}
        ),
    ]
    return docs

def create_vectorstore():
    """
    Creates a vector store from loaded documents using HuggingFace embeddings.
    """
    docs = load_documents()
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    vector_store = Chroma.from_documents(docs, embedding=embeddings)
    return vector_store

def get_retriever(vector_store, k: int = 1):
    """
    Returns a retriever that searches for similar documents.
    """
    return vector_store.as_retriever(search_type="similarity", search_kwargs={"k": k})
