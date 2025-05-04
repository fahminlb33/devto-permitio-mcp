FROM node:23-alpine AS base

# Build image
FROM base AS builder

ENV NODE_ENV=development
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Runtime image
FROM base AS runtime

ARG APP="mcp"
ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY --from=builder /app/dist ./

CMD [ "node", "app.${APP}.js" ]
