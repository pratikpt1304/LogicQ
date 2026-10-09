# LogicQ Deployment Architecture & Infrastructure Guide

## 1. Executive Summary & Strategy
LogicQ is a full-stack real-time competitive programming platform featuring C code execution, WebSocket live scoreboards, and asynchronous task queues. This document outlines the hosting topology, platform choices, cost tiers, and step-by-step production runbooks.

---

## 2. Infrastructure Topology: What Runs Where

| Component | Technology | Target Environment (Production Recommended) | Free-Tier Fallback Environment |
| :--- | :--- | :--- | :--- |
| **Frontend SPA** | React + Vite + Tailwind | Cloudflare Pages / Vercel / Render Static | Cloudflare Pages / Vercel (Unlimited bandwidth, global CDN) |
| **Backend API & WebSockets** | Node.js + Express + Socket.IO | Render Web Service / Railway / Single VPS (Hetzner/DigitalOcean) | Render Free Web Service (Spins down on idle) or Fly.io |
| **Relational Database** | PostgreSQL 16 | Managed PostgreSQL (Railway / Supabase / Neon) | Supabase Free Tier (500MB DB, pooling included) / Neon Serverless |
| **Job Queue & Cache** | Redis 7 | Upstash Redis (Serverless) / Redis on VPS | Upstash Redis Free Tier (10,000 commands/day) or In-Memory fallback |
| **C Execution Judge** | Docker Container Sandbox / Judge0 | Isolated Linux Docker Runner / Judge0 Community API | Self-hosted Docker on VPS or Free Public Judge0 CE endpoint |

---

## 3. Why Firebase Hosting Alone Cannot Run LogicQ
A common misconception is deploying a competitive programming platform entirely onto Firebase Hosting. Firebase Hosting is strictly a **static asset Content Delivery Network (CDN)** and cannot run LogicQ because:

1. **No Long-Lived Processes**: Competitive code judging requires compiling and executing C code (`gcc -O2`) in an isolated subprocess with strict ulimits. Firebase Hosting only serves static HTML/JS/CSS.
2. **Firebase Cloud Functions Limitations**:
   - Cloud Functions runs in ephemeral serverless micro-VMs without root privileges or Docker daemon access.
   - `gcc` and standard build-essential packages are not installed in standard Node.js serverless runtimes.
   - Subprocesses cannot be strictly sandboxed against CPU or memory exhaustion without root cgroups.
   - Maximum execution timeouts and cold starts degrade code run latency.
3. **WebSocket Disconnects**: Socket.IO requires persistent TCP duplex connections for live contest scoreboards and submission status streaming. Serverless HTTP functions terminate after request/response cycles.
4. **Filesystem Constraints**: Local filesystem writes in serverless environments are ephemeral (typically limited to an in-memory `/tmp` mount) and do not support low-level Linux security policies (`seccomp`, `prlimit`, `chroot`).

---

## 4. Cost Estimates & Hosting Budgets

### Tier A: Absolute Free Tier (₹0 / $0 per month)
Designed for initial beta testing, hackathons, and zero-budget campus pilots.
- **Frontend**: Cloudflare Pages / Vercel (₹0)
- **Backend API**: Render Web Service (Free Tier, 512MB RAM — spins down after 15 min inactivity; cold start ~30s) (₹0)
- **Database**: Supabase PostgreSQL Free Tier (500MB storage) (₹0)
- **Queue/Cache**: Upstash Redis Free Tier (10,000 commands/day) (₹0)
- **Judge**: Free Judge0 CE Public API tier or in-process Local GCC Runner (if hosted on personal server/laptop via ngrok/Cloudflare Tunnel) (₹0)
- **Total Monthly Cost**: **₹0 / $0**

