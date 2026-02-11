# Use an official lightweight Node.js runtime as a parent image
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json to leverage Docker cache
COPY package*.json ./

# Install project dependencies
RUN npm install --only=production

# Copy the rest of the application source code
COPY src/ ./src/

# Expose the ports the app runs on
EXPOSE 3000 8080

# Define the command to run the application
CMD [ "node", "src/server.js" ]
