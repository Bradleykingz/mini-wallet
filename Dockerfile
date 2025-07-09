FROM node:18

WORKDIR /app/backend

COPY package*.json ./
RUN npm install

COPY backend/. ./

RUN npm run build:server

RUN npm prune --production

EXPOSE 2450

CMD ["node", "dist/server.js"]