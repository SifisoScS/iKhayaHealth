FROM node:18-alpine AS base

WORKDIR /app

# Install dependencies separately for layer caching
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source
COPY . .

# Run as non-root user
RUN addgroup -S ikhaya && adduser -S ikhaya -G ikhaya
USER ikhaya

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

CMD ["node", "server.js"]
