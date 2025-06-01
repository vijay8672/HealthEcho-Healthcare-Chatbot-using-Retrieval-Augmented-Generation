"""
Intent classification for HR queries.
"""
import numpy as np
from typing import Dict, Any, Tuple
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline
import joblib
import os
from pathlib import Path

from ..utils.logger import get_logger
from ..config import DATA_DIR

logger = get_logger(__name__)

class IntentClassifier:
    """Classify user queries into HR-related intents."""

    def __init__(self):
        """Initialize the intent classifier."""
        self.model_path = DATA_DIR / "models" / "intent_classifier.joblib"
        self.confidence_threshold = 0.6
        self.intents = {
            "leave": ["leave", "vacation", "time off", "sick", "absence", "pto"],
            "benefits": ["benefits", "insurance", "health", "dental", "vision"],
            "compensation": ["salary", "pay", "compensation", "bonus", "raise"],
            "policy": ["policy", "guidelines", "rules", "procedures"],
            "onboarding": ["onboarding", "orientation", "new hire", "training"],
            "offboarding": ["offboarding", "exit", "termination", "resignation"],
            "general": ["general", "other", "miscellaneous"]
        }
        
        # Initialize or load the model
        self.model = self._load_or_create_model()

    def _load_or_create_model(self) -> Pipeline:
        """Load existing model or create a new one."""
        if self.model_path.exists():
            try:
                return joblib.load(self.model_path)
            except Exception as e:
                logger.error(f"Error loading model: {e}")
        
        # Create new model
        model = Pipeline([
            ('tfidf', TfidfVectorizer(max_features=1000)),
            ('clf', MultinomialNB())
        ])
        
        # Train with initial data
        self._train_initial_model(model)
        return model

    def _train_initial_model(self, model: Pipeline):
        """Train the model with initial data."""
        # Initial training data
        X = [
            "How do I apply for vacation leave?",
            "What is the process for sick leave?",
            "Tell me about health insurance benefits",
            "What dental coverage do we have?",
            "When is the next salary review?",
            "How do I request a raise?",
            "What is the dress code policy?",
            "Can you explain the remote work policy?",
            "What is the onboarding process?",
            "How do I complete new hire paperwork?",
            "What is the exit interview process?",
            "How do I submit my resignation?",
            "What are the general office hours?",
            "Where can I find the employee handbook?"
        ]
        
        y = [
            "leave", "leave",
            "benefits", "benefits",
            "compensation", "compensation",
            "policy", "policy",
            "onboarding", "onboarding",
            "offboarding", "offboarding",
            "general", "general"
        ]
        
        model.fit(X, y)
        
        # Save the model
        os.makedirs(self.model_path.parent, exist_ok=True)
        joblib.dump(model, self.model_path)

    def classify(self, query: str) -> Tuple[str, float]:
        """
        Classify a query into an intent.
        
        Args:
            query: User query text
            
        Returns:
            Tuple of (intent, confidence)
        """
        try:
            # Get model prediction
            intent = self.model.predict([query])[0]
            confidence = np.max(self.model.predict_proba([query]))
            
            # If confidence is below threshold, use rule-based fallback
            if confidence < self.confidence_threshold:
                # Check for keywords in each intent
                for intent_name, keywords in self.intents.items():
                    if any(keyword in query.lower() for keyword in keywords):
                        return intent_name, 0.8  # Higher confidence for keyword match
            
            return intent, confidence
            
        except Exception as e:
            logger.error(f"Error classifying intent: {e}")
            return "general", 0.0

    def get_intent_keywords(self, intent: str) -> list:
        """Get keywords for a specific intent."""
        return self.intents.get(intent, [])

    def update_model(self, query: str, intent: str):
        """
        Update the model with new training data.
        
        Args:
            query: User query
            intent: Correct intent label
        """
        try:
            # Get current training data
            X = self.model.named_steps['tfidf'].get_feature_names_out()
            y = self.model.named_steps['clf'].classes_
            
            # Add new data
            X = np.append(X, [query])
            y = np.append(y, [intent])
            
            # Retrain model
            self.model.fit(X, y)
            
            # Save updated model
            joblib.dump(self.model, self.model_path)
            
            logger.info(f"Updated model with new training data: {query} -> {intent}")
            
        except Exception as e:
            logger.error(f"Error updating model: {e}") 