# Build client static assets using Vite
FROM node:20-alpine AS builder

WORKDIR /app
RUN npm install -g pnpm@9.15.4

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/game-client/ ./apps/game-client/

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @zombie-live/shared build && \
    pnpm --filter @zombie-live/game-client build

# Production static web server (Nginx Alpine)
FROM nginx:alpine AS runner

COPY --from=builder /app/apps/game-client/dist /usr/share/nginx/html
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
