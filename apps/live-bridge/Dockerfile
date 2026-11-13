# Multi-stage production build for Live Bridge
FROM node:20-alpine AS builder

WORKDIR /app
RUN npm install -g pnpm@9.15.4

# Copy workspace configs
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/live-bridge/ ./apps/live-bridge/

# Install dependencies and build shared packages + live-bridge
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @zombie-live/shared build && \
    pnpm --filter @zombie-live/live-bridge build

# Production runtime stage
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

RUN npm install -g pnpm@9.15.4

COPY --from=builder /app ./

CMD ["pnpm", "--filter", "@zombie-live/live-bridge", "start"]
