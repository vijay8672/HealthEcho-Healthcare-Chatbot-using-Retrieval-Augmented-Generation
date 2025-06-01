"""
Vector store for document embeddings.
"""
import os
import json
import numpy as np
from pathlib import Path
from typing import List, Dict, Any, Optional

from ..utils.logger import get_logger
# from ..utils.faiss_utils import initialize_faiss, get_faiss_index # Remove these imports
from ..config import DATA_DIR, VECTOR_DIMENSION
from ..core.resources import GlobalResources # Import GlobalResources

logger = get_logger(__name__)

class VectorStore:
    """Store and retrieve document embeddings using FAISS."""
    
    def __init__(self, dimension: int = VECTOR_DIMENSION):
        """
        Initialize the vector store.
        
        Args:
            dimension: Dimension of the embeddings
        """
        self.dimension = dimension
        # Get the singleton FAISS index
        self.index = GlobalResources.get_faiss_index(dimension)
        self.documents = []
        self.vectors = np.zeros((0, dimension))  # Store vectors in memory
        
        # Load existing documents and vectors
        self._load_documents()
        
        # Log initialization state
        if self.index is not None:
            logger.info(f"FAISS index initialized with {self.index.ntotal} vectors")
        else:
            logger.error("Failed to initialize FAISS index")
            
        logger.info(f"Vector store initialized with {len(self.documents)} documents")
        
    def _load_documents(self):
        """
        Load existing documents from disk.

        This method now relies on the index being initialized externally.
        """
        try:
            if self.index is None:
                 logger.warning("FAISS index not available, skipping document loading.")
                 return

            # Load documents from embeddings directory
            docs_path = DATA_DIR / "embeddings" / "documents.json"
            if docs_path.exists():
                with open(docs_path, 'r', encoding='utf-8') as f:
                    self.documents = json.load(f)
                logger.info(f"Loaded {len(self.documents)} documents from disk")

                # Load vectors from embeddings directory
                vectors_path = DATA_DIR / "embeddings" / "vectors.npy"
                if vectors_path.exists():
                    self.vectors = np.load(vectors_path)
                    if len(self.vectors) == len(self.documents):
                        # Only add vectors to index if it's empty
                        if self.index.ntotal == 0:
                            self.index.add(self.vectors)
                            logger.info(f"Added {len(self.vectors)} vectors to FAISS index")
                            logger.info(f"FAISS index now contains {self.index.ntotal} vectors")
                        else:
                            logger.info(f"FAISS index already contains {self.index.ntotal} vectors, skipping vector loading")
                    else:
                        logger.error(f"Vector count mismatch: {len(self.vectors)} vectors vs {len(self.documents)} documents")
                else:
                    logger.warning("No vectors file found on disk")
            else:
                logger.warning("No documents file found on disk")

        except Exception as e:
            logger.error(f"Error loading documents: {str(e)}", exc_info=True)
            
    def add_documents(self, documents: List[Dict[str, Any]], vectors: np.ndarray):
        """
        Add documents and their embeddings to the store.
        
        Args:
            documents: List of document dictionaries
            vectors: Numpy array of document embeddings
        """
        try:
            if self.index is None:
                logger.error("FAISS index not initialized")
                return
                
            # Verify vector dimensions
            if vectors.shape[1] != self.dimension:
                logger.error(f"Vector dimension mismatch: expected {self.dimension}, got {vectors.shape[1]}")
                return
                
            # Log pre-addition state
            logger.info(f"Adding {len(documents)} documents and {len(vectors)} vectors")
            logger.info(f"Current FAISS index size: {self.index.ntotal} vectors")
                
            # Add vectors to index
            self.index.add(vectors)
            
            # Store vectors in memory
            self.vectors = np.vstack([self.vectors, vectors])
            
            # Add documents to list
            self.documents.extend(documents)
            
            # Log post-addition state
            logger.info(f"Added {len(vectors)} vectors to FAISS index")
            logger.info(f"FAISS index now contains {self.index.ntotal} vectors")
            logger.info(f"Total documents in store: {len(self.documents)}")
            
            # Save to disk
            self._save_to_disk()
            
        except Exception as e:
            logger.error(f"Error adding documents: {str(e)}", exc_info=True)
            
    def search(self, query_embedding: np.ndarray, top_k=5) -> List[Dict[str, Any]]:
        """
        Search for similar documents using a query embedding.
        
        Args:
            query_embedding: Query embedding vector
            top_k: Number of results to return
            
        Returns:
            List of similar documents with their scores
        """
        try:
            if self.index is None:
                logger.error("FAISS index not initialized")
                return []
                
            if len(self.documents) == 0:
                logger.warning("No documents available for search")
                return []
                
            # Ensure query embedding is 2D
            if query_embedding.ndim == 1:
                query_embedding = query_embedding.reshape(1, -1)
                
            # Verify query embedding dimension
            if query_embedding.shape[1] != self.dimension:
                logger.error(f"Query embedding dimension mismatch: expected {self.dimension}, got {query_embedding.shape[1]}")
                return []
                
            # Search index
            distances, indices = self.index.search(query_embedding, top_k)
            
            # Get documents
            results = []
            total_chars = 0
            sources = set()
            
            for i, idx in enumerate(indices[0]):
                if idx < len(self.documents):
                    doc = self.documents[idx].copy()
                    doc['score'] = float(distances[0][i])
                    results.append(doc)
                    
                    # Track context statistics
                    total_chars += len(doc['content'])
                    sources.add(doc['source_file'])
            
            # Log retrieval statistics
            logger.info(f"Retrieved {len(results)} chunks from {len(sources)} sources")
            logger.info(f"Total context length: {total_chars} characters")
            
            if not results:
                logger.warning("No relevant documents found for the query")
                
            return results
            
        except Exception as e:
            logger.error(f"Error searching documents: {e}", exc_info=True)
            return []
            
    def _save_to_disk(self):
        """Save documents and vectors to disk."""
        try:
            if self.index is None:
                logger.warning("FAISS index not available, skipping save to disk.")
                return

            # Create embeddings directory if it doesn't exist
            embeddings_dir = DATA_DIR / "embeddings"
            embeddings_dir.mkdir(parents=True, exist_ok=True)
            
            # Save documents to embeddings directory
            docs_path = embeddings_dir / "documents.json"
            with open(docs_path, 'w', encoding='utf-8') as f:
                json.dump(self.documents, f, ensure_ascii=False, indent=2)
                
            # Save vectors to embeddings directory
            if len(self.vectors) > 0:
                vectors_path = embeddings_dir / "vectors.npy"
                np.save(vectors_path, self.vectors)
                logger.info(f"Saved {len(self.vectors)} vectors to disk")
                
        except Exception as e:
            logger.error(f"Error saving to disk: {e}", exc_info=True)
            
    def clear(self):
        """Clear all documents and vectors."""
        try:
            # Ensure index is available before resetting
            if self.index is not None:
                self.index.reset()
            self.documents = []
            self.vectors = np.zeros((0, self.dimension))
            self._save_to_disk()
        except Exception as e:
            logger.error(f"Error clearing vector store: {e}", exc_info=True)
