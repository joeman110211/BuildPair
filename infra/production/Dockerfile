FROM node:22.23.1-bookworm-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY
ARG EXPO_PUBLIC_API_URL=https://www.buildpair.co.uk
ARG EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY
ARG EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=qrrcn7ma

ENV EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=${EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY}
ENV EXPO_PUBLIC_API_URL=${EXPO_PUBLIC_API_URL}
ENV EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=${EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY}
ENV EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=${EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME}

RUN npm run build:web

FROM node:22.23.1-bookworm-slim AS runtime

ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY server.mjs ./server.mjs
COPY scripts/migrate.mjs ./scripts/migrate.mjs
COPY db/migrations ./db/migrations

USER node
EXPOSE 3000

CMD ["node", "server.mjs"]
