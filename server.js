const express = require('express');
const axios = require('axios');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

// ১. মূল ওয়েবসাইট (index.html) লোড করার জন্য রুট
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ২. ওয়েবসাইট ব্লক ছাড়ানোর Proxy Route
app.get('/proxy', async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) {
        return res.status(400).send('URL parameter request URL missing!');
    }

    try {
        const response = await axios.get(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            responseType: 'arraybuffer' // ছবি বা এইচটিএমএল সব সঠিকভাবে ডেলিভারির জন্য
        });

        // iframe ব্লককারী সিকিউরিটি হেডারগুলো রিমুভ করা
        res.removeHeader('X-Frame-Options');
        res.removeHeader('Content-Security-Policy');
        res.set('Access-Control-Allow-Origin', '*');

        const contentType = response.headers['content-type'];
        if (contentType) {
            res.set('Content-Type', contentType);
        }

        res.send(response.data);
    } catch (error) {
        res.status(500).send('Error loading URL through proxy');
    }
});

// ৩. সার্ভার লিসেনিং
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
