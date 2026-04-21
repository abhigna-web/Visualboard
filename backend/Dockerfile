# Use Node.js LTS
FROM node:20-slim

WORKDIR /app

# Install dependencies separately for caching
COPY package*.json ./
RUN npm install --production

# Copy source code
COPY . .

# Environment variables
ENV PORT=5000
ENV NODE_ENV=production

EXPOSE 5000

CMD ["node", "index.js"]
