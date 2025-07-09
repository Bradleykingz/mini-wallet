FROM node:18

WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev

COPY . .

RUN npm run build:server

EXPOSE 2450

CMD ["node", "backend/dist/server.js"]