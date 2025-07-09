FROM node:18

WORKDIR /app/backend

COPY backend ./
COPY backend/.env .env

RUN npm install && \
    npm run build:server && \
    npm prune --production

COPY https://github.com/jwilder/dockerize/releases/download/v0.6.1/dockerize-linux-amd64-v0.6.1.tar.gz /tmp/
RUN tar -C /usr/local/bin -xzvf /tmp/dockerize-linux-amd64-v0.6.1.tar.gz && \
    rm /tmp/dockerize-linux-amd64-v0.6.1.tar.gz

EXPOSE 2450

CMD ["dockerize", "-wait", "tcp://redis:6379", "-wait", "tcp://db:5432", "-timeout", "30s", "node", "dist/server.js"]