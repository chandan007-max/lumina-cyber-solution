# LUMINA CYBER SOLUTION — Production Deployment Container
FROM node:22-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy application sources
COPY . .

# Build frontend production bundle
RUN npm run build

# Expose server port (default 3000, overrideable via PORT env)
ENV PORT=3000
ENV NODE_ENV=production

EXPOSE 3000

# Start unified authority and application server
CMD ["npx", "tsx", "server.ts"]
