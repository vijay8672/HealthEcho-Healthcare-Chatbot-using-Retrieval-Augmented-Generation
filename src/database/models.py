"""
SQLite database models for the Advanced RAG Chatbot.
"""
import sqlite3
import json
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional

from ..utils.logger import get_logger
from ..config import DATABASE_PATH

logger = get_logger(__name__)

class Database:
    """SQLite database connection manager."""

    def __init__(self, db_path: Path = DATABASE_PATH):
        """Initialize the database connection."""
        self.db_path = db_path
        self._ensure_tables()

    def _get_connection(self) -> sqlite3.Connection:
        """Get a database connection."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row  # Return rows as dictionaries
        return conn

    def _ensure_tables(self):
        """Ensure all required tables exist."""
        with self._get_connection() as conn:
            cursor = conn.cursor()

            # Create conversations table
            cursor.execute('''
            CREATE TABLE IF NOT EXISTS conversations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                device_id TEXT NOT NULL,
                user_query TEXT NOT NULL,
                assistant_response TEXT NOT NULL,
                language TEXT NOT NULL,
                query_timestamp TIMESTAMP NOT NULL,
                response_timestamp TIMESTAMP NOT NULL,
                response_time_seconds REAL NOT NULL
            )
            ''')

            # Create documents table
            cursor.execute('''
            CREATE TABLE IF NOT EXISTS documents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                source_file TEXT NOT NULL,
                chunk_index INTEGER NOT NULL,
                embedding_file TEXT,
                created_at TIMESTAMP NOT NULL
            )
            ''')

            # Create vector_index table
            cursor.execute('''
            CREATE TABLE IF NOT EXISTS vector_index (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                index_name TEXT NOT NULL UNIQUE,
                dimension INTEGER NOT NULL,
                num_vectors INTEGER NOT NULL,
                last_updated TIMESTAMP NOT NULL
            )
            ''')

            # Create users table
            cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                full_name TEXT NOT NULL,
                employee_id TEXT UNIQUE,
                created_at TIMESTAMP NOT NULL,
                last_login TIMESTAMP
            )
            ''')

            conn.commit()
            logger.info("Database tables initialized")


class ConversationModel:
    """Model for conversation data."""

    def __init__(self):
        """Initialize the conversation model."""
        self.db = Database()

    def save_conversation(self, device_id: str, user_query: str, assistant_response: str,
                         language: str, query_timestamp: float, response_timestamp: float) -> int:
        """Save a conversation entry to the database."""
        response_time = round(response_timestamp - query_timestamp, 3)

        with self.db._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
            INSERT INTO conversations
            (device_id, user_query, assistant_response, language,
             query_timestamp, response_timestamp, response_time_seconds)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                device_id,
                user_query,
                assistant_response,
                language,
                datetime.fromtimestamp(query_timestamp).isoformat(),
                datetime.fromtimestamp(response_timestamp).isoformat(),
                response_time
            ))
            conn.commit()
            return cursor.lastrowid

    def get_chat_messages(self, chat_id: str, offset: int = 0, limit: int = 20) -> List[Dict[str, Any]]:
        """Get paginated messages for a specific chat."""
        with self.db._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
            SELECT * FROM conversations
            WHERE device_id = ?
            ORDER BY query_timestamp DESC
            LIMIT ? OFFSET ?
            ''', (chat_id, limit, offset))

            # Convert rows to dictionaries
            return [dict(row) for row in cursor.fetchall()]

    def get_chat_message_count(self, chat_id: str) -> int:
        """Get total number of messages in a chat."""
        with self.db._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
            SELECT COUNT(*) as count FROM conversations
            WHERE device_id = ?
            ''', (chat_id,))
            result = cursor.fetchone()
            return result['count'] if result else 0

    def get_conversations(self, device_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Get conversation history for a device."""
        with self.db._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
            SELECT * FROM conversations
            WHERE device_id = ?
            ORDER BY query_timestamp DESC
            LIMIT ?
            ''', (device_id, limit))

            # Convert rows to dictionaries
            return [dict(row) for row in cursor.fetchall()]


class DocumentModel:
    """Model for document data."""

    def __init__(self):
        """Initialize the document model."""
        self.db = Database()

    def save_document(self, title: str, content: str, source_file: str,
                     chunk_index: int, embedding_file: Optional[str] = None) -> int:
        """Save a document chunk to the database."""
        with self.db._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
            INSERT INTO documents
            (title, content, source_file, chunk_index, embedding_file, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                title,
                content,
                source_file,
                chunk_index,
                embedding_file,
                datetime.now().isoformat()
            ))
            conn.commit()
            return cursor.lastrowid

    def get_document(self, doc_id: int) -> Dict[str, Any]:
        """Get a document by ID."""
        with self.db._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM documents WHERE id = ?', (doc_id,))
            result = cursor.fetchone()
            return dict(result) if result else None

    def get_documents_by_source(self, source_file: str) -> List[Dict[str, Any]]:
        """Get all documents from a specific source file."""
        with self.db._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
            SELECT * FROM documents
            WHERE source_file = ?
            ORDER BY chunk_index
            ''', (source_file,))
            return [dict(row) for row in cursor.fetchall()]


