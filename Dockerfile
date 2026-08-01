# Multi-stage build: keeps the final image small by not shipping
# build-time tools/caches, only what's needed to actually run the app.
FROM node:20-alpine AS base
WORKDIR /app

# Copy only package files first — Docker caches layers, so if dependencies
# haven't changed, this layer is reused instead of re-running npm install
# on every build (much faster rebuilds during development).
COPY package*.json ./
RUN npm ci --omit=dev

# Now copy the actual source code.
COPY . .

# Document which port the app listens on (informational; doesn't publish it).
EXPOSE 5000

# Run as a non-root user for better container security.
USER node

CMD ["node", "src/server.js"]