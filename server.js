const express = require('express');
const axios = require('axios');
const app = express();

// ... আপনার আগের কোড ...

// Proxy Endpoint
app.get('/proxy', async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).send('URL require');

    try {
        const response = await axios.get(targetUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
            responseType: 'stream'
        });

        // iframe ব্লককারী নিরাপত্তা হেডারগুলো মুছে ফেলা
        res.removeHeader('X-Frame-Options');
        res.removeHeader('Content-Security-Policy');

        response.data.pipe(res);
    } catch (error) {
        res.status(500).send('Failed to fetch the website');
    }
});

// Render Server Port
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
