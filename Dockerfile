FROM nikolaik/python-nodejs:python3.11-nodejs20-slim

# Chromium এবং প্রয়োজনীয় সকল সাপোর্ট প্যাকেজ ইন্সটল
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-ipafont-gothic \
    fonts-wqy-zenhei \
    fonts-thai-tlwg \
    fonts-kacst \
    fonts-freefont-ttf \
    libxss1 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Puppeteer-কে সিস্টেম ক্রোমিয়াম ব্যবহার করার নির্দেশনা দেওয়া
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
