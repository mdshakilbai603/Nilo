app.get('/proxy', async (req, res) => {
    let targetUrl = req.query.url;
    if (!targetUrl) {
        return res.status(400).send('URL parameter missing!');
    }

    // URL ফরম্যাট ঠিক করা
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        targetUrl = 'https://' + targetUrl;
    }

    // Security Headers স্ট্রিপ করা
    res.removeHeader('X-Frame-Options');
    res.removeHeader('Content-Security-Policy');
    res.removeHeader('Strict-Transport-Security');
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', '*');

    // GitHub বা জটিল সিকিউরিটি সাইটের জন্য সরাসরি Puppeteer ব্রাউজার ব্যবহার
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

                // <a> ট্যাগ রিরাইট
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

    // Puppeteer Engine Fallback
    if (!browser) {
        return res.status(503).send('Browser Engine is initializing. Please refresh.');
    }

    try {
        const page = await browser.newPage();
        
        // Stealth Headers & Bypass
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
        await page.setViewport({ width: 1280, height: 800 });

        await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 30000 });

        let content = await page.content();
        await page.close();

        const $ = cheerio.load(content);

        // Security tags সরাতে
        $('meta[http-equiv="Content-Security-Policy"]').remove();
        $('meta[http-equiv="X-Frame-Options"]').remove();

        // <a> ট্যাগ রিরাইট
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
