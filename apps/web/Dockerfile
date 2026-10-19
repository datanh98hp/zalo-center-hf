FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/package.json
RUN pnpm install --filter @zalo-center/web --no-frozen-lockfile

FROM node:22-alpine AS build
WORKDIR /app
ARG NEXT_PUBLIC_API_URL=http://localhost:4000/api
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY . .
RUN pnpm --filter @zalo-center/web build

FROM node:22-alpine AS runner
WORKDIR /app/apps/web
ENV NODE_ENV=production
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /app/node_modules /app/node_modules
COPY --from=build --chown=app:app /app/apps/web/node_modules ./node_modules
COPY --from=build --chown=app:app /app/apps/web/.next ./.next
COPY --from=build --chown=app:app /app/apps/web/public ./public
COPY --from=build --chown=app:app /app/apps/web/package.json ./package.json
COPY --from=build --chown=app:app /app/apps/web/next.config.ts ./next.config.ts
USER app
EXPOSE 3000
CMD ["node_modules/.bin/next", "start", "-p", "3000"]
