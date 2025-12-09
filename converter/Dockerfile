FROM debian:stable-slim

# Install LibreOffice + fonts + Node.js
RUN apt-get update && \
    apt-get install -y libreoffice ghostscript fonts-dejavu && \
    apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json .
RUN npm install
COPY . .

# Expose port and run the server
EXPOSE 8080
CMD ["node", "server.js"]
