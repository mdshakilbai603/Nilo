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

// Puppeteer Engine Initialization
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

const REAL_BROWSER_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Sec-Ch-Ua': '"Not/A)Brand";v="8", "Chromium";v="126", "Google Chrome";v="126"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"'
};

// Root Route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Smart Proxy Route
app.get('/proxy', async (req, res) => {
    let targetUrl = req.query.url;
    if (!targetUrl) {
        return res.status(400).send('URL parameter missing!');
    }

    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        targetUrl = 'https://' + targetUrl;
    }

    res.removeHeader('X-Frame-Options');
    res.removeHeader('Content-Security-Policy');
    res.removeHeader('Strict-Transport-Security');
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', '*');

    // GitHub, ChatGPT বা Facebook-এর মতো সিকিউরড সাইট হলে সরাসরি Puppeteer দিয়ে রান হবে
    const isHighSecuritySite = targetUrl.includes('github.com') || 
                               targetUrl.includes('chatgpt.com') || 
                               targetUrl.includes('facebook.com');

    if (!isHighSecuritySite) {
        try {
            const response = await axios.get(targetUrl, {
                headers: REAL_BROWSER_HEADERS,
                timeout: 5000,
                responseType: 'arraybuffer',
                validateStatus: (status) => status < 400
            });

            const contentType = response.headers['content-type'] || '';
            if (contentType) res.set('Content-Type', contentType);

            if (contentType.includes('text/html')) {
                const $ = cheerio.load(response.data.toString('utf-8'));

                $('a[href]').each((_, el) => {
                    const href = $(el).attr('href');
                    if (href && !href.startsWith('javascript:') && !href.startsWith('#')) {
                        try {
                            const abs = new URL(href, targetUrl).href;
                            $(el).attr('href', `/proxy?url=${encodeURIComponent(abs)}`);
                        } catch (e) {}
                    }
                });

                return res.send($.html());
            }

            return res.send(response.data);
        } catch (err) {
            console.log(`Axios failed for ${targetUrl}, redirecting to Puppeteer Engine...`);
        }
    }

    // High Security Site / Fallback Puppeteer Engine
    if (!browser) {
        return res.status(503).send('Browser Engine is initializing. Please refresh in a moment.');
    }

    try {
        const page = await browser.newPage();
        
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
        await page.setViewport({ width: 1280, height: 800 });

        await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 30000 });

        let content = await page.content();
        await page.close();

        const $ = cheerio.load(content);

        $('meta[http-equiv="Content-Security-Policy"]').remove();
        $('meta[http-equiv="X-Frame-Options"]').remove();

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

// AI API Endpoints
app.post('/api/node', (req, res) => {
    const userQuery = req.body.query || '';
    res.json({ reply: `Nilo AI (Node.js Engine) processed query: '${userQuery}' successfully.` });
});

app.post('/api/ai', (req, res) => {
    const userQuery = req.body.query || '';
    res.json({ reply: `Nilo AI (Python Fallback Engine) received: '${userQuery}'` });
});

// Server Start
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Nilo Browser Server running on port ${PORT}`);
});
