FROM node:18

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY .. .

RUN npm run build:server

npm prune --production

EXPOSE 2450

CMD ["node", "backend/dist/server.js"]