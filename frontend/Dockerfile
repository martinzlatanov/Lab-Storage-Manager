# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig*.json ./
COPY vite.config.ts ./
COPY postcss.config.js ./
COPY tailwind.config.js ./
COPY index.html ./
COPY src ./src

# Build-time env vars for Vite (baked into the bundle at build time)
ARG VITE_DEV_AUTO_LOGIN=false
ARG VITE_DEV_USERNAME=admin
ARG VITE_DEV_PASSWORD=admin
ENV VITE_DEV_AUTO_LOGIN=$VITE_DEV_AUTO_LOGIN
ENV VITE_DEV_USERNAME=$VITE_DEV_USERNAME
ENV VITE_DEV_PASSWORD=$VITE_DEV_PASSWORD

RUN npm run build

# ── Stage 2: serve with nginx ─────────────────────────────────────────────────
FROM nginx:alpine AS runner

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy built React app
COPY --from=builder /app/dist /usr/share/nginx/html

# SPA routing: serve index.html for all routes (React Router handles them)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
