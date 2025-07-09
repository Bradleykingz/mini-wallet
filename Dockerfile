FROM node:18

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY backend ./backend
COPY Dockerfile .
COPY docker-compose.yml .
COPY tsconfig.json .

RUN npm run build:server

RUN npm prune --production

EXPOSE 2450

CMD ["node", "dist/server.js"]