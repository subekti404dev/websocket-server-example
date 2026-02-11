const express = require('express');
const https = require('https');
const fs = require('fs');
const WebSocket = require('ws');

// --- Configuration ---
const PORT = process.env.PORT || 3000;

// --- SSL/TLS Configuration ---
// For development: Uses self-signed certificates (generate with: openssl req -x509 -newkey rsa:2048 -keyout private-key.pem -out certificate.pem -days 365 -nodes)
// For production: Use Let's Encrypt certificates
const serverOptions = {
  key: fs.readFileSync('./ssl/private-key.pem'),
  cert: fs.readFileSync('./ssl/certificate.pem'),
  
  // Allow RSA cipher suites alongside ECDHE (REQUIRED FOR ROKU)
  // This ensures the server can accept connections from roku_modules WebSocketClient
  ciphers: [
    // ECDHE ciphers (for other clients)
    'ECDHE-ECDSA-AES128-GCM-SHA256',
    'ECDHE-RSA-AES128-GCM-SHA256',
    'ECDHE-ECDSA-AES256-GCM-SHA384',
    'ECDHE-RSA-AES256-GCM-SHA384',
    // RSA ciphers (REQUIRED FOR ROKU - roku_modules TlsUtil only supports RSA)
    'RSA+AES128-GCM-SHA256',
    'RSA+AES256-GCM-SHA384',
    'RSA+AES128-SHA256',
    'RSA+AES256-SHA384',
  ].join(':'),
  honorCipherOrder: true, // Let server choose cipher, but allow RSA as fallback
};

// --- Create Express app ---
const app = express();
app.use(express.json()); // Middleware to parse JSON bodies

// --- Create HTTPS server ---
const server = https.createServer(serverOptions, app);

// --- Attach WebSocket server to HTTPS server ---
const wss = new WebSocket.Server({ server });
const clients = new Set(); // Store all connected Roku clients

console.log(`========================================`);
console.log(`Secure WebSocket Server (WSS)`);
console.log(`========================================`);
console.log(`Server is running on https://0.0.0.0:${PORT}`);
console.log(`WebSocket URL: wss://ws-server-example.uripsub.dev`);
console.log(``);
console.log(`✓ RSA cipher suites ENABLED for Roku support`);
console.log(`✓ Ready to accept Roku client connections`);
console.log(`========================================`);

// --- WebSocket Logic ---
wss.on('connection', (ws, req) => {
    console.log('');
    console.log('----------------------------------------');
    console.log('✓ New Roku client connected!');
    console.log(`  Client URL: ${req.url}`);
    console.log(`  Total clients: ${clients.size + 1}`);
    console.log('----------------------------------------');
    
    clients.add(ws);

    ws.on('message', (message) => {
        console.log(`📨 Message from Roku: ${message}`);
        
        // Echo back to sender
        ws.send(`Echo: ${message}`);
        
        // Broadcast to all other clients
        clients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    });

    ws.on('close', () => {
        console.log('');
        console.log('----------------------------------------');
        console.log('✗ Roku client disconnected');
        console.log(`  Remaining clients: ${clients.size - 1}`);
        console.log('----------------------------------------');
        clients.delete(ws);
    });

    ws.on('error', (error) => {
        console.error(`✗ WebSocket error: ${error.message}`);
        clients.delete(ws);
    });
    
    // Send welcome message to Roku client
    ws.send(JSON.stringify({
        type: 'welcome',
        message: 'Connected to secure WebSocket server',
        timestamp: new Date().toISOString()
    }));
});

// --- HTTP Trigger Endpoint Logic ---
app.post('/trigger', (req, res) => {
    const { message } = req.body;

    if (!message) {
        return res.status(400).json({ 
            status: 'error', 
            message: 'The "message" field is required.' 
        });
    }

    console.log('');
    console.log('========================================');
    console.log('TRIGGER ENDPOINT CALLED');
    console.log('========================================');
    console.log(`Message: ${message}`);
    console.log(`Broadcasting to ${clients.size} client(s)`);
    console.log('========================================');

    if (clients.size === 0) {
        return res.status(200).json({ 
            status: 'info', 
            message: 'Trigger received, but no Roku clients are connected.' 
        });
    }

    clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });

    res.status(200).json({ 
        status: 'success', 
        message: 'Message broadcasted successfully.',
        clientsCount: clients.size
    });
});

// --- Health check endpoint ---
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'secure-websocket-server',
        clients: clients.size,
        timestamp: new Date().toISOString()
    });
});

// --- Start the combined server ---
server.listen(PORT, () => {
    console.log('');
    console.log('========================================');
    console.log(`HTTPS server listening on port ${PORT}`);
    console.log(`Health check: https://localhost:${PORT}/health`);
    console.log(`Trigger endpoint: https://localhost:${PORT}/trigger`);
    console.log('========================================');
    console.log('');
});

// --- Graceful shutdown ---
process.on('SIGINT', () => {
    console.log('');
    console.log('========================================');
    console.log('Shutting down server...');
    console.log('========================================');
    
    wss.clients.forEach((ws) => {
        ws.close();
    });
    
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
