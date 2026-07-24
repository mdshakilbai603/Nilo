const express = require('express');
const axios = require('axios');
const path = require('path');
const cors = require('cors');
const cheerio = require('cheerio');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

// স্ট্যাটিক ফাইল সার্ভ করার জন্য
app.use(express.static(__dirname));

// Real Browser Request Headers (Anti-Bot Protection Bypass)
const REAL_BROWSER_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Sec-Ch-Ua': '"Not/A)Brand";v="8", "Chromium";v="126", "Google Chrome";v="126"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"'
};

// ১. মূল ওয়েবসাইট (index.html) লোড করার রুট
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ২. ওয়েবসাইট ফ্রেমে লোড করার জন্য Proxy Route + HTML URL Rewriter
app.get('/proxy', async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) {
        return res.status(400).send('URL parameter missing!');
    }

    try {
        const response = await axios.get(targetUrl, {
            headers: REAL_BROWSER_HEADERS,
            responseType: 'arraybuffer',
            validateStatus: () => true // error status ও হ্যান্ডেল করবে
        });

        const contentType = response.headers['content-type'] || '';

        // iframe ব্লককারী সিকিউরিটি হেডারগুলো রিমুভ করা
        res.removeHeader('X-Frame-Options');
        res.removeHeader('Content-Security-Policy');
        res.removeHeader('Strict-Transport-Security');
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.set('Access-Control-Allow-Headers', '*');

        if (contentType) {
            res.set('Content-Type', contentType);
        }

        // HTML কন্টেন্ট হলে Cheerio দিয়ে লিঙ্কগুলো প্রক্সিতে রিরাইট করা
        if (contentType.includes('text/html')) {
            const htmlString = response.data.toString('utf-8');
            const $ = cheerio.load(htmlString);

            // <a> ট্যাগের সকল লিঙ্ক প্রক্সির মাধ্যমে ঘোরানো
            $('a[href]').each((_, el) => {
                const href = $(el).attr('href');
                if (href && !href.startsWith('javascript:') && !href.startsWith('#')) {
                    try {
                        const absoluteUrl = new URL(href, targetUrl).href;
                        $(el).attr('href', `/proxy?url=${encodeURIComponent(absoluteUrl)}`);
                    } catch (e) {}
                }
            });

            // <img>, <script>, <link> রিলেটিভ পাথ ঠিক করা
            $('img[src], script[src]').each((_, el) => {
                const src = $(el).attr('src');
                if (src) {
                    try {
                        $(el).attr('src', new URL(src, targetUrl).href);
                    } catch (e) {}
                }
            });

            $('link[href]').each((_, el) => {
                const href = $(el).attr('href');
                if (href) {
                    try {
                        $(el).attr('href', new URL(href, targetUrl).href);
                    } catch (e) {}
                }
            });

            return res.send($.html());
        }

        // ছবি, সিএসএস, বা অন্যান্য মিডিয়া সরাসরি রেসপন্স করা
        res.send(response.data);
    } catch (error) {
        res.status(500).send(`
            <div style="font-family:sans-serif; color:red; padding:20px;">
                <h2>Error loading URL through proxy</h2>
                <p>${error.message}</p>
            </div>
        `);
    }
});

// ৩. Nilo AI-এর ব্যাকএন্ড API Routes (`index.html`-এর জন্য)
app.post('/api/node', (req, res) => {
    const userQuery = req.body.query || '';
    res.json({ reply: `Nilo AI (Node.js Engine) processed query: '${userQuery}' successfully.` });
});

app.post('/api/ai', (req, res) => {
    const userQuery = req.body.query || '';
    res.json({ reply: `Nilo AI (Python Fallback Engine) received: '${userQuery}'` });
});

// ৪. সার্ভার লিসেনিং
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Nilo Browser Engine running on port ${PORT}`);
});
