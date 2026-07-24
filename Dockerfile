# ১. Base image: Python 3.11 এবং Node.js 18 সাপোর্ট
FROM nikolaik/python-nodejs:python3.11-nodejs18-slim

# ২. Working directory সেট করা
WORKDIR /app

# ৩. আগে ডিপেন্ডেন্সি ফাইলগুলো কপি করা (Fast Docker Caching-এর জন্য)
COPY package*.json requirements.txt ./

# ৪. Python প্যাকেজ ইনস্টল (flask, requests, beautifulsoup4, gunicorn ইত্যাদি)
RUN pip install --no-cache-dir -r requirements.txt

# ৫. Node.js প্যাকেজ ইনস্টল (express, axios, cheerio, cors ইত্যাদি)
RUN npm ci --only=production || npm install

# ৬. প্রজেক্টের বাকি সকল ফাইল কপি করা
COPY . .

# ৭. পোর্ট এক্সপোজ করা (Render-এর জন্য default 10000)
EXPOSE 10000

# ৮. Production Environment Variables
ENV PORT=10000
ENV NODE_ENV=production

# ৯. অ্যাপ চালুর কমান্ড (Node.js Engine - server.js)
CMD ["node", "server.js"]
