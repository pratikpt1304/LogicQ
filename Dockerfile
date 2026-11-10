FROM node:20-bookworm-slim

# Install GCC, make, and build-essential for C11 compilation
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    libc6-dev \
    && rm -rf /var/lib/apt/lists/*

# Create unprivileged sandbox runtime user
RUN useradd -m -u 1000 -s /bin/bash sandbox && \
    mkdir -p /app /tmp/logicq_judge && \
    chown -R sandbox:sandbox /app /tmp/logicq_judge

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

# Ensure sandbox user owns app directory (for SQLite DB writes) and judge scratchpad
RUN chown -R sandbox:sandbox /app /tmp/logicq_judge

USER sandbox

EXPOSE 5000

ENV NODE_ENV=production
ENV PORT=5000
ENV JUDGE_TYPE=local_gcc
ENV DATABASE_URL="file:./prisma/prod.db"
ENV JUDGE_WORKING_ROOT="/tmp/logicq_judge"

# Ensure SQLite schema is prepared and start server under non-root sandbox user
CMD ["sh", "-c", "npx prisma db push && npm start"]
