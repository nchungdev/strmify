# Use Node.js as base
FROM node:20-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    rsync \
    sshpass \
    openssh-client \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy application source
COPY . .

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
