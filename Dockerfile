# Use an official lightweight Node.js runtime as a parent image
FROM node:18-alpine

# Install OpenSSL for certificate generation
RUN apk add --no-cache openssl bash

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json to leverage Docker cache
COPY package*.json ./

# Install project dependencies
RUN npm install --only=production

# Copy the rest of the application source code
COPY src/ ./src/

# Copy SSL certificate generation script
COPY scripts/generate-ssl-certs.sh ./scripts/
RUN chmod +x scripts/generate-ssl-certs.sh

# Create SSL directory and generate self-signed certificates
# These will be used for secure WebSocket (WSS) connections
RUN mkdir -p ssl && \
    openssl req -x509 -newkey rsa:2048 \
    -keyout ssl/private-key.pem \
    -out ssl/certificate.pem \
    -days 365 \
    -nodes \
    -subj "/C=ID/ST=Jakarta/L=Jakarta/O=Durioo Plus/OU=Production/CN=ws-server-example.uripsub.dev"

# Expose the secure HTTPS port
EXPOSE 3000

# Health check to ensure server is running
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('https').get('https://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Define the command to run the secure application
CMD [ "node", "src/server-secure.js" ]
