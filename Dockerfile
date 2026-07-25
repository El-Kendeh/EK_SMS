FROM node:20-slim

WORKDIR /app

COPY backend_node/package*.json ./
RUN npm ci --only=production

COPY backend_node/ ./

EXPOSE 3000

CMD ["node", "src/index.js"]
