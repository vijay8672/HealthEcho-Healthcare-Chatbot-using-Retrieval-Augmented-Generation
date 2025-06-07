import os
import re
import time
import asyncio
import traceback
from typing import List, Dict, Any
from langchain_groq import ChatGroq
from langchain.schema import HumanMessage, AIMessage

from ..utils.logger import get_logger
from ..retrieval.context_builder import ContextBuilder
from ..conversation.history_manager import HistoryManager
from ..conversation.language_detector import detect_language
from .prompt_templates import create_hr_assistant_prompt
from ..config import (
    GROQ_API_KEY, LLM_MODEL_NAME, HR_EMAILS, ENABLE_EMAIL_ESCALATION,
    INTENT_CLASSIFIER_CONFIDENCE_THRESHOLD
)
from ..utils.api_status import api_status_checker
from ..utils.email_service import EmailService
from ..intent.intent_classifier import IntentClassifier
from ..ner.entity_extractor import EntityExtractor
from ..cache.redis_cache import RedisCache
from ..document_processing.version_control import DocumentVersionControl

logger = get_logger(__name__)

GREETING_KEYWORDS = ["hi", "hello", "hey", "good morning", "good afternoon", "good evening", "howdy"]

def is_pure_greeting(text: str) -> bool:
    return any(re.fullmatch(rf"(?i){kw}[!. ]*", text.strip()) for kw in GREETING_KEYWORDS)

def sanitize_input(text: str) -> str:
    return re.sub(r"[\n\r\t]+", " ", text.strip())

def contains_sensitive_info(text: str) -> bool:
    return bool(re.search(r"(pan|aadhaar|salary|bank account|ifsc|dob|ssn|passport)", text, re.IGNORECASE))


