const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// ১. index.html সহ সকল স্ট্যাটিক ফাইল সার্ভ করার জন্য
app.use(express.static(path.join(__dirname)));

// ২. হোম রুটে (/) সরাসরি index.html লোড করার রাউট
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ৩. Node.js API Endpoint
app.post('/api/node', (req, res) => {
    try {
        const { query } = req.body;
        const responseText = `Node.js (Express) Backend Response for: '${query}'`;
        res.json({ reply: responseText });
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.listen(PORT, () => {
    console.log(`Node.js Open-Source Backend running at http://localhost:${PORT}`);
});
