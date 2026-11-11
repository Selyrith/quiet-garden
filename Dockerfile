# Multi-stage: собираем клиент, затем запускаем только сервер + dist/
# Node 22 обязателен: pnpm 11 требует node >= 22.13
FROM node:22-alpine AS build

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@11.1.2 --activate

# Устанавливаем зависимости (слой с lock-файлом кешируется)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# Исходники клиента
COPY index.html vite.config.js ./
COPY src/ ./src/
COPY shared/ ./shared/
COPY public/ ./public/

# Production-сборка клиента -> dist/
RUN pnpm run build

# --- Финальный образ: только runtime ---
FROM node:22-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3002

RUN corepack enable && corepack prepare pnpm@11.1.2 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod && pnpm store prune

COPY server/ ./server/
COPY shared/ ./shared/
COPY --from=build /app/dist/ ./dist/
COPY public/ ./public/
COPY index.html ./index.html

# Каталог для сохранений (комнаты, профили игроков)
RUN mkdir -p /app/data && chown -R node:node /app/data
VOLUME ["/app/data"]

USER node

EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3002)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server/index.js"]
