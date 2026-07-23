from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
# ফ্রন্টএন্ড থেকে API কলে Cross-Origin যাতে ব্লক না হয় তার জন্য CORS চালু করা হলো
CORS(app)

@app.route('/api/ai', methods=['POST'])
def ai_service():
    try:
        data = request.get_json()
        user_query = data.get('query', '')

        # এখানে চাইলে যেকোনো Open-Source AI Model (যেমন: Ollama, HuggingFace Transformers) যুক্ত করতে পারেন
        response_text = f"Python (Flask) Backend Response for: '{user_query}'"

        return jsonify({"reply": response_text}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print("Python Open-Source Backend running at http://localhost:5000")
    app.run(host='0.0.0.0', port=5000, debug=True)
