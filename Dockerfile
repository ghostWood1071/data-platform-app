# Dockerfile for Data Platform App

# Build stage
FROM node:20-slim AS builder

# Set up pnpm
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

# Copy package files for dependency installation
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY artifacts/api-server/package.json ./artifacts/api-server/
COPY artifacts/data-platform-portal/package.json ./artifacts/data-platform-portal/
COPY lib/api-client-react/package.json ./lib/api-client-react/
COPY lib/api-zod/package.json ./lib/api-zod/
COPY lib/db/package.json ./lib/db/
COPY scripts/package.json ./scripts/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy the rest of the source code
COPY . .

# Build the project
# We need to set environment variables for Vite during build if necessary
# For production build, we use BASE_PATH=/ and a dummy PORT
RUN export NODE_ENV=production && \
    export PORT=8080 && \
    export BASE_PATH=/ && \
    pnpm run build

# Final stage
FROM node:20-slim AS runner

WORKDIR /app

# Install Nginx
RUN apt-get update && apt-get install -y nginx && rm -rf /var/lib/apt/lists/*

# Copy backend build
COPY --from=builder /app/artifacts/api-server/dist ./artifacts/api-server/dist
COPY --from=builder /app/artifacts/api-server/package.json ./artifacts/api-server/
COPY --from=builder /app/node_modules ./node_modules

# Copy frontend build to nginx public directory
COPY --from=builder /app/artifacts/data-platform-portal/dist/public /var/www/html

# Nginx configuration
RUN echo 'server { \n\
    listen 80; \n\
    server_name portal-app.k8s.tailnet; \n\
    root /var/www/html; \n\
    index index.html; \n\
    location / { \n\
        try_files $uri $uri/ /index.html; \n\
    } \n\
    location /api { \n\
        proxy_pass http://localhost:8080; \n\
        proxy_http_version 1.1; \n\
        proxy_set_header Upgrade $http_upgrade; \n\
        proxy_set_header Connection "upgrade"; \n\
        proxy_set_header Host $host; \n\
        proxy_cache_bypass $http_upgrade; \n\
    } \n\
}' > /etc/nginx/sites-available/default

# Expose port 80
EXpose 80

# Start backend and nginx
# We use a simple script to run both
RUN echo '#!/bin/sh \n\
nginx \n\
export PORT=8080 \n\
export NODE_ENV=production \n\
node artifacts/api-server/dist/index.mjs' > /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

ENTRYPOINT ["/app/entrypoint.sh"]
