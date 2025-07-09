FROM node:18

WORKDIR /app

# Copy backend code
COPY ../backend ./backend
COPY ../backend/.env ./backend/.env

WORKDIR /app/backend

RUN npm install && \
    npm build && \
    npm prune --production

# Install dockerize
ADD https://github.com/jwilder/dockerize/releases/download/v0.6.1/dockerize-linux-amd64-v0.6.1.tar.gz /tmp/dockerize.tar.gz
RUN tar -C /usr/local/bin -xzvf /tmp/dockerize.tar.gz && \
    rm /tmp/dockerize.tar.gz

EXPOSE 2450

CMD ["dockerize", "-wait", "tcp://redis:6379", "-wait", "tcp://db:5432", "-timeout", "30s", "node", "dist/server.js"]