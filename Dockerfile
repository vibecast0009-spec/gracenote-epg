# Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Run stage
FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/package.json ./
COPY --from=build /app/dist ./dist
VOLUME /data
ENV GRABBER_CONFIG_PATH=/data/config.json
# Default output path for tvheadend
ENV OUTPUT_FILE=/data/xmltv.xml
ENV CACHE_FILE=/data/cache.json
ENV ARCHIVE_DIR=/data/archive
ENTRYPOINT ["node", "dist/index.js"]
