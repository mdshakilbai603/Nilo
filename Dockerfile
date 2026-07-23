# Base Image: Python ও Node.js দুটি পরিবেশ তৈরি করতে Debian-based Python ইমেজ নেওয়া হচ্ছে
FROM python:3.10-slim

# Node.js ইনস্টল করার জন্য ডিপেন্ডেন্সি ও Node.js সেটআপ
RUN apt-get update && apt-get install -y \
    curl \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# ওয়ার্কিং ডিরেক্টরি সেটআপ
WORKDIR /app

# প্রজেক্টের সব ফাইল কপি করা
COPY . .

# Python নির্ভরতা ইনস্টল (Flask, Flask-CORS)
RUN pip install --no-cache-dir flask flask-cors

# Node.js নির্ভরতা ইনস্টল (Express, CORS)
RUN npm install express cors

# পোর্ট এক্সপোজ (Render ডিফল্ট পোর্ট ১০০০০ বা সার্ভিস পোর্ট ব্যবহার করে)
EXPOSE 3000 5000

# এক সাথে Node.js এবং Python দুটোই রান করানোর নির্দেশ
CMD node server.js & python app.py
