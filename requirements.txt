from flask import Flask, request, Response, render_template_string
import requests

app = Flask(__name__)

# ১. হোম পেজে index.html দেখানোর জন্য
@app.route('/')
def home():
    try:
        with open('index.html', 'r', encoding='utf-8') as f:
            return f.read()
    except Exception as e:
        return "index.html file not found!", 404

# ২. ওয়েবসাইট ফ্রেমে লোড করার জন্য Proxy Route
@app.route('/proxy')
def proxy():
    target_url = request.args.get('url')
    if not target_url:
        return "URL parameter missing", 400

    try:
        # ওয়েবসাইট থেকে ডাটা নিয়ে আসা
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        resp = requests.get(target_url, headers=headers, timeout=10)

        # রেসপন্স তৈরি করা
        excluded_headers = ['content-encoding', 'content-length', 'transfer-encoding', 'connection', 'x-frame-options', 'content-security-policy']
        response_headers = [(name, value) for (name, value) in resp.raw.headers.items()
                            if name.lower() not in excluded_headers]

        response = Response(resp.content, resp.status_code, response_headers)
        
        # iframe ব্লককারী সিকিউরিটি তুলে দেওয়া
        response.headers['Access-Control-Allow-Origin'] = '*'
        return response

    except Exception as e:
        return f"Error fetching page: {str(e)}", 500

# ৩. Nilo AI-এর ব্যাকএন্ড API Route
@app.route('/api/ai', methods=['POST'])
def ai_backend():
    data = request.get_json() or {}
    user_query = data.get('query', '')
    return {"reply": f"Nilo AI (Python Engine) received: {user_query}"}

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
