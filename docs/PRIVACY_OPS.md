# LogicQ Privacy Architecture, Data Governance & Operational Runbook

## 1. Data Inventory & Privacy Matrix

LogicQ adheres to the principle of **Data Minimization**. We collect only the information strictly necessary to authenticate users, compile and judge C source code, and maintain contest leaderboards.

| Data Category | Specific Fields | Processing Purpose | Legal Basis / Reason | Retention Period |
| :--- | :--- | :--- | :--- | :--- |
| **Identity Data** | Full Name, Email Address | Authentication, account verification, password reset, identifying student on leaderboard. | User Consent & Contractual Service Provision | Retained until user deletes account. |
| **Security Credential** | Bcrypt Password Hash (Salt rounds: 12) | Verifying user login. Plaintext passwords are NEVER logged or stored. | Security & Authentication | Retained until password change or account deletion. |
| **Academic Attribution** | College / University Name, Graduation Year (Optional) | Displaying campus-specific leaderboards and club rankings. | Legitimate Educational Interest / User Consent | Retained until user edits profile or deletes account. |
| **Technical Telemetry** | Client IP Address, User Agent | Security rate-limiting, brute-force mitigation, anti-cheating investigation. | Platform Security & Integrity Protection | Rolling retention for 30 days, then purged or anonymized. |
| **Code Submissions** | C Source Code, Compiler Output, Verdicts, Runtime (ms), Memory (KB) | Evaluating problem correctness, tracking student progress, displaying personal submission history. | Core Platform Functionality | Retained indefinitely as academic portfolio, or erased upon user account deletion. |

---

## 2. Compliance with India's DPDP Act (Digital Personal Data Protection Act, 2023)

> **LEGAL NOTICE**: *The measures documented below represent good-faith technical safeguards aligned with data privacy principles. They do not constitute formal legal counsel. Institutional deployments should consult qualified legal advisors.*

### Practical DPDP Alignment Principles:
1. **Notice & Explicit Consent**:
   - During registration, students are presented with an unbundled, plain-language consent statement:
     *"By creating an account, you consent to LogicQ processing your name, email, and C code submissions for academic grading and leaderboard rankings."*
2. **Purpose Limitation**:
   - Personal data collected by LogicQ is strictly prohibited from being sold, shared with third-party advertisers, or used for cross-site behavioral tracking.
3. **Right to Correction & Erasure (Account Deletion)**:
   - Users possess an accessible self-service **"Delete My Account"** option in their Profile Settings.
   - Triggering deletion executes an atomic transaction:
     - Removes `User`, `RefreshToken`, and personal profile fields.
     - Submissions are either permanently expunged or stripped of all identifiers (`userId = null`, name replaced with `[Deleted User]`) so historical contest math remains mathematically sound without retaining personal data.

---

## 3. Plain-Language Privacy Notice (Student-Facing)

```
================================================================================
                    LOGICQ STUDENT PRIVACY COMMITMENT
================================================================================
1. What We Collect: Your name, email, password hash, and the C code you write.
2. Why We Collect It: To log you in, compile and test your solutions, track
   your streaks, and display your rank on the scoreboard.
3. What We Never Do: We will NEVER sell your data, show you third-party ads,
   or install spyware on your computer.
4. Your Code: Your solutions are yours. We only store them so you can review
   your submission history and prove your achievements.
5. Your Right to Leave: You can export your data or delete your account at any
   time with one click in your settings.
================================================================================
```

---

## 4. Operational Backups & Disaster Recovery

### Backup Strategy
1. **Automated Database Snapshots**:
   - Daily automated `pg_dump` compressed with gzip to `/var/backups/logicq/`.
   - Off-site mirror sync to an encrypted S3-compatible bucket (Cloudflare R2 or AWS S3 Glacier).
2. **Snapshot Retention**:
   - Keep daily snapshots for 7 days.
   - Keep weekly snapshots for 4 weeks.
   - Keep monthly snapshots for 6 months.

### Tested Restore Procedure
```bash
# 1. Stop the application server to prevent incoming writes
docker compose stop server

# 2. Re-create clean target database
docker exec -i logicq_postgres psql -U logicq_user -c "DROP DATABASE logicq_prod;"
docker exec -i logicq_postgres psql -U logicq_user -c "CREATE DATABASE logicq_prod;"

# 3. Restore from uncompressed dump
gunzip < /var/backups/logicq/logicq_prod_20261009.sql.gz | docker exec -i logicq_postgres psql -U logicq_user -d logicq_prod

# 4. Run Prisma schema migrations to ensure up-to-date schema
docker compose run --rm server npx prisma migrate deploy

# 5. Restart application services
docker compose start server
```

---

## 5. Incident Response & Triage Runbook

### Incident Scenario A: Judge Worker Offline / Sandbox Failure
* **Symptoms**: Submissions stuck in `PENDING` or returning `JUDGE_UNAVAILABLE`.
* **Triage Steps**:
  1. Inspect worker container status: `docker ps -a | grep judge`.
  2. Check disk space on judge host: `df -h /tmp` (ensure temp directories are not full).
  3. Inspect supervisor logs: `docker logs --tail 200 logicq_judge_worker`.
  4. If Docker daemon socket unresponsive: restart Docker service `sudo systemctl restart docker`.
  5. Fallback: Temporarily divert traffic to secondary Judge0 instance by updating `JUDGE_TYPE=JUDGE0` in `.env` and reloading server (`docker compose restart server`).

### Incident Scenario B: Database Connection Exhaustion (P1000 / Connection Timeout)
* **Symptoms**: API returning 500 errors; Prisma reporting connection pool exhaustion.
* **Triage Steps**:
  1. Check PostgreSQL active connections:
     ```sql
     SELECT count(*), state FROM pg_stat_activity GROUP BY state;
     ```
  2. Restart Node.js application to flush stale connections: `docker compose restart server`.
  3. Tune Prisma connection pool limit in `.env`: `DATABASE_URL=...?connection_limit=20&pool_timeout=10`.
  4. Enable PgBouncer connection pooling for large contest spikes.

### Incident Scenario C: Malicious Submission Flood / Queue Congestion
* **Symptoms**: Queue latency spikes above 10 seconds; CPU high.
* **Triage Steps**:
  1. Inspect Redis queue depth: `docker exec -it logicq_redis redis-cli llen bull:submissions:wait`.
  2. Identify abusing IP or user ID:
     ```sql
     SELECT "userId", count(*) FROM "Submission" WHERE "createdAt" > NOW() - INTERVAL '5 minutes' GROUP BY "userId" ORDER BY count DESC LIMIT 5;
     ```
  3. Apply temporary IP rate-limit block via Caddy/Nginx or suspend offending account.
  4. Clear deadlocked jobs: `docker exec -it logicq_redis redis-cli FLUSHDB`.
