"""
Authentication service for the Advanced RAG Chatbot.
"""
import hashlib
import os
import secrets
import jwt
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

from ..utils.logger import get_logger
from ..database.models import UserModel

logger = get_logger(__name__)

# JWT settings
JWT_SECRET = os.environ.get('JWT_SECRET', secrets.token_hex(32))
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24


class AuthService:
    """Authentication service."""
    
    def __init__(self):
        """Initialize the authentication service."""
        self.user_model = UserModel()
    
    def hash_password(self, password: str) -> str:
        """
        Hash a password using SHA-256 with a random salt.
        
        Args:
            password: The password to hash
            
        Returns:
            The hashed password in the format 'salt:hash'
        """
        salt = secrets.token_hex(16)
        password_hash = hashlib.sha256((password + salt).encode()).hexdigest()
        return f"{salt}:{password_hash}"
    
    def verify_password(self, stored_password: str, provided_password: str) -> bool:
        """
        Verify a password against a stored hash.
        
        Args:
            stored_password: The stored password hash in the format 'salt:hash'
            provided_password: The password to verify
            
        Returns:
            True if the password is correct, False otherwise
        """
        try:
            salt, stored_hash = stored_password.split(':')
            password_hash = hashlib.sha256((provided_password + salt).encode()).hexdigest()
            return password_hash == stored_hash
        except Exception as e:
            logger.error(f"Error verifying password: {e}")
            return False
    
    def register_user(self, email: str, password: str, full_name: str, company_name: str = None) -> Dict[str, Any]:
        """
        Register a new user.
        
        Args:
            email: User's email address
            password: User's password
            full_name: User's full name
            company_name: User's company name (optional)
            
        Returns:
            A dictionary with the result of the registration
        """
        try:
            # Check if user already exists
            existing_user = self.user_model.get_user_by_email(email)
            if existing_user:
                return {
                    "success": False,
                    "message": "User with this email already exists"
                }
            
            # Hash the password
            password_hash = self.hash_password(password)
            
            # Create the user
            user_id = self.user_model.create_user(
                email=email,
                password_hash=password_hash,
                full_name=full_name,
                company_name=company_name
            )
            
            if user_id:
                return {
                    "success": True,
                    "message": "User registered successfully",
                    "user_id": user_id
                }
            else:
                return {
                    "success": False,
                    "message": "Failed to register user"
                }
        except Exception as e:
            logger.error(f"Error registering user: {e}")
            return {
                "success": False,
                "message": f"An error occurred: {str(e)}"
            }
    
    def login_user(self, email: str, password: str) -> Dict[str, Any]:
        """
        Authenticate a user.
        
        Args:
            email: User's email address
            password: User's password
            
        Returns:
            A dictionary with the result of the authentication
        """
        try:
            # Get the user
            user = self.user_model.get_user_by_email(email)
            if not user:
                return {
                    "success": False,
                    "message": "Invalid email or password"
                }
            
            # Verify the password
            if not self.verify_password(user['password_hash'], password):
                return {
                    "success": False,
                    "message": "Invalid email or password"
                }
            
            # Update last login
            self.user_model.update_last_login(user['id'])
            
            # Generate JWT token
            token = self.generate_token(user)
            
            return {
                "success": True,
                "message": "Login successful",
                "token": token,
                "user": {
                    "id": user['id'],
                    "email": user['email'],
                    "full_name": user['full_name'],
                    "company_name": user['company_name']
                }
            }
        except Exception as e:
            logger.error(f"Error logging in user: {e}")
            return {
                "success": False,
                "message": f"An error occurred: {str(e)}"
            }
    
    def generate_token(self, user: Dict[str, Any]) -> str:
        """
        Generate a JWT token for a user.
        
        Args:
            user: User data
            
        Returns:
            JWT token
        """
        payload = {
            'user_id': user['id'],
            'email': user['email'],
            'exp': datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
        }
        return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    
    def verify_token(self, token: str) -> Optional[Dict[str, Any]]:
        """
        Verify a JWT token.
        
        Args:
            token: JWT token
            
        Returns:
            User data if token is valid, None otherwise
        """
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            user_id = payload.get('user_id')
            if user_id:
                user = self.user_model.get_user_by_id(user_id)
                return user
            return None
        except jwt.PyJWTError as e:
            logger.error(f"Error verifying token: {e}")
            return None
