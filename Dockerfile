FROM node:24-alpine AS base

RUN apk add --no-cache python3 make g++ libc6-compat

WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

RUN mkdir -p /data/uploads && chown nextjs:nodejs /data && \
    mkdir -p /app/public/uploads && chown nextjs:nodejs /app/public/uploads

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV DB_PATH=/data

CMD ["node", "server.js"]
