FROM node:20-bullseye-slim

# Install GCC, make, and build-essential for C11 compilation
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    libc6-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency definitions and Prisma schema
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies & generate Prisma client
RUN npm install
RUN npx prisma generate

# Copy source code
COPY . .

# Build TypeScript to JavaScript
RUN npm run build

EXPOSE 5000

ENV NODE_ENV=production
ENV PORT=5000
ENV JUDGE_TYPE=local_gcc

CMD ["npm", "start"]
