const express = require('express');
const cors = require('cors');
const path = require('path');
const https = require('https');
const http = require('http');

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(cors());
app.use(express.json());

// ১. index.html ও অন্যান্য স্ট্যাটিক ফাইল পরিবেশন
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ২. Web Proxy Route (iframe সিকিউরিটি ব্লকার এড়িয়ে ওয়েবসাইট লোড করার জন্য)
app.get('/proxy', (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).send('URL query parameter required');

    try {
        const client = targetUrl.startsWith('https') ? https : http;
        
        client.get(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
            }
        }, (proxyRes) => {
            // সিকিউরিটি হেডারগুলো রিমুভ করে দেওয়া যাতে iframe-এ ব্লক না হয়
            delete proxyRes.headers['x-frame-options'];
            delete proxyRes.headers['content-security-policy'];
            delete proxyRes.headers['frame-options'];

            res.writeHead(proxyRes.statusCode, proxyRes.headers);
            proxyRes.pipe(res);
        }).on('error', (err) => {
            res.status(500).send('Proxy Error: ' + err.message);
        });
    } catch (e) {
        res.status(500).send('Invalid URL format');
    }
});

// ৩. Node.js API Endpoint
app.post('/api/node', (req, res) => {
    try {
        const { query } = req.body;
        res.json({ reply: `Node.js (Express) Backend Response for: '${query}'` });
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.listen(PORT, () => {
    console.log(`Node.js Open-Source Backend running on port ${PORT}`);
});
