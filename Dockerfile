# Base image আপডেট করে Node.js 20 ব্যবহার করা হয়েছে
FROM nikolaik/python-nodejs:python3.11-nodejs20-slim

WORKDIR /app

COPY package*.json requirements.txt ./

RUN pip install --no-cache-dir -r requirements.txt

RUN npm ci --only=production || npm install

COPY . .

EXPOSE 10000

ENV PORT=10000
ENV NODE_ENV=production

CMD ["node", "server.js"]
