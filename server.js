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
        console.log("Nilo Headless Engine Active!");
    } catch (err) {
        console.error("Puppeteer Launch Error:", err.message);
    }
})();

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Full Proxy Route
app.get('/proxy', async (req, res) => {
    let targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).send('URL missing!');

    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        targetUrl = 'https://' + targetUrl;
    }

    res.removeHeader('X-Frame-Options');
    res.removeHeader('Content-Security-Policy');
    res.set('Access-Control-Allow-Origin', '*');

    if (!browser) return res.status(503).send('Engine Initializing...');

    let page;
    try {
        page = await browser.newPage();
        
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
        await page.setViewport({ width: 1280, height: 800 });
        await page.setBypassCSP(true);

        // হেভি সাইটের জন্য ডোমিনেশান টাইমআউট বাড়ানো হয়েছে
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

        let content = await page.content();
        await page.close();

        const $ = cheerio.load(content);
        $('meta[http-equiv="Content-Security-Policy"]').remove();
        $('meta[http-equiv="X-Frame-Options"]').remove();

        const baseUrl = new URL(targetUrl).origin;
        $('head').prepend(`<base href="${baseUrl}/">`);

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

    } catch (err) {
        if (page) await page.close();
        return res.status(500).send(`
            <div style="font-family:sans-serif; text-align:center; padding:30px;">
                <h3>Unable to bypass restrictions for: ${targetUrl}</h3>
                <p>This site requires direct browser rendering or WebSocket authentication.</p>
            </div>
        `);
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
