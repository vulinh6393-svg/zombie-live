# Multi-stage production build for Game Server
FROM node:20-alpine AS builder

WORKDIR /app
RUN npm install -g pnpm@9.15.4

# Copy workspace configs
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/game-server/ ./apps/game-server/
COPY apps/live-bridge/ ./apps/live-bridge/

# Install dependencies and build shared packages + game-server
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @zombie-live/shared build && \
    pnpm --filter @zombie-live/config build && \
    pnpm --filter @zombie-live/database build && \
    pnpm --filter @zombie-live/live-bridge build && \
    pnpm --filter @zombie-live/game-server build

# Production runtime stage
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

RUN npm install -g pnpm@9.15.4

COPY --from=builder /app ./

EXPOSE 3001
CMD ["pnpm", "--filter", "@zombie-live/game-server", "start"]
