const express = require('express');
const axios = require('axios');
const path = require('path');
const cors = require('cors');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

// ১. স্ট্যাটিক ফাইল সার্ভ করার জন্য
app.use(express.static(__dirname));

// Puppeteer Global Instance
let browser;

// ব্যাকএন্ড ব্রাউজার ইঞ্জিন স্টার্ট করা (System Chromium সহ)
(async () => {
    try {
        browser = await puppeteer.launch({
            headless: 'new',
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--window-size=1280,800'
            ]
        });
        console.log("Nilo Browser Engine (Puppeteer Chromium) Ready!");
    } catch (err) {
        console.error("Puppeteer Launch Error:", err.message);
    }
})();

// Real Browser Request Headers (Anti-Bot Bypass for Fast Fetch)
const REAL_BROWSER_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Sec-Ch-Ua': '"Not/A)Brand";v="8", "Chromium";v="126", "Google Chrome";v="126"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"'
};

// ২. মূল ওয়েবসাইট (index.html) লোড করার রুট
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ৩. স্মার্ট ওয়েবসাইট প্রক্সি রাউট
app.get('/proxy', async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) {
        return res.status(400).send('URL parameter request URL missing!');
    }

    // iframe ব্লককারী সিকিউরিটি হেডার মুছে ফেলা
    res.removeHeader('X-Frame-Options');
    res.removeHeader('Content-Security-Policy');
    res.removeHeader('Strict-Transport-Security');
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', '*');

    // ধাপ ১: সাধারণ ওয়েবসাইটের জন্য দ্রুত Axios দিয়ে ফেচ করার চেষ্টা
    try {
        const response = await axios.get(targetUrl, {
            headers: REAL_BROWSER_HEADERS,
            timeout: 6000,
            responseType: 'arraybuffer',
            validateStatus: (status) => status < 400
        });

        const contentType = response.headers['content-type'] || '';
        if (contentType) {
            res.set('Content-Type', contentType);
        }

        // HTML কন্টেন্ট হলে Cheerio দিয়ে লিঙ্ক রিরাইট করা
        if (contentType.includes('text/html')) {
            const htmlString = response.data.toString('utf-8');
            const $ = cheerio.load(htmlString);

            // <a> ট্যাগ রিরাইট
            $('a[href]').each((_, el) => {
                const href = $(el).attr('href');
                if (href && !href.startsWith('javascript:') && !href.startsWith('#')) {
                    try {
                        const absoluteUrl = new URL(href, targetUrl).href;
                        $(el).attr('href', `/proxy?url=${encodeURIComponent(absoluteUrl)}`);
                    } catch (e) {}
                }
            });

            // <img>, <script>, <link> পাথ ঠিক করা
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

        // ইমেজ বা সিএসএস ফাইল হলে সরাসরি আউটপুট
        return res.send(response.data);

    } catch (fastFetchError) {
        // ধাপ ২: যদি সাইটে Cloudflare, JavaScript Security বা Bot Protection থাকে (যেমন: ChatGPT, Facebook, YouTube)
        console.log(`Fast fetch bypassed for: ${targetUrl}. Switching to Headless Chromium Engine...`);

        if (!browser) {
            return res.status(503).send('Browser Engine is initializing, please refresh in a moment.');
        }

        try {
            const page = await browser.newPage();
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
            await page.setViewport({ width: 1280, height: 800 });

            // পেজ লোড করা
            await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });

            // রেন্ডার হওয়া কন্টেন্ট সংগ্রহ
            let content = await page.content();
            await page.close();

            const $ = cheerio.load(content);

            // লিঙ্ক রিরাইট করা
            $('a[href]').each((_, el) => {
                const href = $(el).attr('href');
                if (href && !href.startsWith('javascript:') && !href.startsWith('#')) {
                    try {
                        const absoluteUrl = new URL(href, targetUrl).href;
                        $(el).attr('href', `/proxy?url=${encodeURIComponent(absoluteUrl)}`);
                    } catch (e) {}
                }
            });

            res.set('Content-Type', 'text/html');
            return res.send($.html());

        } catch (puppeteerErr) {
            return res.status(500).send(`
                <div style="font-family:sans-serif; color:#d9534f; padding:20px; text-align:center;">
                    <h2>Unable to bypass security or render page</h2>
                    <p>Target URL: ${targetUrl}</p>
                    <p>Error: ${puppeteerErr.message}</p>
                </div>
            `);
        }
    }
});

// ৪. Nilo AI Engine API Routes (index.html-এর সাথে ইন্টিগ্রেশন)
app.post('/api/node', (req, res) => {
    const userQuery = req.body.query || '';
    res.json({ reply: `Nilo AI (Node.js Engine) processed query: '${userQuery}' successfully.` });
});

app.post('/api/ai', (req, res) => {
    const userQuery = req.body.query || '';
    res.json({ reply: `Nilo AI (Python Fallback Engine) received: '${userQuery}'` });
});

// ৫. সার্ভার চালনা
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Nilo Browser Server running on port ${PORT}`);
});