class ChainBuilder:
    def __init__(self, model_name=LLM_MODEL_NAME, api_key=GROQ_API_KEY,
                 context_builder=None, history_manager=None, email_service=None):

        if not api_key:
            raise ValueError("GROQ_API_KEY is required but not set")
        if not model_name:
            raise ValueError("LLM_MODEL_NAME is required but not set")

        logger.info(f"Initializing ChainBuilder with model: {model_name}")

        self.model_name = model_name
        self.api_key = api_key
        self.context_builder = context_builder or ContextBuilder()
        self.history_manager = history_manager or HistoryManager()
        self.email_service = email_service or EmailService()
        self.intent_classifier = IntentClassifier()
        self.entity_extractor = EntityExtractor()
        self.redis_cache = RedisCache()
        self.version_control = DocumentVersionControl()
        self.hr_emails = HR_EMAILS
        self.enable_email_escalation = ENABLE_EMAIL_ESCALATION

        self.llm = ChatGroq(
            model=model_name,
            groq_api_key=api_key,
            max_tokens=800,
            temperature=0.1,
            timeout=60,
            model_kwargs={
                "top_p": 0.9,
                "frequency_penalty": 0.2,
                "presence_penalty": 0.6,
            },
        )

    def format_response(self, text: str) -> str:
        if not text.strip():
            return "I'm sorry, I couldn't find a helpful response."

        paragraphs = text.split("\n\n")
        formatted = []

        for para in paragraphs:
            lines = para.splitlines()
            if any(para.lower().startswith(k.lower()) for k in ["What is", "Causes of", "Symptoms of", "Types of", "Prevention of"]):
                formatted.append(f"### {para}")
            elif all(line.strip().startswith(("-", "*")) for line in lines if line.strip()):
                formatted.extend([line.strip() for line in lines])
            elif all(line.strip()[:2].isdigit() and line.strip()[2] == '.' for line in lines if line.strip()):
                formatted.extend(lines)
            else:
                formatted.append(para)

        return "\n\n".join(formatted)

    async def run_chain(self, query: str, device_id: str, files_info: List[Dict[str, Any]] = None, retry_count: int = 0) -> Dict[str, Any]:
        logger.debug(f"[run_chain] Started for query: '{query}', device_id: {device_id}")
        try:
            query = sanitize_input(query)
            logger.debug(f"[run_chain] Sanitized query: '{query}'")

            if cached := self.redis_cache.get_cached_query_sync(query):
                logger.debug("[run_chain] Returning cached response.")
                return cached
            logger.debug("[run_chain] No cached response found.")

            if not api_status_checker.is_groq_operational():
                logger.warning("[run_chain] Groq API is not operational.")
                return {
                    "content": "The language model service is currently unavailable. Please try again later.",
                    "language": "en",
                    "sources": [],
                    "error": {"type": "ServiceUnavailable"}
                }
            logger.debug("[run_chain] Groq API is operational.")

            language = detect_language(query)
            logger.debug(f"[run_chain] Detected language: {language}")

            try:
                intent, confidence = self.intent_classifier.classify(query)
                logger.debug(f"[run_chain] Intent classified: {intent}, confidence: {confidence}")
            except Exception as e:
                logger.warning(f"[run_chain] Intent classification failed: {e}")
                intent, confidence = "unknown", 0.0

            if is_pure_greeting(query) and confidence < INTENT_CLASSIFIER_CONFIDENCE_THRESHOLD:
                logger.debug("[run_chain] Pure greeting detected, returning canned response.")
                return {
                    "content": "Hello! How can I assist you with HR-related matters today?",
                    "language": language,
                    "sources": [],
                    "intent": "greeting",
                    "intent_confidence": 1.0,
                    "entities": []
                }

            if contains_sensitive_info(query):
                logger.warning("[run_chain] Sensitive information detected in user input.")

            try:
                entities = self.entity_extractor.extract_entities(query)
                logger.debug(f"[run_chain] Extracted entities: {entities}")
            except Exception as e:
                logger.warning(f"[run_chain] Entity extraction failed: {e}")
                entities = []

            if files_info:
                logger.debug(f"[run_chain] Processing files: {files_info}")
                for file in files_info:
                    path = file.get("path")
                    if path and self.version_control.check_version(path):
                        self.version_control.reindex_document(path)
                        logger.debug(f"[run_chain] Reindexed document: {path}")

            try:
                history_items = self.history_manager.get_history(device_id)[-5:]
                history_msgs = [
                    item for h in history_items
                    for item in [HumanMessage(content=f"User: {h['user_query']}"), AIMessage(content=h['assistant_response'])]
                ]
                logger.debug(f"[run_chain] Retrieved history items: {len(history_items)}")
            except Exception as e:
                logger.warning(f"[run_chain] History retrieval failed: {e}")
                history_msgs = []

            try:
                context_result = await self.context_builder.build_context(query, max_tokens=1500, files_info=files_info)
                context = context_result.get("context", "")
                sources = context_result.get("sources", [])
                logger.debug(f"[run_chain] Context built. Sources: {sources}")
            except Exception as e:
                logger.warning(f"[run_chain] Context building failed: {e}")
                context, sources = "", []

            try:
                prompt_template = create_hr_assistant_prompt(language=language)
                prompt = prompt_template.format_messages(context=context, query=query, history=history_msgs)
                logger.debug("[run_chain] Prompt created.")
            except Exception as e:
                logger.error(f"[run_chain] Prompt creation failed: {e}")
                return await self._error("PromptCreationError", e, retry_count)

            try:
                start = time.time()
                response = await asyncio.to_thread(self.llm.invoke, prompt)
                elapsed = time.time() - start
                raw_response = getattr(response, "content", str(response)).strip()
                logger.debug(f"[run_chain] LLM invoked. Raw response length: {len(raw_response)}")
            except Exception as e:
                logger.error(f"[run_chain] LLM invocation failed: {e}")
                if retry_count < 2:
                    logger.warning(f"[run_chain] Retrying LLM invocation ({retry_count + 1}/2).")
                    await asyncio.sleep(2 ** retry_count)
                    return await self.run_chain(query, device_id, files_info, retry_count + 1)
                return await self._error(type(e).__name__, e, retry_count)

            needs_escalation = "[ESCALATE_TO_HR]" in raw_response
            if needs_escalation:
                logger.debug("[run_chain] Escalation tag detected.")
                raw_response = raw_response.replace("[ESCALATE_TO_HR]", "").strip()
                if self.enable_email_escalation and self.hr_emails:
                    raw_response += "\n\n**Would you like me to escalate this to HR?**"

            try:
                formatted_response = self.format_response(raw_response)
                logger.debug(f"[run_chain] Response formatted. Length: {len(formatted_response)}")
            except Exception as e:
                logger.warning(f"[run_chain] Response formatting failed: {e}")
                formatted_response = raw_response

            result = {
                "content": formatted_response,
                "language": language,
                "sources": sources,
                "response_time": elapsed,
                "escalated": needs_escalation,
                "intent": intent,
                "intent_confidence": confidence,
                "entities": entities
            }
            logger.debug(f"[run_chain] Final result prepared: {result.keys()}")

            self.redis_cache.cache_query_sync(query, result)

            logger.debug("[run_chain] Returning final result.")
            return result

        except Exception as e:
            logger.error(f"[run_chain] Unhandled exception in run_chain: {e}")
            return await self._error(type(e).__name__, e, retry_count)

    async def _error(self, error_type: str, error: Exception, retry: int = 0) -> Dict[str, Any]:
        logger.error(f"{error_type}: {error}")
        trace = traceback.format_exc()

        message_map = {
            "timeout": "The request timed out. Please try again.",
            "api key": "Invalid API key provided. Please check your configuration.",
            "rate limit": "Rate limit exceeded. Please try again shortly.",
            "context length": "The input is too long. Please shorten your query."
        }

        friendly_msg = "I'm sorry, something went wrong. Please try again."
        for keyword, msg in message_map.items():
            if keyword in str(error).lower():
                friendly_msg = msg
                break

        return {
            "content": friendly_msg,
            "language": "en",
            "sources": [],
            "error": {
                "type": error_type,
                "message": str(error),
                "traceback": trace,
                "retry_attempted": retry > 0
            }
        }
