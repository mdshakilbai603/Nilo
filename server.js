const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// API Endpoint
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
