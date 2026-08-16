FROM node:22-alpine AS base

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable && corepack prepare pnpm@11.20.0 --activate

WORKDIR /app

FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY patches ./patches

RUN pnpm install --frozen-lockfile

FROM base AS builder

ENV NEXT_TELEMETRY_DISABLED=1
# Keep the build independent from production secrets. Runtime values are
# supplied by Coolify to the runner stage.
ARG MONGODB_URI=mongodb://127.0.0.1:27017/interv-build
ARG MONGODB_URI_EVENT=mongodb://127.0.0.1:27017/interv-build-events
ENV MONGODB_URI=$MONGODB_URI
ENV MONGODB_URI_EVENT=$MONGODB_URI_EVENT

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN pnpm build

FROM base AS runner

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN apk add --no-cache curl ca-certificates icu-libs gcompat \
    && curl -fsSL https://aka.ms/TunnelsCliDownload/linux-x64 \
      -o /usr/local/bin/devtunnel \
    && chmod +x /usr/local/bin/devtunnel

ENV DEV_TUNNEL_ID=interv-backend.jpe1
ENV AI_BACKEND_USE_DEV_TUNNEL=false
ENV AI_BACKEND_GRPC_URL=180.93.43.99:50051
ENV AI_BACKEND_GRPC_TLS_SERVER_NAME=171.250.163.54

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/proto ./proto
COPY --from=builder /app/certs/interv-backend.crt ./certs/interv-backend.crt
COPY docker-entrypoint.sh ./docker-entrypoint.sh

RUN chmod +x ./docker-entrypoint.sh

EXPOSE 3000

CMD ["./docker-entrypoint.sh"]
