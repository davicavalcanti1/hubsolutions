# ── Stage 1: Build do frontend ─────────────────────────────────────────────────
FROM node:20-alpine AS frontend-builder
WORKDIR /app

ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_API_URL=

ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_API_URL=$VITE_API_URL

COPY package*.json ./
RUN npm ci --omit=dev=false

COPY . .
RUN npm run build

# ── Stage 2: Build do servidor ────────────────────────────────────────────────
FROM node:20-alpine AS server-builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY server ./server
COPY tsconfig*.json ./
RUN npx tsc --project tsconfig.node.json --outDir dist-server || \
    npx tsx --transpile-only server/src/index.ts --help 2>/dev/null; exit 0

# ── Stage 3: Runtime ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

# Apenas dependências de produção
COPY package*.json ./
RUN npm ci --omit=dev

# Frontend compilado
COPY --from=frontend-builder /app/dist ./public

# Código do servidor (rodado com tsx em produção — sem build step extra)
COPY server ./server
COPY tsconfig*.json ./

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/health || exit 1

EXPOSE 3001

CMD ["npx", "tsx", "server/src/index.ts"]
