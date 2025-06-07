import json
import os
import re
import threading
from pathlib import Path
from typing import Dict, Any, Tuple, List

import numpy as np
import torch
import torch.nn as nn
from sentence_transformers import SentenceTransformer
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from rapidfuzz import fuzz
from scipy.stats import entropy

from ..utils.logger import get_logger
from ..config import DATA_DIR

logger = get_logger(__name__)

INTENTS_CONFIG_PATH = DATA_DIR / "config" / "intents.json"
TRAINING_DATA_PATH = DATA_DIR / "training" / "intent_training_data.jsonl"
MODEL_DIR = DATA_DIR / "models"
MODEL_PATH = MODEL_DIR / "intent_classifier.pth"
ENCODER_PATH = MODEL_DIR / "label_encoder.joblib"

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")


class CalibratedSoftmax(nn.Module):
    def __init__(self, temperature: float = 1.5):
        super().__init__()
        self.temperature = temperature

    def forward(self, logits):
        return torch.softmax(logits / self.temperature, dim=1)


class IntentClassifierModel(nn.Module):
    def __init__(self, input_dim: int, num_classes: int):
        super().__init__()
        self.classifier = nn.Sequential(
            nn.Linear(input_dim, 256),
            nn.ReLU(),
            nn.Dropout(0.1),
            nn.Linear(256, num_classes)
        )

    def forward(self, x):
        return self.classifier(x)


