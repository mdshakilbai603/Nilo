# Base image হিসেবে Python ও Node.js দুটি সাপোর্ট করে এমন ইমেজ ব্যবহার করা হচ্ছে
FROM nikolaik/python-nodejs:python3.11-nodejs18-slim

# Working directory সেট করা
WORKDIR /app

# প্রজেক্টের সব ফাইল কপি করা
COPY . .

# ১. Python প্যাকেজ ইনস্টল করা (requests, flask, flask-cors, gunicorn ইত্যাদি)
RUN pip install --no-cache-dir flask flask-cors requests gunicorn

# ২. Node.js প্যাকেজ ইনস্টল করা (express, cors, axios ইত্যাদি)
RUN npm install express cors axios

# পোর্ট এক্সপোজ করা (Render সাধারণত ১০০০০ পোর্ট ব্যবহার করে)
EXPOSE 10000

# অ্যাপ চালু করার কমান্ড (আপনার প্রধান ফাইলটি server.js হলে node server.js অথবা app.py হলে python app.py দিন)
CMD ["node", "server.js"]
