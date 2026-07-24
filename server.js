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

// ব্যাকএন্ড ব্রাউজার ইনিশিয়ালাইজ করা
(async () => {
    try {
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
        });
        console.log("Puppeteer Browser Engine Ready!");
    } catch (err) {
        console.error("Puppeteer Launch Error:", err.message);
    }
})();

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// এডভান্সড স্মার্ট প্রক্সি রাউট
app.get('/proxy', async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).send('URL missing!');

    // সিকিউরিটি হেডার রিমুভ ও CORS অন
    res.removeHeader('X-Frame-Options');
    res.removeHeader('Content-Security-Policy');
    res.set('Access-Control-Allow-Origin', '*');

    // ১. সাধারণ সাইটের জন্য ফাস্ট ফেচ
    try {
        const response = await axios.get(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
            },
            timeout: 5000,
            responseType: 'arraybuffer'
        });

        const contentType = response.headers['content-type'] || '';
        res.set('Content-Type', contentType);

        if (contentType.includes('text/html')) {
            const $ = cheerio.load(response.data.toString('utf-8'));
            $('a[href]').each((_, el) => {
                const href = $(el).attr('href');
                if (href && !href.startsWith('javascript:') && !href.startsWith('#')) {
                    try {
                        $(el).attr('href', `/proxy?url=${encodeURIComponent(new URL(href, targetUrl).href)}`);
                    } catch (e) {}
                }
            });
            return res.send($.html());
        }
        return res.send(response.data);

    } catch (fastFetchError) {
        // ২. যদি Cloudflare বা Bot Protection দিয়ে ব্লক হয় (YouTube, ChatGPT, GitHub)
        console.log(`Fast fetch failed for ${targetUrl}. Fallback to Puppeteer Engine...`);

        if (!browser) {
            return res.status(500).send('Browser Engine is initializing, try again in a moment.');
        }

        try {
            const page = await browser.newPage();
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
            await page.setViewport({ width: 1280, height: 800 });

            await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });

            // HTML কন্টেন্ট সংগ্রহ
            let content = await page.content();
            await page.close();

            const $ = cheerio.load(content);
            $('a[href]').each((_, el) => {
                const href = $(el).attr('href');
                if (href && !href.startsWith('javascript:') && !href.startsWith('#')) {
                    try {
                        $(el).attr('href', `/proxy?url=${encodeURIComponent(new URL(href, targetUrl).href)}`);
                    } catch (e) {}
                }
            });

            res.set('Content-Type', 'text/html');
            return res.send($.html());

        } catch (puppeteerErr) {
            return res.status(500).send(`
                <div style="padding:20px; font-family:sans-serif; color:red;">
                    <h3>Bypassing security failed for this URL</h3>
                    <p>${puppeteerErr.message}</p>
                </div>
            `);
        }
    }
});

app.post('/api/node', (req, res) => {
    res.json({ reply: `Nilo AI (Node.js Engine) active.` });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
