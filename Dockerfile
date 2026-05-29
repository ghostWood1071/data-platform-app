# Dockerfile for Data Platform App

# Build stage
FROM node:24.16.0-slim AS builder

# Set up pnpm
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@11.2.2 --activate

WORKDIR /app

# Copy source code without local node_modules/dist artifacts.
COPY . .

# Install dependencies after all workspace manifests are present.
RUN pnpm install --frozen-lockfile

# Build the project
# We need to set environment variables for Vite during build if necessary
# For production build, we use BASE_PATH=/ and a dummy PORT
RUN export NODE_ENV=production && \
    export PORT=8080 && \
    export BASE_PATH=/ && \
    pnpm run build

# Final stage
FROM node:24.16.0-slim AS runner

WORKDIR /app

# Install Nginx and other tools
RUN apt-get update && apt-get install -y \
    nginx \
    bash \
    curl \
    ca-certificates \
    tar \
    gzip \
    && rm -rf /var/lib/apt/lists/*

# Install kubectl
RUN curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl" && \
    install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl && \
    rm kubectl

# Install helm
RUN curl -fsSL -o get_helm.sh https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 && \
    chmod 700 get_helm.sh && \
    ./get_helm.sh && \
    rm get_helm.sh

# Copy backend build
COPY --from=builder /app/artifacts/api-server/dist ./artifacts/api-server/dist
COPY --from=builder /app/artifacts/api-server/package.json ./artifacts/api-server/
COPY --from=builder /app/node_modules ./node_modules

# Copy scripts, charts, k8s
COPY scripts /app/scripts
COPY charts /app/charts
COPY k8s /app/k8s
RUN chmod +x /app/scripts/*.sh

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
EXPOSE 80

# Start backend and nginx
# We use a simple script to run both
RUN echo '#!/bin/sh \n\
nginx \n\
export PORT=8080 \n\
export NODE_ENV=production \n\
node artifacts/api-server/dist/index.mjs' > /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

ENTRYPOINT ["/app/entrypoint.sh"]
