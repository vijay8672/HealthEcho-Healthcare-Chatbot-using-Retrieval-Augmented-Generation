"""
Named Entity Recognition for HR queries.
"""
import spacy
from typing import List, Dict, Any
from pathlib import Path

from ..utils.logger import get_logger
from ..config import DATA_DIR

logger = get_logger(__name__)

class EntityExtractor:
    """Extract named entities from HR queries."""

    # HR-specific entity patterns
    hr_patterns = {
        "POLICY": ["policy", "guideline", "procedure", "rule"],
        "BENEFIT": ["benefit", "insurance", "coverage", "plan"],
        "LEAVE": ["leave", "vacation", "sick", "pto", "time off"],
        "DOCUMENT": ["form", "document", "paperwork", "application"],
        "DEPARTMENT": ["hr", "human resources", "it", "finance"],
        "ROLE": ["employee", "manager", "supervisor", "director"],
        "TIME": ["day", "week", "month", "year", "period"]
    }

    def __init__(self):
        """Initialize the entity extractor."""
        self.model_path = DATA_DIR / "models" / "ner_model"
        self.nlp = self._load_or_create_model()
        
    def _load_or_create_model(self) -> spacy.Language:
        """Load existing model or create a new one."""
        try:
            if self.model_path.exists():
                return spacy.load(self.model_path)
        except Exception as e:
            logger.error(f"Error loading NER model: {e}")
        
        # Load base English model
        nlp = spacy.load("en_core_web_sm")
        
        # Add HR-specific patterns
        ruler = nlp.add_pipe("entity_ruler")
        patterns = []
        
        for label, keywords in self.hr_patterns.items():
            for keyword in keywords:
                patterns.append({"label": label, "pattern": keyword})
                # Add variations
                patterns.append({"label": label, "pattern": [{"LOWER": keyword}]})
                patterns.append({"label": label, "pattern": [{"LEMMA": keyword}]})
        
        ruler.add_patterns(patterns)
        
        # Save the model
        self.model_path.parent.mkdir(exist_ok=True)
        nlp.to_disk(self.model_path)
        
        return nlp

    def extract_entities(self, text: str) -> List[Dict[str, Any]]:
        """
        Extract named entities from text.
        
        Args:
            text: Input text
            
        Returns:
            List of extracted entities with their types and positions
        """
        try:
            doc = self.nlp(text)
            entities = []
            
            for ent in doc.ents:
                entities.append({
                    "text": ent.text,
                    "label": ent.label_,
                    "start": ent.start_char,
                    "end": ent.end_char,
                    "confidence": 0.8  # Default confidence for rule-based entities
                })
            
            # Add HR-specific pattern matches
            for label, keywords in self.hr_patterns.items():
                for keyword in keywords:
                    if keyword in text.lower():
                        # Find all occurrences
                        start = 0
                        while True:
                            start = text.lower().find(keyword, start)
                            if start == -1:
                                break
                            end = start + len(keyword)
                            entities.append({
                                "text": text[start:end],
                                "label": label,
                                "start": start,
                                "end": end,
                                "confidence": 0.9  # Higher confidence for exact matches
                            })
                            start = end
            
            # Sort by start position
            entities.sort(key=lambda x: x["start"])
            
            # Remove overlapping entities (keep the one with higher confidence)
            filtered_entities = []
            for i, ent in enumerate(entities):
                if i == 0 or ent["start"] >= filtered_entities[-1]["end"]:
                    filtered_entities.append(ent)
                elif ent["confidence"] > filtered_entities[-1]["confidence"]:
                    filtered_entities[-1] = ent
            
            return filtered_entities
            
        except Exception as e:
            logger.error(f"Error extracting entities: {e}")
            return []

    def get_entity_context(self, text: str, entity: Dict[str, Any], window_size: int = 50) -> str:
        """
        Get context around an entity.
        
        Args:
            text: Input text
            entity: Entity dictionary
            window_size: Number of characters to include before and after
            
        Returns:
            Context string
        """
        start = max(0, entity["start"] - window_size)
        end = min(len(text), entity["end"] + window_size)
        return text[start:end].strip()

    def update_model(self, text: str, entities: List[Dict[str, Any]]):
        """
        Update the model with new training data.
        
        Args:
            text: Training text
            entities: List of entity annotations
        """
        try:
            # Convert entities to spaCy format
            train_data = [(text, {"entities": [(e["start"], e["end"], e["label"]) for e in entities]})]
            
            # Update the model
            self.nlp.update(train_data)
            
            # Save updated model
            self.nlp.to_disk(self.model_path)
            
            logger.info(f"Updated NER model with new training data")
            
        except Exception as e:
            logger.error(f"Error updating NER model: {e}") 