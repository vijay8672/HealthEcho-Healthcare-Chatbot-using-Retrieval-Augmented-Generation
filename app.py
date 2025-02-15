from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from markdown import markdown  # Convert Markdown to HTML
from src.chatbot_code.chatbot import process_query

app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/query', methods=['POST'])
def chat():
    data = request.get_json()
    user_query = data.get('query')
    device_id = data.get('device_id')

    if not user_query or not device_id:
        return jsonify({"error": "Invalid input"}), 400

    try:
        response = process_query(user_query, device_id)
        html_response = markdown(response)
        return jsonify({"response": html_response}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