### Tier B: Recommended Production VPS Tier (₹450 – ₹750 / $5 – $9 per month)
Designed for 300–1000 campus users and up to 100 concurrent contestants during arena rounds.
- **Host**: 1x Hetzner Cloud CX22 (2 vCPU, 4 GB RAM, 40 GB NVMe) or DigitalOcean Droplet ($6/month)
- **All-in-One Docker Compose**:
  - Caddy / Nginx Reverse Proxy (Automatic Let's Encrypt SSL)
  - LogicQ React SPA (Static build served via Nginx/Caddy)
  - LogicQ Express API (Node.js 20 cluster mode via PM2/Docker)
  - PostgreSQL 16 container (mounted persistent volume)
  - Redis 7 container
  - Docker-in-Docker / Isolated Judge Worker container
- **Total Monthly Cost**: **~₹480/month (~$5.80 USD)**

---

## 5. Step-by-Step Production Deployment Runbook (Docker / VPS)

### Step 5.1: Server Provisioning
1. Launch an Ubuntu 24.04 LTS VPS instance (e.g., Hetzner CX22, DigitalOcean, or AWS EC2 t4g.medium).
2. Configure basic firewall (UFW):
   ```bash
   sudo ufw allow OpenSSH
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw enable
   ```
3. Install Docker Engine and Docker Compose:
   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   sudo usermod -aG docker $USER
   ```

### Step 5.2: Repository Setup & Configuration
1. Clone the repository into `/opt/logicq`:
   ```bash
   sudo git clone https://github.com/your-org/logicq.git /opt/logicq
   cd /opt/logicq
   ```
2. Create production environment file `/opt/logicq/.env.production`:
   ```env
   # Application
   NODE_ENV=production
   PORT=5000
   CLIENT_URL=https://logicq.yourcollege.edu

   # Security & Auth
   JWT_ACCESS_SECRET=your_hyper_secure_access_secret_min_32_chars
   JWT_REFRESH_SECRET=your_hyper_secure_refresh_secret_min_32_chars
   COOKIE_DOMAIN=logicq.yourcollege.edu
   COOKIE_SECURE=true
   SESSION_SECRET=your_session_secret_min_32_chars

   # Database
   DATABASE_URL=postgresql://logicq_user:strong_pg_pass@postgres:5432/logicq_prod?schema=public

   # Redis / Queue
   REDIS_URL=redis://redis:6379

   # Judge Configuration
   JUDGE_TYPE=DOCKER
   DOCKER_JUDGE_IMAGE=logicq-c-sandbox:latest
   MAX_CONCURRENT_JUDGES=4
   JUDGE_TIMEOUT_MS=2000
   JUDGE_MEMORY_LIMIT_MB=64

   # Admin Seed
   ADMIN_EMAIL=admin@logicq.yourcollege.edu
   ADMIN_PASSWORD=ProductionSuperAdminSecret2026!

   # Institutional Access
   AUTH_MODE=OPEN
   ALLOWED_EMAIL_DOMAINS=yourcollege.edu,alumni.yourcollege.edu
   ```

### Step 5.3: Production Docker Compose (`docker-compose.prod.yml`)
```yaml
version: '3.8'

services:
  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - server
      - client

  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: logicq_user
      POSTGRES_PASSWORD: strong_pg_pass
      POSTGRES_DB: logicq_prod
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U logicq_user -d logicq_prod"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: redis-server --appendonly yes
    volumes:
      - redisdata:/data

  server:
    build:
      context: ./server
      dockerfile: Dockerfile
    restart: unless-stopped
    env_file: .env.production
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started

  client:
    build:
      context: ./client
      dockerfile: Dockerfile
    restart: unless-stopped

volumes:
  caddy_data:
  caddy_config:
  pgdata:
  redisdata:
```

### Step 5.4: SSL Reverse Proxy Configuration (`Caddyfile`)
```caddy
logicq.yourcollege.edu {
    encode gzip zstd

    # API and WebSocket Routing
    handle /api/* {
        reverse_proxy server:5000
    }
    handle /socket.io/* {
        reverse_proxy server:5000 {
            header_up Host {host}
            header_up X-Real-IP {remote}
        }
    }

    # Frontend SPA
    handle {
        reverse_proxy client:80
    }
}
```

---

## 6. Database Backups, Restores & Health Monitoring

### Automated Daily Snapshots (Cron)
Create `/etc/cron.daily/logicq-backup`:
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/logicq"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
mkdir -p "$BACKUP_DIR"

# PostgreSQL Logical Dump
docker exec $(docker ps -qf "name=postgres") pg_dump -U logicq_user logicq_prod | gzip > "$BACKUP_DIR/db_$TIMESTAMP.sql.gz"

# Retain 14 days of backups
find "$BACKUP_DIR" -type f -name "*.sql.gz" -mtime +14 -delete
```
Make executable: `sudo chmod +x /etc/cron.daily/logicq-backup`.

### Backup Verification & Restore Test
To verify backup viability in a staging sandbox:
```bash
gunzip < /var/backups/logicq/db_20261009_000000.sql.gz | docker exec -i logicq_postgres_test psql -U logicq_user -d logicq_staging
```

### Health & Logging
- **Application Logs**: Streamed via Docker log driver (`docker compose logs -f --tail=100 server`).
- **Health Check Endpoint**: `GET /api/health` returns JSON `{ status: "ok", uptime, database: "connected", redis: "connected" }`.
- **External Monitoring**: Free UptimeRobot / BetterStack monitor hitting `https://logicq.yourcollege.edu/api/health` every 60 seconds with email/webhook alerting.
