from logging_module.logger import logger
from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_core.documents import Document

embeddings = HuggingFaceEmbeddings(model_name="abhinand/MedEmbed-small-v0.1")
vector_store_path = r"C:\Generative AI Projects\CAG in Chatbot\vectorstore"
vector_store = Chroma(persist_directory=vector_store_path, embedding_function=embeddings)

def get_retriever(vector_store, k: int = 1):
    return vector_store.as_retriever(search_type="similarity", search_kwargs={"k": k})

logger.info("retrieving the vectorstore as retriever")

def retrieve_context(retriever, query: str):
    logger.info("Retrieving context...")
    results = retriever.invoke(query)
    if results:
        return results
    else:
        return []
        
if __name__ == "__main__":
    query = "What is dengue?"
    retriever = get_retriever(vector_store)
    context_docs = retrieve_context(retriever, query)
    print(context_docs)
