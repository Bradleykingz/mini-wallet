FROM node:18

WORKDIR /app

# Copy root package.json and lock file
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy backend sources
COPY backend ./backend

# Install dockerize
ADD https://github.com/jwilder/dockerize/releases/download/v0.6.1/dockerize-linux-amd64-v0.6.1.tar.gz /tmp/
RUN tar -C /usr/local/bin -xzvf /tmp/dockerize-linux-amd64-v0.6.1.tar.gz && \
    rm /tmp/dockerize-linux-amd64-v0.6.1.tar.gz

# Build the server
RUN npm run build:server

# Prune devDependencies for production
RUN npm prune --production

EXPOSE 2450

CMD ["dockerize",
     "-wait", "tcp://redis:6379",
     "-wait", "tcp://db:5432",
     "-timeout", "30s",
     "node", "backend/dist/server.js"]