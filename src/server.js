// src/server.js
const WebSocket = require('ws');
const express = require('express');

// --- Configuration ---
// Use environment variables for ports, with fallbacks for local development
const WS_PORT = process.env.WS_PORT || 8080;
const HTTP_PORT = process.env.HTTP_PORT || 3000;

// --- WebSocket Server Setup (for Roku clients) ---
const wss = new WebSocket.Server({ port: WS_PORT });
const clients = new Set(); // Store all connected Roku clients

console.log(`WebSocket server is running on ws://0.0.0.0:${WS_PORT}`);

wss.on('connection', (ws) => {
    console.log('New Roku client connected!');
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

// --- Express HTTP Server Setup (for triggers) ---
const app = express();
app.use(express.json()); // Middleware to parse JSON bodies

app.post('/trigger', (req, res) => {
    const { message } = req.body;

    if (!message) {
        return res.status(400).json({ status: 'error', message: 'The "message" field is required in the request body.' });
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

app.listen(HTTP_PORT, () => {
    console.log(`HTTP trigger server is listening on http://0.0.0.0:${HTTP_PORT}`);
});
