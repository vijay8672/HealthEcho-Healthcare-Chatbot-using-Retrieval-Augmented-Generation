from flask import Flask, render_template, request, jsonify
from src.chain.chain_builder import conversation_chain
from src.conversation.save_conversation import save_conversation_history
from logging_module.logger import logger
from langdetect import detect, LangDetectException
from bs4 import BeautifulSoup
import time

app = Flask(__name__)

# Track session history
session_history = {}

def detect_language(text: str) -> str:
    """Detect the language of the input text."""
    try:
        return detect(text)
    except LangDetectException:
        return "en"

def process_query(query: str, device_id: str) -> str:
    """Process a single query and return the response."""
    global session_history
    is_first_message = device_id not in session_history
    session_history[device_id] = True

    language = detect_language(query)
    query_start_time = time.time()

    response = conversation_chain(query, device_id)
    response_content = BeautifulSoup(response.content, "html.parser").get_text() if hasattr(response, 'content') else str(response)

    if not is_first_message:
        response_content = response_content.split("I'm a medical assistant")[-1].strip()

    query_end_time = time.time()

    save_conversation_history(
        user_query=query,
        assistant_response=response_content,
        language=language,
        device_id=device_id,
        query_start_time=query_start_time,
        response_end_time=query_end_time
    )

    return response_content

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/query', methods=['POST'])
def query():
    data = request.json
    user_query = data['query']
    device_id = data['device_id']
    response = process_query(user_query, device_id)
    return jsonify({"response": response})

if __name__ == '__main__':
    app.run(port=5000, debug=True)
