# Stage 1: Builder
FROM node:18-alpine AS builder

WORKDIR /app

# Install dependencies
COPY client/package.json client/package-lock.json ./
RUN npm ci

# Copy source code
COPY client/ .

# Build for web
# We use npx expo export to generate the static files
RUN npx expo export --platform web

# Stage 2: Runner
FROM nginx:alpine

# Copy static files from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx config if needed (optional, using default for now but enabling SPA fallback)
# Creating a simple default config for SPA
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
