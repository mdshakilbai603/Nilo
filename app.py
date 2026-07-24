from flask import Flask, request, Response, jsonify
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, quote, unquote

app = Flask(__name__)

# Real Chrome Browser User-Agent Header
REAL_BROWSER_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Sec-Ch-Ua': '"Not/A)Brand";v="8", "Chromium";v="126", "Google Chrome";v="126"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"'
}

# ১. হোম পেজে index.html দেখানোর জন্য
@app.route('/')
def home():
    try:
        with open('index.html', 'r', encoding='utf-8') as f:
            return f.read()
    except Exception as e:
        return "<h3>index.html file not found! Make sure it is in the same directory.</h3>", 404

# ২. ওয়েবসাইট ফ্রেমে লোড করার জন্য প্রক্সি ও লিঙক রিরাইটার
@app.route('/proxy')
def proxy():
    target_url = request.args.get('url')
    if not target_url:
        return "URL parameter missing", 400

    target_url = unquote(target_url)

    try:
        # টার্গেট ওয়েবসাইট থেকে ডাটা ফেচ করা
        resp = requests.get(target_url, headers=REAL_BROWSER_HEADERS, timeout=12, stream=True)
        content_type = resp.headers.get('Content-Type', '')

        # HTML কন্টেন্ট হলে লিঙ্ক রিরাইট করা
        if 'text/html' in content_type:
            soup = BeautifulSoup(resp.text, 'html.parser')

            # <a> ট্যাগের সকল লিঙ্ক প্রক্সির মাধ্যমে ঘুরিয়ে দেওয়া
            for tag in soup.find_all('a', href=True):
                absolute_url = urljoin(target_url, tag['href'])
                tag['href'] = f"/proxy?url={quote(absolute_url)}"

            # <img>, <script>, <link> ইত্যাদির রিলেটিভ পাথ ঠিক করা
            for tag in soup.find_all(['img', 'script', 'link'], src=True):
                tag['src'] = urljoin(target_url, tag['src'])
            
            for tag in soup.find_all('link', href=True):
                tag['href'] = urljoin(target_url, tag['href'])

            output_content = str(soup)
        else:
            output_content = resp.content

        # সিকিউরিটি হেডার মুছে ফেলা
        excluded_headers = [
            'content-encoding', 'content-length', 'transfer-encoding', 
            'connection', 'x-frame-options', 'content-security-policy',
            'strict-transport-security'
        ]
        response_headers = [
            (name, value) for (name, value) in resp.raw.headers.items()
            if name.lower() not in excluded_headers
        ]

        response = Response(output_content, resp.status_code, response_headers)
        
        # Cross-Origin Permission সেট করা
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = '*'
        
        return response

    except Exception as e:
        return f"<div style='color:red; font-family:sans-serif; padding:20px;'><h2>Error loading URL through proxy</h2><p>{str(e)}</p></div>", 500

# ৩. Nilo AI-এর ব্যাকএন্ড API Route (Python)
@app.route('/api/ai', methods=['POST', 'OPTIONS'])
def ai_backend():
    if request.method == 'OPTIONS':
        return Response(status=200, headers={'Access-Control-Allow-Origin': '*'})

    data = request.get_json() or {}
    user_query = data.get('query', '')
    return jsonify({"reply": f"Nilo AI (Python Engine) processed query: '{user_query}' successfully."})

# ৪. Node.js Fallback Route (যদি index.html থেকে Node.js বেছে নেওয়া হয়)
@app.route('/api/node', methods=['POST', 'OPTIONS'])
def node_fallback():
    if request.method == 'OPTIONS':
        return Response(status=200, headers={'Access-Control-Allow-Origin': '*'})

    data = request.get_json() or {}
    user_query = data.get('query', '')
    return jsonify({"reply": f"Nilo Engine (Render Python Mirror): '{user_query}'"})

if __name__ == '__main__':
    # BeautifulSoup ও Requests ডিপেন্ডেন্সি নিশ্চিত করার বার্তা
    print("Nilo Browser Engine Running on http://localhost:5000")
    app.run(host='0.0.0.0', port=5000, debug=True)
