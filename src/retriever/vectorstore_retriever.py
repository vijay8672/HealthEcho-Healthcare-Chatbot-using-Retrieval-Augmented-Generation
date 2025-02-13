import numpy as np
import json
from google.cloud import storage
import faiss  # Using Faiss for fast vector search
from logging_module.logger import logger
import io
from langchain_huggingface import HuggingFaceEmbeddings  # Import Hugging Face

# Configurations
BUCKET_NAME = "healthecho-bucket"
EMBEDDINGS_PATH = "embeddings/disease_embeddings.npy"
METADATA_PATH = "embeddings/disease_metadata.json"
MODEL_NAME = "sentence-transformers/multi-qa-mpnet-base-dot-v1"
SIMILARITY_THRESHOLD = 0.45  # Set similarity threshold

# Initialize Clients
storage_client = storage.Client()

def load_vectors_from_gcs():
    """Load embeddings and metadata from GCS."""
    try:
        # Load embeddings (vectors)
        bucket = storage_client.bucket(BUCKET_NAME)
        blob = bucket.blob(EMBEDDINGS_PATH)
        embeddings = np.load(io.BytesIO(blob.download_as_bytes()), allow_pickle=True)
        
        # Load metadata (titles, URLs)
        blob = bucket.blob(METADATA_PATH)
        metadata = json.loads(blob.download_as_text())
        
        return embeddings, metadata
    except Exception as e:
        logger.error(f"Error loading data from GCS: {e}")
        return None, None

def get_query_embedding(query):
    """Generate embedding for a query using Hugging Face model."""
    embeddings_model = HuggingFaceEmbeddings(model_name=MODEL_NAME)
    query_embedding = embeddings_model.embed_query(query)
    return np.array(query_embedding).astype('float32')

def find_similar_vectors(query_embedding, embeddings, metadata, top_k=5):
    """Find the top K most similar embeddings using Faiss ANN search."""
    # Convert to float32 as required by Faiss
    embeddings = embeddings.astype('float32')
    query_embedding = query_embedding.reshape(1, -1)
    
    # Normalize vectors for cosine similarity
    faiss.normalize_L2(embeddings)
    faiss.normalize_L2(query_embedding)
    
    # Create Faiss index for Inner Product Search (Cosine Similarity)
    index = faiss.IndexFlatIP(embeddings.shape[1])  
    index.add(embeddings)
    
    # Search for nearest neighbors
    similarities, top_indices = index.search(query_embedding, top_k)
    
    # Retrieve and filter results by similarity threshold
    top_results = []
    for j, i in enumerate(top_indices[0]):
        if similarities[0][j] > SIMILARITY_THRESHOLD:
            top_results.append({
                "title": metadata[i]["title"], 
                "url": metadata[i]["url"], 
                "score": similarities[0][j]
            })

    return top_results

def retrieve_context(query):
    """Retrieve relevant context using vector search."""
    embeddings, metadata = load_vectors_from_gcs()
    if embeddings is None or metadata is None:
        return []
    
    query_embedding = get_query_embedding(query)
    return find_similar_vectors(query_embedding, embeddings, metadata)

if __name__ == "__main__":
    query = "What is dengue?"
    context_docs = retrieve_context(query)
    print("Retrieved Context:", context_docs)
