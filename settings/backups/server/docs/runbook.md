# Operational Runbook: Multi-Tenant Authentication System

**Service**: Quester Authentication API  
**Version**: 1.0.0  
**Last Updated**: 2025-10-29  
**On-Call**: #quester-ops (Slack), PagerDuty rotation

---

## Table of Contents

- [Service Overview](#service-overview)
- [Monitoring Setup](#monitoring-setup)
- [Alert Rules](#alert-rules)
- [Common Issues & Troubleshooting](#common-issues--troubleshooting)
- [Operational Procedures](#operational-procedures)
- [Incident Response](#incident-response)
- [Performance Tuning](#performance-tuning)
- [Disaster Recovery](#disaster-recovery)

---

## Service Overview

### Architecture

```
┌─────────────┐      ┌──────────────┐      ┌────────────┐
│   Clients   │─────▶│  API Server  │─────▶│ PostgreSQL │
│  (Mobile)   │      │  (Port 8080) │      │ (Port 5432)│
└─────────────┘      └──────┬───────┘      └────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │    Redis     │
                     │  (Port 6379) │
                     └──────────────┘
```

### Key Components

1. **API Server**: Go 1.24+ with Fiber framework
2. **PostgreSQL**: Primary data store (users, tokens)
3. **Redis**: Token blacklist, rate limiting, caching
4. **Prometheus**: Metrics collection
5. **Grafana**: Metrics visualization

### Service Dependencies

| Service | Critical? | Fallback Behavior |
|---------|-----------|-------------------|
| PostgreSQL | ✅ Yes | Service degraded, read-only mode |
| Redis | ⚠️ Partial | Rate limiting fails open, blacklist disabled |
| Metrics | ❌ No | Service continues, monitoring blind |

### Performance Targets (SLAs)

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Signup P95 | < 300ms | > 500ms |
| Login P95 | < 200ms | > 300ms |
| Refresh P95 | < 50ms | > 100ms |
| Logout P95 | < 100ms | > 200ms |
| Availability | 99.9% | < 99.5% |
| Error Rate | < 1% | > 5% |

---

## Monitoring Setup

### Prometheus Configuration

**File**: `/etc/prometheus/prometheus.yml`

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'quester-api'
    static_configs:
      - targets: ['localhost:8080']
    metrics_path: '/metrics'
```

### Grafana Dashboards

#### Dashboard: Authentication Overview

**Import ID**: `quester-auth-001`

**Panels**:
1. **Request Rate** (Graph)
   - Query: `rate(quester_http_requests_total[5m])`
   - Grouped by: `method`, `path`

2. **Latency P95** (Graph)
   - Query: `histogram_quantile(0.95, rate(quester_http_request_duration_seconds_bucket[5m]))`
   - Grouped by: `path`

3. **Error Rate** (Graph)
   - Query: `rate(quester_http_requests_total{status=~"5.."}[5m])`

4. **Active Database Connections** (Gauge)
   - Query: `quester_db_connections_active`

5. **Redis Cache Hit Rate** (Graph)
   - Query: `rate(quester_cache_hits_total[5m]) / rate(quester_cache_requests_total[5m])`

6. **Tenant Violations** (Counter)
   - Query: `increase(tenant_violation_attempts_total[1h])`

### Log Aggregation

**Tool**: Loki or ELK Stack

**Log Levels**:
- `DEBUG`: Disabled in production
- `INFO`: Normal operations, successful requests
- `WARN`: Rate limit exceeded, token refresh failed
- `ERROR`: Database errors, Redis failures, internal errors
- `FATAL`: Service startup failures

**Key Log Patterns**:

```log
# Successful login
INFO [2025-10-29T10:30:00Z] user_login user_id=123e4567 tenant_id=550e8400 login_streak=7

# Rate limit exceeded
WARN [2025-10-29T10:30:05Z] rate_limit_exceeded endpoint=/auth/login ip=203.0.113.42

# Tenant violation
ERROR [2025-10-29T10:30:10Z] tenant_violation user_id=123e4567 requested_tenant=550e8400 actual_tenant=660f9511

# Database error
ERROR [2025-10-29T10:30:15Z] database_error error="connection timeout" query="SELECT * FROM users"
```

---

## Alert Rules

### Critical Alerts (PagerDuty)

#### 1. Service Down

```yaml
alert: ServiceDown
expr: up{job="quester-api"} == 0
for: 1m
severity: critical
annotations:
  summary: "Quester API is down"
  description: "API server has been unreachable for 1 minute"
  runbook: "#service-down"
```

**Response**:
1. Check server status: `systemctl status quester-api`
2. Check logs: `journalctl -u quester-api -n 100`
3. Restart service: `systemctl restart quester-api`
4. If persists, check database connectivity

#### 2. High Error Rate

```yaml
alert: HighErrorRate
expr: rate(quester_http_requests_total{status=~"5.."}[5m]) > 0.05
for: 2m
severity: critical
annotations:
  summary: "Error rate > 5%"
  description: "API error rate has exceeded 5% for 2 minutes"
  runbook: "#high-error-rate"
```

**Response**:
1. Check error logs: `grep ERROR /var/log/quester/app.log | tail -50`
2. Identify error patterns (database, Redis, internal)
3. Check database health: `psql -U quester_user -c "SELECT 1"`
4. Check Redis health: `redis-cli PING`
5. Escalate if external dependency failure

#### 3. Database Connection Pool Exhausted

```yaml
alert: DBPoolExhausted
expr: quester_db_connections_active >= quester_db_max_connections * 0.9
for: 5m
severity: critical
annotations:
  summary: "Database connection pool nearly exhausted"
  description: "90% of database connections are in use"
  runbook: "#db-pool-exhausted"
```

**Response**:
1. Check active queries: `SELECT * FROM pg_stat_activity WHERE state = 'active'`
2. Kill long-running queries if needed: `SELECT pg_terminate_backend(pid)`
3. Increase connection pool size in `.env`: `DB_MAX_OPEN_CONNS=50`
4. Restart API server

### Warning Alerts (Slack)

#### 4. High Latency

```yaml
alert: HighLatency
expr: histogram_quantile(0.95, rate(quester_http_request_duration_seconds_bucket[5m])) > 0.3
for: 5m
severity: warning
annotations:
  summary: "API P95 latency > 300ms"
  description: "Response time exceeds SLA target"
  runbook: "#high-latency"
```

**Response**:
1. Check database query performance: `SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10`
2. Check Redis latency: `redis-cli --latency`
3. Review slow query logs
4. Consider adding database indexes

#### 5. Low Cache Hit Rate

```yaml
alert: LowCacheHitRate
expr: rate(quester_cache_hits_total[5m]) / rate(quester_cache_requests_total[5m]) < 0.5
for: 10m
severity: warning
annotations:
  summary: "Redis cache hit rate < 50%"
  description: "Cache is not effectively reducing database load"
  runbook: "#low-cache-hit-rate"
```

**Response**:
1. Check Redis memory usage: `redis-cli INFO memory`
2. Check eviction policy: `redis-cli CONFIG GET maxmemory-policy`
3. Consider increasing Redis memory: `maxmemory 512mb`
4. Review cache TTL configuration

#### 6. High Tenant Violations

```yaml
alert: HighTenantViolations
expr: increase(tenant_violation_attempts_total[1h]) > 50
for: 5m
severity: warning
annotations:
  summary: "High rate of tenant isolation violations"
  description: "Possible security issue or bug"
  runbook: "#high-tenant-violations"
```

**Response**:
1. Query audit logs: `SELECT * FROM audit_logs WHERE event_type='TENANT_VIOLATION' ORDER BY created_at DESC LIMIT 50`
2. Identify user patterns (single user or distributed)
3. If single user: Investigate account compromise, consider temporary ban
4. If distributed: Check for application bug, review recent deployments
5. Notify security team if suspicious activity

---

## Common Issues & Troubleshooting

### Issue: Login Failures (401 Unauthorized)

**Symptoms**:
- Users report "Invalid email or password"
- Error logs show authentication failures

**Diagnosis**:

```bash
# Check if user exists
psql -U quester_user -d quester_prod -c \
  "SELECT id, email, tenant_id FROM users WHERE email='user@example.com'"

# Check password hash
psql -U quester_user -d quester_prod -c \
  "SELECT id, email, password_hash FROM users WHERE email='user@example.com'"
```

**Resolution**:
1. **User not found**: User may have wrong tenant_id or email
2. **Password mismatch**: User may need password reset (implement in Phase 2)
3. **Rate limited**: Check rate limit status in Redis: `redis-cli GET "rate_limit:login:user@example.com"`

---

### Issue: Token Refresh Failures

**Symptoms**:
- Mobile apps stuck at login screen
- "Invalid or expired token" errors

**Diagnosis**:

```bash
# Check refresh token in database
psql -U quester_user -d quester_prod -c \
  "SELECT id, user_id, expires_at, revoked_at FROM refresh_tokens WHERE token_hash='<HASH>'"

# Check token blacklist in Redis
redis-cli GET "blacklist:<TOKEN_HASH>"
```

**Resolution**:
1. **Token expired**: Normal behavior, user needs to re-login
2. **Token revoked**: User logged out or logout-all was called
3. **Token blacklisted**: Check logout history
4. **Database connection issue**: Check database health

---

### Issue: High Memory Usage (OOM)

**Symptoms**:
- Server crashes with OOM error
- Slow response times
- `kubectl get pods` shows pod restarts

**Diagnosis**:

```bash
# Check memory usage
free -h
ps aux --sort=-%mem | head -10

# Check Go memory stats via API
curl http://localhost:8080/debug/pprof/heap > heap.prof
go tool pprof heap.prof
```

**Resolution**:
1. **Memory leak**: Review recent code changes, check for goroutine leaks
2. **Too many connections**: Reduce `DB_MAX_OPEN_CONNS`
3. **Large result sets**: Add pagination to queries
4. **Temporary spike**: Increase pod memory limits in k8s

---

### Issue: Database Connection Errors

**Symptoms**:
- "connection refused" errors
- "too many connections" errors
- Service unable to start

**Diagnosis**:

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check active connections
psql -U postgres -c \
  "SELECT count(*) FROM pg_stat_activity WHERE datname='quester_prod'"

# Check max connections
psql -U postgres -c "SHOW max_connections"
```

**Resolution**:
1. **PostgreSQL down**: Restart: `sudo systemctl restart postgresql`
2. **Too many connections**: Kill idle connections or increase `max_connections` in `postgresql.conf`
3. **Connection pool exhausted**: Increase `DB_MAX_OPEN_CONNS` or decrease `DB_CONN_MAX_LIFETIME`
4. **Network issue**: Check firewall rules, security groups

---

### Issue: Redis Connection Errors

**Symptoms**:
- Rate limiting not working
- Token blacklist failures
- "connection refused" errors

**Diagnosis**:

```bash
# Check Redis status
sudo systemctl status redis-server

# Test connection
redis-cli -a <PASSWORD> PING

# Check memory usage
redis-cli -a <PASSWORD> INFO memory
```

**Resolution**:
1. **Redis down**: Restart: `sudo systemctl restart redis-server`
2. **Memory full**: Increase `maxmemory` or clear old keys
3. **Authentication failure**: Verify `REDIS_PASSWORD` in `.env`
4. **Network issue**: Check firewall rules

**Fallback**: Service continues with Redis disabled (rate limiting fails open)

---

## Operational Procedures

### Procedure: Deploy New Version

**Frequency**: As needed (typically weekly)  
**Downtime**: Zero (rolling deployment)

**Steps**:

1. **Pre-deployment checks**:
   ```bash
   # Run tests
   go test ./...
   
   # Check code coverage
   go test -cover ./... | grep "coverage:"
   
   # Build binary
   go build -o server ./cmd/server
   ```

2. **Database migrations** (if applicable):
   ```bash
   # Backup database first
   pg_dump -U quester_user quester_prod > backup_$(date +%Y%m%d).sql
   
   # Run migrations (automatic on startup)
   ```

3. **Docker deployment**:
   ```bash
   # Build image
   docker build -t quester/api:v1.0.1 .
   
   # Push to registry
   docker push quester/api:v1.0.1
   
   # Rolling update
   docker-compose up -d --no-deps --build api
   ```

4. **Kubernetes deployment**:
   ```bash
   # Update image
   kubectl set image deployment/quester-api api=quester/api:v1.0.1 -n quester
   
   # Monitor rollout
   kubectl rollout status deployment/quester-api -n quester
   
   # If issues, rollback
   kubectl rollout undo deployment/quester-api -n quester
   ```

5. **Post-deployment verification**:
   ```bash
   # Health check
   curl http://api.quester.com/health
   
   # Test signup
   curl -X POST http://api.quester.com/api/v1/auth/signup \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"Test123!","username":"test","tenant_id":"..."}'
   
   # Check metrics
   curl http://localhost:8080/metrics | grep quester_http_requests_total
   ```

---

### Procedure: Token Cleanup (Maintenance)

**Frequency**: Daily at 2 AM UTC (automated)  
**Downtime**: None

**Manual Execution**:

```sql
-- Connect to database
psql -U quester_user -d quester_prod

-- Check expired tokens
SELECT COUNT(*) FROM refresh_tokens 
WHERE expires_at < NOW();

-- Delete expired and revoked tokens (older than 30 days)
DELETE FROM refresh_tokens 
WHERE expires_at < NOW() 
  OR (revoked_at IS NOT NULL AND revoked_at < NOW() - INTERVAL '30 days');

-- Reclaim storage
VACUUM FULL refresh_tokens;
```

**Verify Cleanup**:

```bash
# Check service logs
grep "token_cleanup" /var/log/quester/app.log

# Check Prometheus metric
curl http://localhost:8080/metrics | grep token_cleanup_last_run
```

---

### Procedure: Database Backup

**Frequency**: Daily at 3 AM UTC (automated)  
**Retention**: 7 days rolling, 4 weekly backups, 12 monthly backups

**Manual Backup**:

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=/var/backups/quester
mkdir -p $BACKUP_DIR

# Full backup
pg_dump -U quester_user -d quester_prod \
  -F c \
  -f $BACKUP_DIR/quester_prod_$DATE.dump

# Verify backup
pg_restore --list $BACKUP_DIR/quester_prod_$DATE.dump | head

# Upload to S3 (if configured)
aws s3 cp $BACKUP_DIR/quester_prod_$DATE.dump \
  s3://quester-backups/database/

# Cleanup old backups
find $BACKUP_DIR -name "*.dump" -mtime +7 -delete
```

**Restore from Backup**:

```bash
# Stop API server
systemctl stop quester-api

# Drop and recreate database
psql -U postgres -c "DROP DATABASE IF EXISTS quester_prod"
psql -U postgres -c "CREATE DATABASE quester_prod OWNER quester_user"

# Restore
pg_restore -U quester_user -d quester_prod \
  -v /var/backups/quester/quester_prod_20251029_030000.dump

# Start API server
systemctl start quester-api
```

---

### Procedure: Key Rotation (JWT Keys)

**Frequency**: Every 12 months  
**Downtime**: Minimal (gradual rollover)

**Steps**:

1. **Generate new key pair**:
   ```bash
   cd /opt/quester/keys
   openssl genrsa -out private_new.pem 4096
   openssl rsa -in private_new.pem -pubout -out public_new.pem
   ```

2. **Base64 encode**:
   ```bash
   JWT_PRIVATE_KEY_NEW=$(cat private_new.pem | base64 -w 0)
   JWT_PUBLIC_KEY_NEW=$(cat public_new.pem | base64 -w 0)
   ```

3. **Deploy with dual-key support** (Phase 1: 7 days):
   ```env
   JWT_PRIVATE_KEY=$JWT_PRIVATE_KEY_NEW  # Sign with new key
   JWT_PUBLIC_KEY=$JWT_PUBLIC_KEY_NEW     # Verify with new key
   JWT_PUBLIC_KEY_OLD=$JWT_PUBLIC_KEY     # Also verify with old key
   ```

4. **Monitor token refresh** (Phase 2: 30 days):
   - All tokens gradually refreshed to new key
   - Old tokens expire after 30 days

5. **Remove old key** (Phase 3: After 30 days):
   ```env
   JWT_PRIVATE_KEY=$JWT_PRIVATE_KEY_NEW
   JWT_PUBLIC_KEY=$JWT_PUBLIC_KEY_NEW
   # Remove JWT_PUBLIC_KEY_OLD
   ```

6. **Archive old keys**:
   ```bash
   mv private.pem private_archived_$(date +%Y%m%d).pem
   mv public.pem public_archived_$(date +%Y%m%d).pem
   mv private_new.pem private.pem
   mv public_new.pem public.pem
   ```

---

## Incident Response

### Severity Levels

| Level | Description | Response Time | Examples |
|-------|-------------|---------------|----------|
| **P1 - Critical** | Service down, data loss | 15 minutes | API unreachable, database corruption |
| **P2 - High** | Degraded service, security issue | 1 hour | High error rate, tenant violations spike |
| **P3 - Medium** | Performance degradation | 4 hours | Latency above target, cache miss rate high |
| **P4 - Low** | Non-critical issue | 24 hours | Documentation outdated, minor bugs |

### Incident Workflow

1. **Detection**: Alert fires or user report
2. **Acknowledge**: On-call engineer acknowledges in PagerDuty
3. **Triage**: Assess severity, identify affected users
4. **Communicate**: Post in #incidents Slack channel
5. **Mitigate**: Apply immediate fix or rollback
6. **Resolve**: Verify issue resolved, close alert
7. **Post-mortem**: Write incident report (for P1/P2)

### Contact Escalation

1. **Primary On-Call**: PagerDuty rotation (15 min SLA)
2. **Backup On-Call**: PagerDuty rotation (if no response)
3. **Engineering Lead**: @jane-doe (Slack)
4. **CTO**: @john-smith (Slack) - for P1 incidents only

---

## Performance Tuning

### Database Optimization

**Indexes**:
```sql
-- Already created by migrations
CREATE INDEX idx_tenant_id ON users(tenant_id);
CREATE UNIQUE INDEX idx_tenant_email ON users(tenant_id, email);
CREATE INDEX idx_user_tokens ON refresh_tokens(user_id);
CREATE UNIQUE INDEX idx_token_hash ON refresh_tokens(token_hash);
```

**Query Optimization**:
```sql
-- Slow query analysis
SELECT query, calls, total_time, mean_time 
FROM pg_stat_statements 
ORDER BY total_time DESC 
LIMIT 10;

-- Add missing indexes
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at);
```

**Connection Pooling Tuning**:
```env
# Small instance (2GB RAM)
DB_MAX_OPEN_CONNS=10
DB_MAX_IDLE_CONNS=2

# Medium instance (4GB RAM)
DB_MAX_OPEN_CONNS=25
DB_MAX_IDLE_CONNS=5

# Large instance (8GB+ RAM)
DB_MAX_OPEN_CONNS=50
DB_MAX_IDLE_CONNS=10
```

### Redis Optimization

**Memory Policy**:
```conf
maxmemory 512mb
maxmemory-policy allkeys-lru  # Evict least recently used keys
```

**Persistence**:
```conf
# AOF for durability
appendonly yes
appendfsync everysec

# RDB for backups
save 900 1      # Save if 1 key changed in 15 min
save 300 10     # Save if 10 keys changed in 5 min
save 60 10000   # Save if 10k keys changed in 1 min
```

### Application Tuning

**Go Runtime**:
```bash
# Set GOMAXPROCS to number of CPU cores
export GOMAXPROCS=4

# Enable pprof for profiling
export PPROF_ENABLED=true
```

**Fiber Configuration**:
```go
app := fiber.New(fiber.Config{
    Prefork:       false,  // Use false for graceful shutdowns
    ReadTimeout:   time.Second * 10,
    WriteTimeout:  time.Second * 10,
    IdleTimeout:   time.Second * 120,
    ReadBufferSize: 4096,
    WriteBufferSize: 4096,
})
```

---

## Disaster Recovery

### Recovery Time Objective (RTO)

- **Target**: 1 hour
- **Maximum acceptable**: 4 hours

### Recovery Point Objective (RPO)

- **Target**: 1 hour (hourly backups)
- **Maximum acceptable**: 24 hours (daily backups)

### Disaster Scenarios

#### Scenario 1: Complete Database Loss

1. **Restore from latest backup**:
   ```bash
   pg_restore -U quester_user -d quester_prod \
     /var/backups/quester/latest.dump
   ```

2. **Verify data integrity**:
   ```sql
   SELECT COUNT(*) FROM users;
   SELECT COUNT(*) FROM refresh_tokens;
   ```

3. **Restart API server**

**Expected Downtime**: 30-60 minutes

#### Scenario 2: Data Center Outage

1. **Failover to secondary region** (if configured)
2. **Update DNS to point to backup cluster**
3. **Verify database replication is up-to-date**

**Expected Downtime**: 5-15 minutes

#### Scenario 3: Security Breach

1. **Immediately revoke all tokens**:
   ```sql
   UPDATE refresh_tokens SET revoked_at = NOW();
   ```

2. **Rotate JWT keys** (follow key rotation procedure)

3. **Force all users to re-login**

4. **Conduct security audit**

5. **Notify affected users**

**Expected Downtime**: 2-4 hours (investigation + mitigation)

---

## Appendix

### Useful Commands

```bash
# Check API health
curl http://localhost:8080/health

# View metrics
curl http://localhost:8080/metrics | grep quester

# Tail application logs
tail -f /var/log/quester/app.log

# Database connection test
psql -U quester_user -d quester_prod -c "SELECT 1"

# Redis connection test
redis-cli -a $REDIS_PASSWORD PING

# Check service status
systemctl status quester-api

# Restart service
systemctl restart quester-api

# View recent errors
journalctl -u quester-api -p err -n 50

# Check disk space
df -h

# Check memory usage
free -h

# Check CPU usage
top -bn1 | grep "Cpu(s)"

# Network connectivity test
nc -zv api.quester.com 8080
```

### Emergency Contacts

- **Engineering Lead**: jane@quester.com, +1-555-0100
- **DevOps Lead**: bob@quester.com, +1-555-0101
- **Security Team**: security@quester.com
- **Database DBA**: dba@quester.com

### Related Documentation

- [Deployment Guide](deployment.md)
- [API Documentation](swagger.yaml)
- [Architecture Overview](../docs/architecture.md)
- [Security Policies](../docs/security.md)

---

**Document Owner**: DevOps Team  
**Review Frequency**: Quarterly  
**Last Review**: 2025-10-29  
**Next Review**: 2026-01-29
