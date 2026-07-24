FROM nikolaik/python-nodejs:python3.11-nodejs20-slim

# Chromium এবং মূল ডিপেন্ডেন্সি ইন্সটল
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    libxss1 \
    libnss3 \
    libatk-bridge2.0-0 \
    libgtk-3-0 \
    libgbm1 \
    libasound2 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Puppeteer-কে সিস্টেমের Chromium ব্যবহার করতে বলা
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

COPY package*.json requirements.txt ./

RUN pip install --no-cache-dir -r requirements.txt
RUN npm install

COPY . .

EXPOSE 10000

ENV PORT=10000
ENV NODE_ENV=production

CMD ["node", "server.js"]
