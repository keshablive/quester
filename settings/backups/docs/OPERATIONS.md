# Quester Platform - Operations Manual

## 1. Deployment Guide

### Prerequisites
- Docker & Docker Compose
- Go 1.24+
- Node.js 20+ (for frontend build)

### Local Development
1.  **Clone Repository**:
    ```bash
    git clone https://github.com/quester/platform.git
    cd platform
    ```
2.  **Start Infrastructure**:
    ```bash
    docker-compose up -d postgres redis
    ```
3.  **Run Backend**:
    ```bash
    cd server
    go run cmd/server/main.go
    ```
4.  **Run Frontend**:
    ```bash
    cd client
    npm install
    npm start
    ```

### Production Deployment
- **Containerization**: Use the provided `Dockerfile` in `server/` and `client/`.
- **Orchestration**: Kubernetes manifests are available in `deploy/k8s/`.
- **CI/CD**: GitHub Actions pipelines handle automated testing and build.

## 2. Configuration

### Environment Variables (`server/.env`)
| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `8080` |
| `DB_HOST` | PostgreSQL Host | `localhost` |
| `DB_USER` | Database User | `postgres` |
| `REDIS_URL` | Redis Connection | `localhost:6379` |
| `JWT_SECRET` | Token Signing Key | **CHANGE_ME** |
| `ENV` | Environment | `development` |

## 3. Performance Tuning

### Database
- **Connection Pooling**: Max 25 connections per instance.
- **Indexing**: Ensure GIN indexes are active for search columns.

### Caching
- **Redis TTL**:
    - User Profile: 15 mins
    - Quest Details: 30 mins
    - Leaderboards: 5 mins

## 4. Compliance & Security

### SOC 2 Controls
- **Audit Logging**: All admin actions are logged to the `audit_logs` table.
- **Data Isolation**: Multi-tenancy is strictly enforced via middleware.
- **Encryption**: Data at rest (DB volume encryption) and in transit (TLS 1.3).

### Troubleshooting
- **Logs**: Structured JSON logs are emitted to stdout. Use CloudWatch/Datadog to ingest.
- **Metrics**: Prometheus endpoint available at `/metrics`.
- **Health Check**: `/health` endpoint returns system status.
