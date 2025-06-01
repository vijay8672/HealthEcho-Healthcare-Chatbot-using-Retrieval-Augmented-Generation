"""
Document version control and re-indexing.
"""
import hashlib
import json
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional
import shutil

from ..utils.logger import get_logger
from ..config import DATA_DIR, RAW_DIR, PROCESSED_DIR
from .embedding_generator import EmbeddingGenerator
from ..database.vector_store import VectorStore

logger = get_logger(__name__)

class DocumentVersionControl:
    """Manage document versions and re-indexing."""

    def __init__(self):
        """Initialize document version control."""
        self.versions_file = DATA_DIR / "document_versions.json"
        self.versions = self._load_versions()
        self.embedding_generator = EmbeddingGenerator()
        self.vector_store = VectorStore()

    def _load_versions(self) -> Dict[str, Any]:
        """Load document versions from file."""
        if self.versions_file.exists():
            try:
                with open(self.versions_file, 'r') as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Error loading versions: {e}")
        return {}

    def _save_versions(self):
        """Save document versions to file."""
        try:
            with open(self.versions_file, 'w') as f:
                json.dump(self.versions, f, indent=2)
        except Exception as e:
            logger.error(f"Error saving versions: {e}")

    def _calculate_hash(self, file_path: Path) -> str:
        """Calculate SHA-256 hash of a file."""
        sha256_hash = hashlib.sha256()
        with open(file_path, "rb") as f:
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)
        return sha256_hash.hexdigest()

    def check_version(self, file_path: Path) -> bool:
        """
        Check if a file needs to be re-indexed.
        
        Args:
            file_path: Path to the file
            
        Returns:
            True if file needs re-indexing
        """
        try:
            file_hash = self._calculate_hash(file_path)
            file_name = file_path.name
            
            if file_name not in self.versions:
                return True
            
            current_version = self.versions[file_name]
            if current_version["hash"] != file_hash:
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error checking version: {e}")
            return True

    def update_version(self, file_path: Path, metadata: Dict[str, Any] = None):
        """
        Update version information for a file.
        
        Args:
            file_path: Path to the file
            metadata: Additional metadata
        """
        try:
            file_name = file_path.name
            file_hash = self._calculate_hash(file_path)
            
            self.versions[file_name] = {
                "hash": file_hash,
                "last_modified": datetime.now().isoformat(),
                "size": file_path.stat().st_size,
                "metadata": metadata or {}
            }
            
            self._save_versions()
            logger.info(f"Updated version for {file_name}")
            
        except Exception as e:
            logger.error(f"Error updating version: {e}")

    def get_version_history(self, file_name: str) -> List[Dict[str, Any]]:
        """
        Get version history for a file.
        
        Args:
            file_name: Name of the file
            
        Returns:
            List of version information
        """
        try:
            if file_name not in self.versions:
                return []
            
            return [self.versions[file_name]]
            
        except Exception as e:
            logger.error(f"Error getting version history: {e}")
            return []

    def reindex_document(self, file_path: Path) -> bool:
        """
        Re-index a document if needed.
        
        Args:
            file_path: Path to the file
            
        Returns:
            True if re-indexing was successful
        """
        try:
            if not self.check_version(file_path):
                logger.info(f"No re-indexing needed for {file_path.name}")
                return True
            
            # Generate embeddings
            embeddings = self.embedding_generator.generate_document_embeddings(file_path)
            
            # Update vector store
            self.vector_store.add_documents(
                documents=[{"content": doc["content"], "source_file": str(file_path), "chunk_index": i} for i, doc in enumerate(embeddings)],
                vectors=embeddings
            )
            
            # Update version information
            self.update_version(file_path)
            
            logger.info(f"Successfully re-indexed {file_path.name}")
            return True
            
        except Exception as e:
            logger.error(f"Error re-indexing document: {e}")
            return False

    def backup_document(self, file_path: Path) -> Optional[Path]:
        """
        Create a backup of a document.
        
        Args:
            file_path: Path to the file
            
        Returns:
            Path to backup file or None
        """
        try:
            backup_dir = DATA_DIR / "backups"
            backup_dir.mkdir(exist_ok=True)
            
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_path = backup_dir / f"{file_path.stem}_{timestamp}{file_path.suffix}"
            
            shutil.copy2(file_path, backup_path)
            logger.info(f"Created backup at {backup_path}")
            
            return backup_path
            
        except Exception as e:
            logger.error(f"Error creating backup: {e}")
            return None

    def restore_document(self, backup_path: Path, target_path: Path) -> bool:
        """
        Restore a document from backup.
        
        Args:
            backup_path: Path to backup file
            target_path: Path to restore to
            
        Returns:
            True if restore was successful
        """
        try:
            shutil.copy2(backup_path, target_path)
            logger.info(f"Restored document from {backup_path}")
            
            # Re-index the restored document
            return self.reindex_document(target_path)
            
        except Exception as e:
            logger.error(f"Error restoring document: {e}")
            return False

    def cleanup_old_versions(self, max_versions: int = 5):
        """
        Clean up old document versions.
        
        Args:
            max_versions: Maximum number of versions to keep
        """
        try:
            backup_dir = DATA_DIR / "backups"
            if not backup_dir.exists():
                return
            
            # Group backups by original filename
            backups = {}
            for backup in backup_dir.glob("*"):
                original_name = "_".join(backup.stem.split("_")[:-1])
                if original_name not in backups:
                    backups[original_name] = []
                backups[original_name].append(backup)
            
            # Keep only the most recent versions
            for original_name, version_files in backups.items():
                version_files.sort(key=lambda x: x.stat().st_mtime, reverse=True)
                for old_version in version_files[max_versions:]:
                    old_version.unlink()
                    logger.info(f"Removed old version: {old_version}")
                    
        except Exception as e:
            logger.error(f"Error cleaning up old versions: {e}") 