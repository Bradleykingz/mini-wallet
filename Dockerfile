FROM node:18

WORKDIR /app

# Copy root package.json and lock file
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy backend sources
COPY backend ./backend

# Build the server
RUN npm run build:server

# Prune devDependencies for production
RUN npm prune --production

EXPOSE 2450

CMD ["node", "backend/dist/server.js"]