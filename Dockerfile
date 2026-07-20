# ── Base image ────────────────────────────────────────────────────────────────
FROM node:22-alpine

# Install build tools needed by bcrypt (native addon)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# ── Dependencies ──────────────────────────────────────────────────────────────
# Copy manifests first so Docker caches the layer unless deps change
COPY package*.json ./
RUN npm ci

# ── Application source ────────────────────────────────────────────────────────
COPY tsconfig.json knexfile.ts ./
COPY src    ./src
COPY public ./public

# ── Entrypoint ────────────────────────────────────────────────────────────────
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
