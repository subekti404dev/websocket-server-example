// src/server.js
const express = require('express');
const http = require('http');
const WebSocket = require('ws');

// --- Configuration ---
const PORT = process.env.PORT || 3000;

// --- Create a single HTTP server ---
const app = express();
app.use(express.json()); // Middleware to parse JSON bodies
const server = http.createServer(app);

// --- Attach WebSocket server to the HTTP server ---
const wss = new WebSocket.Server({ server });
const clients = new Set(); // Store all connected Roku clients

console.log(`Server is running on http://0.0.0.0:${PORT}`);

// --- WebSocket Logic ---
wss.on('connection', (ws) => {
    console.log('New Roku client connected via WebSocket upgrade!');
    clients.add(ws);

    ws.on('message', (message) => {
        console.log(`Received message from Roku client: ${message}`);
    });

    ws.on('close', () => {
        console.log('Roku client disconnected.');
        clients.delete(ws);
    });

    ws.on('error', (error) => {
        console.error(`WebSocket error: ${error}`);
        clients.delete(ws);
    });
});

// --- HTTP Trigger Endpoint Logic ---
app.post('/trigger', (req, res) => {
    const { message } = req.body;

    if (!message) {
        return res.status(400).json({ status: 'error', message: 'The "message" field is required.' });
    }

    if (clients.size === 0) {
        return res.status(200).json({ status: 'info', message: 'Trigger received, but no Roku clients are connected.' });
    }

    console.log(`Received trigger. Broadcasting to ${clients.size} client(s): "${message}"`);

    clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });

    res.status(200).json({ status: 'success', message: 'Message broadcasted successfully.' });
});

// --- Start the combined server ---
server.listen(PORT, () => {
    console.log(`HTTP server & WebSocket upgrades are listening on port ${PORT}`);
});
