# Deployment Guide: Multi-Tenant Authentication System

This guide provides comprehensive instructions for deploying the Quester Multi-Tenant Authentication API to production.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Configuration](#environment-configuration)
- [JWT Key Generation](#jwt-key-generation)
- [Database Setup](#database-setup)
- [Redis Setup](#redis-setup)
- [Docker Deployment](#docker-deployment)
- [Kubernetes Deployment](#kubernetes-deployment)
- [Health Checks](#health-checks)
- [Monitoring](#monitoring)
- [Security Hardening](#security-hardening)

---

## Prerequisites

### Required Software
- **Go**: 1.24+ ([download](https://golang.org/dl/))
- **PostgreSQL**: 15+ ([download](https://www.postgresql.org/download/))
- **Redis**: 7+ ([download](https://redis.io/download))
- **Docker**: 24+ (optional, for containerized deployment)
- **Kubernetes**: 1.28+ (optional, for k8s deployment)

### System Requirements
- **CPU**: 2+ cores (4+ recommended for production)
- **RAM**: 2GB minimum (4GB+ recommended)
- **Disk**: 10GB+ available space
- **Network**: Ports 8080 (API), 5432 (PostgreSQL), 6379 (Redis)

---

## Environment Configuration

### 1. Create Environment File

Copy the example environment file and customize it:

```bash
cp .env.example .env
```

### 2. Configure Environment Variables

Edit `.env` with production values:

```env
# Database Configuration
DATABASE_URL=postgres://quester_user:STRONG_PASSWORD@db-host:5432/quester_prod?sslmode=require
DB_MAX_OPEN_CONNS=25
DB_MAX_IDLE_CONNS=5
DB_CONN_MAX_LIFETIME=5m
DB_LOG_QUERIES=false

# Redis Configuration
REDIS_URL=redis://redis-host:6379
REDIS_PASSWORD=STRONG_REDIS_PASSWORD
REDIS_DB=0

# JWT Configuration (generated in next section)
JWT_PRIVATE_KEY=<BASE64_ENCODED_PRIVATE_KEY>
JWT_PUBLIC_KEY=<BASE64_ENCODED_PUBLIC_KEY>
JWT_ACCESS_EXPIRY=1h
JWT_REFRESH_EXPIRY=720h  # 30 days

# Security
BCRYPT_COST=12  # DO NOT CHANGE (non-negotiable per constitution)

# Rate Limiting (requests per time window)
RATE_LIMIT_SIGNUP_MAX=5
RATE_LIMIT_SIGNUP_WINDOW=1h
RATE_LIMIT_LOGIN_MAX=10
RATE_LIMIT_LOGIN_WINDOW=15m
RATE_LIMIT_REFRESH_MAX=60
RATE_LIMIT_REFRESH_WINDOW=1h

# Server Configuration
PORT=8080
ENV=production
LOG_LEVEL=info

# CORS
CORS_ALLOWED_ORIGINS=https://app.quester.com,https://www.quester.com
CORS_ALLOWED_METHODS=GET,POST,PUT,DELETE,OPTIONS
CORS_ALLOWED_HEADERS=Origin,Content-Type,Authorization

# Metrics
METRICS_ENABLED=true
METRICS_PATH=/metrics
```

**⚠️ SECURITY**: Never commit `.env` to version control!

---

## JWT Key Generation

### 1. Generate RSA Key Pair

Run the following commands to generate 4096-bit RSA keys:

```bash
# Create keys directory
mkdir -p .keys
cd .keys

# Generate private key
openssl genrsa -out private.pem 4096

# Generate public key
openssl rsa -in private.pem -pubout -out public.pem

# Verify key pair
openssl rsa -in private.pem -check
```

### 2. Base64 Encode Keys

```bash
# Encode private key
JWT_PRIVATE_KEY=$(cat private.pem | base64 -w 0)

# Encode public key
JWT_PUBLIC_KEY=$(cat public.pem | base64 -w 0)

# Output for .env file
echo "JWT_PRIVATE_KEY=$JWT_PRIVATE_KEY"
echo "JWT_PUBLIC_KEY=$JWT_PUBLIC_KEY"
```

### 3. Secure Key Storage

```bash
# Set restrictive permissions
chmod 600 private.pem
chmod 644 public.pem

# Owner-only access
chown app-user:app-user *.pem
```

**⚠️ CRITICAL**: 
- **Never** expose `private.pem` in logs, environment dumps, or error messages
- Rotate keys every 12 months
- Use secret management systems (AWS Secrets Manager, HashiCorp Vault) in production

---

## Database Setup

### 1. Create Database and User

```sql
-- Connect to PostgreSQL as superuser
psql -U postgres

-- Create dedicated database user
CREATE USER quester_user WITH PASSWORD 'STRONG_PASSWORD';

-- Create database
CREATE DATABASE quester_prod OWNER quester_user;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE quester_prod TO quester_user;

-- Enable UUID extension
\c quester_prod
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### 2. Run Migrations

The application automatically runs migrations on startup via GORM AutoMigrate:

```bash
cd server
go run cmd/server/main.go
```

**Manual Migration** (if needed):

```bash
# Connect to database
psql -U quester_user -d quester_prod

# Verify tables created
\dt

# Expected tables:
# - users
# - refresh_tokens
# - audit_logs
```

### 3. Database Connection Pooling

The application uses these pool settings (configured in `.env`):

- **MaxOpenConns**: 25 (maximum connections)
- **MaxIdleConns**: 5 (idle connections kept alive)
- **ConnMaxLifetime**: 5m (connection reuse time)

**Tuning for Production**:
- **Small instance**: `MaxOpenConns=10`, `MaxIdleConns=2`
- **Medium instance**: `MaxOpenConns=25`, `MaxIdleConns=5` (default)
- **Large instance**: `MaxOpenConns=50`, `MaxIdleConns=10`

### 4. Database Backups

Set up automated backups:

```bash
# Daily backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=/var/backups/quester
mkdir -p $BACKUP_DIR

pg_dump -U quester_user -d quester_prod \
  -F c \
  -f $BACKUP_DIR/quester_prod_$DATE.dump

# Retain last 7 days
find $BACKUP_DIR -name "*.dump" -mtime +7 -delete
```

---

## Redis Setup

### 1. Install and Configure Redis

```bash
# Install Redis
sudo apt update
sudo apt install redis-server

# Configure Redis
sudo nano /etc/redis/redis.conf
```

**Production Configuration**:

```conf
# Bind to localhost and internal network
bind 127.0.0.1 10.0.0.5

# Require password
requirepass STRONG_REDIS_PASSWORD

# Enable AOF persistence
appendonly yes
appendfsync everysec

# Memory policy (LRU eviction)
maxmemory 256mb
maxmemory-policy allkeys-lru

# Disable dangerous commands
rename-command FLUSHDB ""
rename-command FLUSHALL ""
rename-command CONFIG ""
```

### 2. Start Redis

```bash
sudo systemctl enable redis-server
sudo systemctl start redis-server
sudo systemctl status redis-server
```

### 3. Verify Connection

```bash
redis-cli -a STRONG_REDIS_PASSWORD
> PING
PONG
> SET test "Hello"
OK
> GET test
"Hello"
> DEL test
> EXIT
```

---

## Docker Deployment

### 1. Create Dockerfile

```dockerfile
# Build stage
FROM golang:1.24-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o server ./cmd/server

# Production stage
FROM alpine:latest

RUN apk --no-cache add ca-certificates
WORKDIR /root/

# Copy binary
COPY --from=builder /app/server .

# Copy JWT keys (mounted as secret in production)
# COPY .keys/ ./.keys/

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Run
CMD ["./server"]
```

### 2. Create docker-compose.yml

```yaml
version: '3.8'

services:
  api:
    build: ./server
    ports:
      - "8080:8080"
    environment:
      DATABASE_URL: postgres://quester_user:password@db:5432/quester_prod?sslmode=disable
      REDIS_URL: redis://redis:6379
      JWT_PRIVATE_KEY: ${JWT_PRIVATE_KEY}
      JWT_PUBLIC_KEY: ${JWT_PUBLIC_KEY}
    depends_on:
      - db
      - redis
    restart: unless-stopped

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: quester_user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: quester_prod
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass password
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

### 3. Build and Run

```bash
# Build image
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop services
docker-compose down
```

---

## Kubernetes Deployment

### 1. Create Namespace

```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: quester
```

### 2. Create Secrets

```yaml
# secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: quester-secrets
  namespace: quester
type: Opaque
stringData:
  database-url: "postgres://quester_user:PASSWORD@postgres:5432/quester_prod?sslmode=require"
  redis-url: "redis://redis:6379"
  redis-password: "STRONG_REDIS_PASSWORD"
  jwt-private-key: "BASE64_ENCODED_PRIVATE_KEY"
  jwt-public-key: "BASE64_ENCODED_PUBLIC_KEY"
```

### 3. Create Deployment

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: quester-api
  namespace: quester
spec:
  replicas: 3
  selector:
    matchLabels:
      app: quester-api
  template:
    metadata:
      labels:
        app: quester-api
    spec:
      containers:
      - name: api
        image: quester/api:latest
        ports:
        - containerPort: 8080
        envFrom:
        - secretRef:
            name: quester-secrets
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 10
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

### 4. Create Service

```yaml
# service.yaml
apiVersion: v1
kind: Service
metadata:
  name: quester-api
  namespace: quester
spec:
  selector:
    app: quester-api
  ports:
  - port: 80
    targetPort: 8080
  type: LoadBalancer
```

### 5. Apply Manifests

```bash
kubectl apply -f namespace.yaml
kubectl apply -f secrets.yaml
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml

# Verify deployment
kubectl get pods -n quester
kubectl get svc -n quester
```

---

## Health Checks

The API exposes health check endpoints:

### `/health`
Returns server health status:

```json
{
  "status": "healthy",
  "timestamp": "2025-10-29T10:30:00Z",
  "version": "1.0.0"
}
```

### `/metrics`
Prometheus metrics for monitoring (if `METRICS_ENABLED=true`):

```
# HELP quester_http_requests_total Total HTTP requests
# TYPE quester_http_requests_total counter
quester_http_requests_total{method="POST",path="/api/v1/auth/login",status="200"} 1234

# HELP quester_http_request_duration_seconds HTTP request latency
# TYPE quester_http_request_duration_seconds histogram
quester_http_request_duration_seconds_bucket{method="POST",path="/api/v1/auth/login",le="0.1"} 1100
```

---

## Monitoring

### Recommended Monitoring Stack

1. **Prometheus**: Metrics collection
2. **Grafana**: Visualization dashboards
3. **Loki**: Log aggregation
4. **Alertmanager**: Alert routing

### Key Metrics to Monitor

- **Request Rate**: `quester_http_requests_total`
- **Latency**: `quester_http_request_duration_seconds_bucket`
- **Error Rate**: `quester_http_requests_total{status=~"5.."}`
- **Database Connections**: `quester_db_connections_active`
- **Redis Hits**: `quester_cache_hits_total`
- **Token Violations**: `tenant_violation_attempts_total`

### Alerting Rules

```yaml
groups:
- name: quester_alerts
  rules:
  - alert: HighLatency
    expr: histogram_quantile(0.95, quester_http_request_duration_seconds_bucket) > 0.2
    for: 5m
    annotations:
      summary: "API P95 latency > 200ms"
  
  - alert: HighErrorRate
    expr: rate(quester_http_requests_total{status=~"5.."}[5m]) > 0.05
    for: 2m
    annotations:
      summary: "Error rate > 5%"
```

---

## Security Hardening

### 1. HTTPS/TLS

Use a reverse proxy (Nginx, Caddy) for TLS termination:

```nginx
server {
    listen 443 ssl http2;
    server_name api.quester.com;

    ssl_certificate /etc/letsencrypt/live/api.quester.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.quester.com/privkey.pem;
    ssl_protocols TLSv1.3 TLSv1.2;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 2. Firewall Rules

```bash
# Allow only necessary ports
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 443/tcp  # HTTPS
sudo ufw deny 8080/tcp  # Block direct API access
sudo ufw enable
```

### 3. Database Security

- Use SSL/TLS for database connections (`sslmode=require`)
- Restrict database access to application servers only
- Use strong passwords (20+ characters, alphanumeric + symbols)
- Enable audit logging for compliance

### 4. Secret Management

Use a secrets management system in production:

- **AWS Secrets Manager**
- **HashiCorp Vault**
- **Kubernetes Secrets** with encryption at rest

### 5. Rate Limiting at Edge

Configure rate limiting at the load balancer level:

```yaml
# AWS WAF example
- RateBasedStatement:
    Limit: 1000
    AggregateKeyType: IP
```

---

## Rollback Procedure

If deployment fails:

```bash
# Docker
docker-compose down
docker-compose up -d --build

# Kubernetes
kubectl rollout undo deployment/quester-api -n quester
kubectl rollout status deployment/quester-api -n quester
```

---

## Troubleshooting

### Issue: Database Connection Failed

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check connectivity
psql -U quester_user -d quester_prod -h localhost

# Check logs
sudo tail -f /var/log/postgresql/postgresql-15-main.log
```

### Issue: Redis Connection Failed

```bash
# Check Redis status
sudo systemctl status redis-server

# Check connectivity
redis-cli -a PASSWORD PING

# Check logs
sudo tail -f /var/log/redis/redis-server.log
```

### Issue: JWT Signing Failed

```bash
# Verify keys exist and are readable
ls -la .keys/
cat .keys/private.pem | head -1  # Should show "-----BEGIN RSA PRIVATE KEY-----"

# Check base64 encoding
echo $JWT_PRIVATE_KEY | base64 -d | head -1
```

---

## Maintenance

### Token Cleanup

The application automatically runs token cleanup every 24 hours. Manual cleanup:

```sql
-- Connect to database
psql -U quester_user -d quester_prod

-- Delete expired tokens
DELETE FROM refresh_tokens 
WHERE expires_at < NOW() 
  AND (revoked_at IS NOT NULL OR revoked_at < NOW() - INTERVAL '30 days');
```

### Database Vacuuming

```sql
-- Reclaim storage
VACUUM FULL users;
VACUUM FULL refresh_tokens;
VACUUM FULL audit_logs;
```

---

## Support

For deployment issues, contact:
- **Email**: ops@quester.com
- **Slack**: #quester-ops
- **On-call**: PagerDuty rotation

---

**Last Updated**: 2025-10-29
**Version**: 1.0.0
