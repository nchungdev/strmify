# Use Node.js as base
FROM node:20-bookworm-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    rsync \
    sshpass \
    openssh-client \
    python3 \
    make \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
# Force build sqlite3 from source to avoid GLIBC version mismatch
RUN npm install && npm rebuild sqlite3 --build-from-source

# Copy application source
COPY . .

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
