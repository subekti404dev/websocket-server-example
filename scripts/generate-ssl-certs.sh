#!/bin/bash

# SSL Certificate Generator for WebSocket Server
# This script generates self-signed certificates for development/testing
# For production, use Let's Encrypt or commercial certificates

echo "========================================="
echo "SSL Certificate Generator"
echo "========================================="
echo ""

# Create ssl directory if it doesn't exist
mkdir -p ssl

# Check if certificates already exist
if [ -f "ssl/certificate.pem" ] && [ -f "ssl/private-key.pem" ]; then
    echo "⚠️  Certificates already exist!"
    echo "   Current: ssl/certificate.pem"
    echo "   Current: ssl/private-key.pem"
    echo ""
    read -p "Regenerate certificates? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Skipping certificate generation."
        exit 0
    fi
fi

# Get domain name
echo "📝 Certificate Information"
echo "   Common Name (CN): ws-server-example.uripsub.dev"
echo "   Organization: Durioo Plus"
echo "   Country: ID"
echo ""

# Generate private key and certificate
echo "🔐 Generating RSA 2048-bit private key and certificate..."
echo ""

openssl req -x509 -newkey rsa:2048 \
    -keyout ssl/private-key.pem \
    -out ssl/certificate.pem \
    -days 365 \
    -nodes \
    -subj "/C=ID/ST=Jakarta/L=Jakarta/O=Durioo Plus/OU=Development/CN=ws-server-example.uripsub.dev"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Success! Certificates generated:"
    echo "   Private Key:  ssl/private-key.pem"
    echo "   Certificate:  ssl/certificate.pem"
    echo ""
    echo "========================================="
    echo "📝 Next Steps:"
    echo "========================================="
    echo ""
    echo "1. Start the secure server:"
    echo "   node src/server-secure.js"
    echo ""
    echo "2. Your Roku app can connect to:"
    echo "   wss://ws-server-example.uripsub.dev"
    echo ""
    echo "⚠️  Note: Self-signed certificates will show warnings"
    echo "   but Roku can still connect (it doesn't validate certs)"
    echo ""
    echo "For PRODUCTION, use Let's Encrypt:"
    echo "   certbot certonly --standalone -d ws-server-example.uripsub.dev"
    echo "========================================="
else
    echo ""
    echo "❌ Error: Failed to generate certificates"
    echo "   Make sure OpenSSL is installed:"
    echo "   - macOS: brew install openssl"
    echo "   - Ubuntu: sudo apt-get install openssl"
    exit 1
fi
