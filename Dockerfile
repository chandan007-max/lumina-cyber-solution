# LUMINA CYBER SOLUTION — Production Deployment Container
FROM node:22-bookworm-slim

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# Copy application sources
COPY . .

# Build frontend production bundle
RUN npm run build

# Expose server port (default 8080 for Cloud Run, overrideable via PORT env)
ENV PORT=8080
ENV NODE_ENV=production

EXPOSE 8080

# Start unified authority and application server
CMD ["npm", "start"]
