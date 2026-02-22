# syntax=docker.io/docker/dockerfile:1
FROM node:22-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY site/package.json site/package-lock.json ./
RUN npm ci

# Install platform-specific Sharp for Alpine Linux (must be after copying node_modules)
RUN npm install --cpu=x64 --os=linux --libc=musl sharp

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

ARG NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID
ENV NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID="${NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID}"
ARG NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID
ENV NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID="${NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID}"
ARG NEXT_PUBLIC_STRIPE_LIFETIME_PRICE_ID
ENV NEXT_PUBLIC_STRIPE_LIFETIME_PRICE_ID="${NEXT_PUBLIC_STRIPE_LIFETIME_PRICE_ID}"

ENV STRIPE_API_KEY="placeholder"

COPY --from=deps /app/node_modules ./node_modules

COPY site/prisma ./prisma
RUN npm i -g prisma && npx prisma generate

COPY site/src ./src
COPY site/public ./public
COPY site/next.config.ts \
  site/tsconfig.json \
  site/postcss.config.mjs \
  site/package.json \
  site/package-lock.json ./

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry during the build.
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
# Uncomment the following line in case you want to disable telemetry during runtime.
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000

# server.js is created by next build from the standalone output
# https://nextjs.org/docs/pages/api-reference/config/next-config-js/output
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