class VectorIndexModel:
    """Model for vector index metadata."""

    def __init__(self):
        """Initialize the vector index model."""
        self.db = Database()

    def save_index_metadata(self, index_name: str, dimension: int, num_vectors: int) -> int:
        """Save or update vector index metadata."""
        with self.db._get_connection() as conn:
            cursor = conn.cursor()

            # Check if index already exists
            cursor.execute('SELECT id FROM vector_index WHERE index_name = ?', (index_name,))
            existing = cursor.fetchone()

            if existing:
                # Update existing index
                cursor.execute('''
                UPDATE vector_index
                SET dimension = ?, num_vectors = ?, last_updated = ?
                WHERE index_name = ?
                ''', (dimension, num_vectors, datetime.now().isoformat(), index_name))
                index_id = existing['id']
            else:
                # Create new index
                cursor.execute('''
                INSERT INTO vector_index
                (index_name, dimension, num_vectors, last_updated)
                VALUES (?, ?, ?, ?)
                ''', (index_name, dimension, num_vectors, datetime.now().isoformat()))
                index_id = cursor.lastrowid

            conn.commit()
            return index_id

    def get_index_metadata(self, index_name: str) -> Dict[str, Any]:
        """Get vector index metadata."""
        with self.db._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM vector_index WHERE index_name = ?', (index_name,))
            result = cursor.fetchone()
            return dict(result) if result else None


class UserModel:
    """Model for user data."""

    def __init__(self):
        """Initialize the user model."""
        self.db = Database()

    def create_user(self, email: str, password_hash: str, full_name: str, employee_id: str = None) -> int:
        """Create a new user."""
        with self.db._get_connection() as conn:
            cursor = conn.cursor()
            try:
                cursor.execute('''
                INSERT INTO users
                (email, password_hash, full_name, employee_id, created_at)
                VALUES (?, ?, ?, ?, ?)
                ''', (
                    email,
                    password_hash,
                    full_name,
                    employee_id,
                    datetime.now().isoformat()
                ))
                conn.commit()
                return cursor.lastrowid
            except sqlite3.IntegrityError:
                # Email already exists
                logger.warning(f"User with email {email} already exists")
                return None

    def get_user_by_email(self, email: str) -> Dict[str, Any]:
        """Get a user by email."""
        with self.db._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM users WHERE email = ?', (email,))
            result = cursor.fetchone()
            return dict(result) if result else None

    def get_user_by_id(self, user_id: int) -> Dict[str, Any]:
        """Get a user by ID."""
        with self.db._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM users WHERE id = ?', (user_id,))
            result = cursor.fetchone()
            return dict(result) if result else None

    def update_last_login(self, user_id: int) -> bool:
        """Update the last login timestamp for a user."""
        with self.db._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
            UPDATE users
            SET last_login = ?
            WHERE id = ?
            ''', (datetime.now().isoformat(), user_id))
            conn.commit()
            return cursor.rowcount > 0