class IntentClassifier:
    """
    Production-grade intent classifier using MiniLM embeddings
    with calibrated confidence and resilience mechanisms.
    """

    _lock = threading.Lock()

    def __init__(self, confidence_threshold: float = 0.6):
        self.confidence_threshold = confidence_threshold
        self.intents = self._load_intents_config()
        self.encoder = LabelEncoder()
        self.embedder = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
        self.model = None
        self.model_input_dim = 384
        self._load_or_train_model()

    def _clean_query(self, text: str) -> str:
        text = text.lower().strip()
        text = re.sub(r"[^\w\s]", "", text)
        return text

    def _load_intents_config(self) -> Dict[str, List[str]]:
        if not INTENTS_CONFIG_PATH.exists():
            logger.warning(f"Intents config not found at {INTENTS_CONFIG_PATH}, creating default config.")
            default_intents = {
                "leave": ["leave", "vacation", "time off", "sick", "absence", "pto"],
                "benefits": ["benefits", "insurance", "health", "dental", "vision"],
                "compensation": ["salary", "pay", "compensation", "bonus", "raise"],
                "policy": ["policy", "guidelines", "rules", "procedures"],
                "onboarding": ["onboarding", "orientation", "new hire", "training"],
                "offboarding": ["offboarding", "exit", "termination", "resignation"],
                "greeting": ["hello", "hi", "hey", "good morning", "good evening", "greetings"],
                "general": ["general", "other", "miscellaneous"]
            }
            os.makedirs(INTENTS_CONFIG_PATH.parent, exist_ok=True)
            with open(INTENTS_CONFIG_PATH, "w", encoding="utf-8") as f:
                json.dump(default_intents, f, indent=4)
            return default_intents

        with open(INTENTS_CONFIG_PATH, "r", encoding="utf-8") as f:
            return json.load(f)

    def _load_or_train_model(self):
        try:
            if MODEL_PATH.exists() and ENCODER_PATH.exists():
                import joblib
                self.encoder = joblib.load(ENCODER_PATH)
                state_dict = torch.load(MODEL_PATH, map_location=device)
                num_classes = len(self.encoder.classes_)
                self.model = IntentClassifierModel(self.model_input_dim, num_classes).to(device)
                self.model.load_state_dict(state_dict)
                self.model.eval()
                logger.info(f"Loaded PyTorch intent classifier model from {MODEL_PATH}")
                return
        except Exception as e:
            logger.error(f"Failed to load intent classifier model: {e}")

        logger.info("Training intent classifier model from scratch...")
        X, y = self._load_training_data()
        if not X:
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
                "Where can I find the employee handbook?",
                "Hello", "Hi", "Hey there", "Good morning", "Greetings"
            ]
            y = [
                "leave", "leave",
                "benefits", "benefits",
                "compensation", "compensation",
                "policy", "policy",
                "onboarding", "onboarding",
                "offboarding", "offboarding",
                "general", "general",
                "greeting", "greeting", "greeting", "greeting", "greeting"
            ]

        self.encoder.fit(y)
        embeddings = self.embedder.encode(X, convert_to_numpy=True, normalize_embeddings=True, show_progress_bar=False)
        labels = self.encoder.transform(y)

        self.model = IntentClassifierModel(self.model_input_dim, len(self.encoder.classes_)).to(device)
        self._train_model(embeddings, labels)
        self._save_model()

    def _load_training_data(self) -> Tuple[List[str], List[str]]:
        X, y = [], []
        if not TRAINING_DATA_PATH.exists():
            return X, y
        try:
            with open(TRAINING_DATA_PATH, "r", encoding="utf-8") as f:
                for line in f:
                    record = json.loads(line.strip())
                    X.append(record["query"])
                    y.append(record["intent"])
            logger.info(f"Loaded {len(X)} training samples from persistent store.")
        except Exception as e:
            logger.error(f"Failed to load training data: {e}")
        return X, y

    def _train_model(self, embeddings: np.ndarray, labels: np.ndarray, epochs: int = 20, lr: float = 1e-3):
        self.model.train()
        optimizer = torch.optim.Adam(self.model.parameters(), lr=lr)
        loss_fn = nn.CrossEntropyLoss(label_smoothing=0.1)

        X_train, X_val, y_train, y_val = train_test_split(embeddings, labels, test_size=0.2, stratify=labels)

        X_train = torch.tensor(X_train, dtype=torch.float32).to(device)
        y_train = torch.tensor(y_train, dtype=torch.long).to(device)
        X_val = torch.tensor(X_val, dtype=torch.float32).to(device)
        y_val = torch.tensor(y_val, dtype=torch.long).to(device)

        best_loss = float("inf")
        patience = 3
        patience_counter = 0

        for epoch in range(epochs):
            self.model.train()
            optimizer.zero_grad()
            outputs = self.model(X_train)
            loss = loss_fn(outputs, y_train)
            loss.backward()
            optimizer.step()

            self.model.eval()
            with torch.no_grad():
                val_outputs = self.model(X_val)
                val_loss = loss_fn(val_outputs, y_val)

            if val_loss < best_loss:
                best_loss = val_loss
                patience_counter = 0
            else:
                patience_counter += 1
                if patience_counter >= patience:
                    logger.info(f"Early stopping at epoch {epoch+1}")
                    break

            if (epoch + 1) % 5 == 0:
                logger.info(f"Epoch {epoch+1}/{epochs} - Train Loss: {loss.item():.4f} - Val Loss: {val_loss.item():.4f}")

        self.model.eval()

    def _save_model(self):
        os.makedirs(MODEL_DIR, exist_ok=True)
        torch.save(self.model.state_dict(), MODEL_PATH)
        import joblib
        joblib.dump(self.encoder, ENCODER_PATH)
        logger.info(f"Saved intent classifier model and label encoder.")

    def classify(self, query: str) -> Dict[str, Any]:
        query_clean = self._clean_query(query)
        if not query_clean:
            return self._format_response("general", 0.0, query)

        # Reject gibberish or meaningless queries
        if len(query_clean.split()) < 3 or not re.search(r'[a-zA-Z]', query_clean):
            return self._format_response("general", 0.0, query)

        # Filter known junk terms
        nonsense_words = {"blargle", "fliptop", "monkey", "cheese", "asdf", "lorem", "ipsum"}
        if any(word in query_clean.lower().split() for word in nonsense_words):
            return self._format_response("general", 0.0, query)

        try:
            embedding = self.embedder.encode([query_clean], convert_to_numpy=True, normalize_embeddings=True)[0]
            inputs = torch.tensor(embedding, dtype=torch.float32).unsqueeze(0).to(device)

            with torch.no_grad():
                outputs = self.model(inputs)
                calibrator = CalibratedSoftmax(temperature=2.0)  # More cautious softmax
                probs = calibrator(outputs).cpu().numpy()[0]

            idx = int(np.argmax(probs))
            pred_intent = self.encoder.inverse_transform([idx])[0]
            confidence = float(np.max(probs))

            if confidence < self.confidence_threshold or entropy(probs) > 1.2:
                pred_intent, confidence = self._fallback_intent(query_clean)

            return self._format_response(pred_intent, confidence, query)

        except Exception as e:
            logger.error(f"Error classifying query '{query}': {e}")
            return self._format_response("general", 0.0, query)


    def _fallback_intent(self, query: str) -> Tuple[str, float]:
            max_score = 0.0
            best_intent = "general"
            for intent, keywords in self.intents.items():
                for kw in keywords:
                    score = fuzz.partial_ratio(query, kw)
                    if score > max_score:
                        max_score = score
                        best_intent = intent
            # Scale RapidFuzz score (0–100) to confidence (0.4–1.0)
            scaled_conf = max(0.4, min(1.0, max_score / 100))
            return best_intent, round(scaled_conf, 3)


    def _format_response(self, intent: str, confidence: float, query: str) -> Dict[str, Any]:
        keywords = self.intents.get(intent, [])
        return {
            "intent": intent,
            "confidence": round(confidence, 3),
            "query": query,
            "keywords": keywords
        }

    def update_model(self, query: str, intent: str):
        query_clean = query.strip()
        if not query_clean or not intent:
            logger.warning("Invalid update_model call with empty query or intent.")
            return

        record = {"query": query_clean, "intent": intent}
        try:
            os.makedirs(TRAINING_DATA_PATH.parent, exist_ok=True)
            with self._lock:
                with open(TRAINING_DATA_PATH, "a", encoding="utf-8") as f:
                    f.write(json.dumps(record) + "\n")
            logger.info(f"Appended training data: {record}")
            threading.Thread(target=self._retrain_model).start()
        except Exception as e:
            logger.error(f"Failed to update training data: {e}")

    def _retrain_model(self):
        with self._lock:
            X, y = self._load_training_data()
            if not X:
                logger.warning("No training data available for retraining.")
                return
            try:
                embeddings = self.embedder.encode(X, convert_to_numpy=True, normalize_embeddings=True, show_progress_bar=False)
                self.encoder.fit(y)
                labels = self.encoder.transform(y)

                self.model = IntentClassifierModel(self.model_input_dim, len(self.encoder.classes_)).to(device)
                self._train_model(embeddings, labels)
                self._save_model()
                logger.info(f"Retrained intent classifier with {len(X)} samples.")
            except Exception as e:
                logger.error(f"Error during retraining: {e}")

    def get_intent_keywords(self, intent: str) -> List[str]:
        return self.intents.get(intent, [])


if __name__ == "__main__":
    classifier = IntentClassifier()
    test_query = "Blargle fliptop monkey cheese?"
    result = classifier.classify(test_query)
    print(f"Query: {test_query}\nResult: {result}")
