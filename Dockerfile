FROM node:20-bookworm-slim

# Install GCC, make, and build-essential for C11 compilation
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    libc6-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy server package files and prisma directory from server/
COPY server/package*.json ./
COPY server/prisma/ ./prisma/

# Install dependencies & generate Prisma client
RUN npm install
RUN npx prisma generate

# Copy server source code and config
COPY server/ .

# Build TypeScript to JavaScript
RUN npm run build

EXPOSE 5000

ENV NODE_ENV=production
ENV PORT=5000
ENV JUDGE_TYPE=local_gcc
ENV DATABASE_URL="file:./prisma/prod.db"

# Ensure SQLite schema is prepared and start server
CMD ["sh", "-c", "npx prisma db push && npm start"]
