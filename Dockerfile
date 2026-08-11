# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

RUN corepack enable

# Install dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy source and build
COPY . .

# Set build-time environment variable for Next.js
ENV NEXT_PUBLIC_API_URL=https://api.selfkit.art/api/v1

RUN pnpm build

# Production stage - use Node.js for standalone Next.js
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Copy standalone output
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public

EXPOSE 8080

USER node

CMD ["node", "server.js"]
