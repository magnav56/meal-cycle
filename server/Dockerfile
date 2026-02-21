FROM node:20-alpine AS base
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .

# Dev target — used by docker-compose for hot-reload
FROM base AS dev
CMD ["npm", "run", "dev"]

# Production build
FROM base AS build
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
EXPOSE 3001
CMD ["npm", "start"]
