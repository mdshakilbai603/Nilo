FROM nikolaik/python-nodejs:python3.11-nodejs20-slim

# Puppeteer/Chrome চালানোর জন্য প্রয়োজনীয় প্যাকেজ
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    procps \
    libsq3-0 \
    libgconf-2-4 \
    libxv1 \
    libgtk-3-0 \
    libgbm-dev \
    libnss3 \
    libasound2 \
    --no-install-recommends && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json requirements.txt ./

RUN pip install --no-cache-dir -r requirements.txt
RUN npm install

COPY . .

EXPOSE 10000

ENV PORT=10000
ENV NODE_ENV=production

CMD ["node", "server.js"]
