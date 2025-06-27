# Dockerfile for Nitro (Node.js) backend
FROM node:23-alpine3.20 AS base

ARG PORT=3000

WORKDIR /app

# Build Stage
FROM base AS build

COPY  package.json package-lock.json* ./

RUN npm install

COPY . .

RUN npx nitro build

# Run Stage
FROM base AS run

COPY --from=build /app/.output /app/.output

EXPOSE ${PORT}

CMD ["node", ".output/server/index.mjs"]
