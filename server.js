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
app.use(express.static(__dirname));

let browser;

// Puppeteer Engine Init
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
        console.log("Nilo Browser Engine Ready!");
    } catch (err) {
        console.error("Puppeteer Launch Error:", err.message);
    }
})();

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Smart Full-Proxy Engine
app.get('/proxy', async (req, res) => {
    let targetUrl = req.query.url;
    if (!targetUrl) {
        return res.status(400).send('URL parameter missing!');
    }

    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        targetUrl = 'https://' + targetUrl;
    }

    // CORS & Frame Security Headers Bypass
    res.removeHeader('X-Frame-Options');
    res.removeHeader('Content-Security-Policy');
    res.removeHeader('Strict-Transport-Security');
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', '*');

    if (!browser) {
        return res.status(503).send('Browser Engine is initializing, please refresh.');
    }

    try {
        const page = await browser.newPage();
        
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
        await page.setViewport({ width: 1280, height: 800 });

        // Request interception for disabling security policies inside page
        await page.setBypassCSP(true);

        await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 35000 });

        let content = await page.content();
        await page.close();

        const $ = cheerio.load(content);

        // Security Meta Tags অপসারণ
        $('meta[http-equiv="Content-Security-Policy"]').remove();
        $('meta[http-equiv="X-Frame-Options"]').remove();

        // Base tag বসানো যাতে সব Relative Asset (CSS/JS/Image) মূল সাইট থেকে সঠিকভাবে লোড হয়
        const baseUrl = new URL(targetUrl).origin;
        $('head').prepend(`<base href="${baseUrl}/">`);

        // লিঙ্ক রিরাইট (proxy-র মাধ্যমে নেভিগেট করার জন্য)
        $('a[href]').each((_, el) => {
            const href = $(el).attr('href');
            if (href && !href.startsWith('javascript:') && !href.startsWith('#')) {
                try {
                    const abs = new URL(href, targetUrl).href;
                    $(el).attr('href', `/proxy?url=${encodeURIComponent(abs)}`);
                } catch (e) {}
            }
        });

        res.set('Content-Type', 'text/html');
        return res.send($.html());

    } catch (puppeteerErr) {
        return res.status(500).send(`
            <div style="font-family:sans-serif; color:#d9534f; padding:20px; text-align:center;">
                <h3>Unable to load ${targetUrl}</h3>
                <p>Error: ${puppeteerErr.message}</p>
            </div>
        `);
    }
});

// AI APIs
app.post('/api/node', (req, res) => {
    res.json({ reply: `Nilo AI (Node.js Engine) processed: ${req.body.query}` });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Nilo Browser Server running on port ${PORT}`);
});
