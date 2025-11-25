# Quester Grafana Dashboards

This directory contains 4 comprehensive Grafana dashboards for monitoring the Quester platform in production.

## Dashboard Overview

### 1. System Dashboard (`system-dashboard.json`)
**UID**: `quester-system`  
**Refresh Rate**: 10 seconds  
**Tags**: `quester`, `system`, `infrastructure`

**Panels**:
- **CPU Usage**: Server CPU utilization percentage
- **Memory Usage**: RAM usage percentage
- **Disk Usage**: Disk space utilization
- **Network I/O**: Network receive/transmit rates
- **Database Connection Pool**: Active and idle PostgreSQL connections
- **Redis Connections**: Active Redis client connections

**Use Case**: Monitor system resource health and infrastructure performance.

---

### 2. Application Dashboard (`application-dashboard.json`)
**UID**: `quester-application`  
**Refresh Rate**: 10 seconds  
**Tags**: `quester`, `application`, `performance`

**Panels**:
- **HTTP Request Rate by Status**: Requests per second grouped by HTTP status code (2xx, 4xx, 5xx)
- **HTTP Request Latency Percentiles**: p50, p95, p99 response times (SLA: p95 < 500ms)
- **HTTP Error Rate**: Percentage of 4xx and 5xx errors
- **WebSocket Connections**: Active WebSocket connection gauge
- **Database Query Latency (p95)**: Query performance by operation type (SELECT, INSERT, UPDATE, DELETE)
- **Redis Command Latency (p95)**: Cache operation performance by command
- **Error Rate by Type**: Application errors grouped by error type
- **Rate Limit Blocks by Endpoint**: Rate limiting enforcement by API endpoint

**Use Case**: Monitor application performance, latency, and error rates to ensure SLA compliance.

---

### 3. Business Dashboard (`business-dashboard.json`)
**UID**: `quester-business`  
**Refresh Rate**: 1 minute  
**Time Range**: Last 7 days  
**Tags**: `quester`, `business`, `metrics`

**Panels**:
- **Active Users (DAU/WAU/MAU)**: Daily, weekly, and monthly active user counts
- **Total Registered Users**: Cumulative user registration gauge
- **Daily User Signups**: New user registrations per day
- **Revenue (Daily/Weekly)**: Platform revenue in USD
- **Daily Orders**: Marketplace order volume
- **Total Courses**: Available LMS courses gauge
- **Daily Course Enrollments**: New enrollments per day
- **Daily Course Completions**: Courses completed per day
- **Daily Video Views**: Video streaming engagement
- **Daily Social Interactions by Type**: Interaction volume (comments, likes, shares, ratings)

**Use Case**: Track business KPIs, user engagement, and revenue metrics for product decisions.

---

### 4. AI Moderation Dashboard (`moderation-dashboard.json`)
**UID**: `quester-moderation`  
**Refresh Rate**: 30 seconds  
**Time Range**: Last 6 hours  
**Tags**: `quester`, `moderation`, `ai`

**Panels**:
- **AI Moderation Request Volume by Result**: Requests grouped by approved/flagged/rejected
- **AI Moderation Confidence Scores**: p50 and p95 confidence percentiles
- **AI Moderation Processing Time**: p50, p95, p99 latency for AI inference
- **Moderation Queue Size**: Pending manual review queue gauge
- **Moderation Results Distribution (1h)**: Pie chart of approval/flag/rejection rates
- **Moderation Rates**: Approval, flag, and rejection rates over time
- **Top 10 Interaction Types (Last 24h)**: Most common content types moderated

**Use Case**: Monitor AI moderation performance, accuracy, and queue health.

---

## Installation

### Prerequisites
- Grafana 9.0+ installed
- Prometheus data source configured in Grafana
- Quester backend running with `/metrics` endpoint exposed

### Setup Steps

1. **Import Dashboards**:
   ```bash
   # Via Grafana UI
   # 1. Navigate to Dashboards → Import
   # 2. Upload JSON file or paste JSON content
   # 3. Select Prometheus datasource
   # 4. Click Import
   ```

2. **Via Provisioning** (Recommended for production):
   ```yaml
   # /etc/grafana/provisioning/dashboards/quester.yaml
   apiVersion: 1
   providers:
     - name: 'Quester'
       orgId: 1
       folder: 'Quester'
       type: file
       disableDeletion: false
       updateIntervalSeconds: 10
       allowUiUpdates: true
       options:
         path: /var/lib/grafana/dashboards/quester
   ```

   Copy dashboard files to provisioning directory:
   ```bash
   sudo cp server/grafana/dashboards/*.json /var/lib/grafana/dashboards/quester/
   sudo chown -R grafana:grafana /var/lib/grafana/dashboards/quester
   sudo systemctl restart grafana-server
   ```

3. **Configure Prometheus Datasource**:
   ```yaml
   # /etc/grafana/provisioning/datasources/prometheus.yaml
   apiVersion: 1
   datasources:
     - name: Prometheus
       type: prometheus
       access: proxy
       url: http://localhost:9090
       isDefault: true
       editable: true
   ```

---

## Prometheus Configuration

Add Quester backend as a scrape target:

```yaml
# /etc/prometheus/prometheus.yml
scrape_configs:
  - job_name: 'quester-backend'
    scrape_interval: 15s
    static_configs:
      - targets: ['localhost:8080']  # Adjust to your backend address
```

Test metrics endpoint:
```bash
curl http://localhost:8080/metrics
```

---

## Alerting Rules (Optional)

Create alert rules in Prometheus for critical metrics:

```yaml
# /etc/prometheus/rules/quester.yml
groups:
  - name: quester_alerts
    interval: 30s
    rules:
      # High error rate
      - alert: HighErrorRate
        expr: (sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }} (threshold: 5%)"
      
      # Slow response time
      - alert: SlowResponseTime
        expr: histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le)) > 0.5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Slow API response time"
          description: "p95 latency is {{ $value | humanizeDuration }} (SLA: 500ms)"
      
      # High moderation queue
      - alert: HighModerationQueue
        expr: moderation_queue_size > 100
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High moderation queue size"
          description: "Queue size is {{ $value }} items (threshold: 100)"
      
      # Database connection pool exhaustion
      - alert: DatabaseConnectionPoolExhausted
        expr: (db_connections_active / (db_connections_active + db_connections_idle)) > 0.9
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Database connection pool near exhaustion"
          description: "Connection pool usage is {{ $value | humanizePercentage }}"
```

Reload Prometheus configuration:
```bash
sudo systemctl reload prometheus
```

---

## Dashboard Customization

### Variables
All dashboards use a `DS_PROMETHEUS` variable for datasource selection. You can add custom variables for filtering:

```json
{
  "name": "tenant_id",
  "type": "query",
  "query": "label_values(http_requests_total, tenant_id)",
  "multi": true,
  "includeAll": true
}
```

### Thresholds
Adjust thresholds in panel configuration to match your SLAs:

```json
{
  "thresholds": {
    "mode": "absolute",
    "steps": [
      {"color": "green", "value": null},
      {"color": "yellow", "value": 0.3},  // 300ms
      {"color": "red", "value": 0.5}      // 500ms (SLA)
    ]
  }
}
```

---

## Troubleshooting

### Dashboard Not Loading
1. **Check Prometheus datasource**: Grafana → Configuration → Data Sources
2. **Verify metrics endpoint**: `curl http://backend:8080/metrics`
3. **Check Prometheus scraping**: `http://prometheus:9090/targets`
4. **Inspect browser console**: F12 → Console tab for errors

### No Data Displayed
1. **Verify time range**: Adjust dashboard time picker (top-right)
2. **Check metric names**: Ensure they match Prometheus metrics
3. **Verify scrape interval**: Prometheus may not have scraped yet
4. **Query Prometheus directly**: Use Prometheus UI to test queries

### Slow Dashboard Performance
1. **Increase scrape interval**: Change from 15s to 30s in `prometheus.yml`
2. **Reduce dashboard refresh rate**: Change from 10s to 30s
3. **Limit time range**: Use shorter time windows (1h instead of 7d)
4. **Enable query caching**: Configure Grafana cache settings

---

## Metrics Reference

| Metric Name | Type | Labels | Description |
|-------------|------|--------|-------------|
| `http_requests_total` | Counter | method, endpoint, status | Total HTTP requests |
| `http_request_duration_seconds` | Histogram | method, endpoint | HTTP request latency |
| `db_query_duration_seconds` | Histogram | operation, table | Database query latency |
| `db_connections_active` | Gauge | - | Active DB connections |
| `db_connections_idle` | Gauge | - | Idle DB connections |
| `redis_command_duration_seconds` | Histogram | command | Redis command latency |
| `websocket_connections_active` | Gauge | - | Active WebSocket connections |
| `users_active` | Gauge | period | Active users (DAU/WAU/MAU) |
| `users_total` | Gauge | - | Total registered users |
| `user_signups_total` | Counter | - | Cumulative user signups |
| `revenue_total_usd` | Counter | - | Cumulative revenue in USD |
| `orders_total` | Counter | - | Total marketplace orders |
| `courses_total` | Gauge | - | Total courses |
| `course_enrollments_total` | Counter | - | Total enrollments |
| `course_completions_total` | Counter | - | Total completions |
| `video_views_total` | Counter | - | Total video views |
| `moderation_requests_total` | Counter | result | AI moderation requests |
| `moderation_duration_seconds` | Histogram | - | AI processing time |
| `moderation_confidence_score` | Histogram | - | AI confidence scores |
| `moderation_queue_size` | Gauge | - | Pending review queue |
| `interactions_total` | Counter | type | Social interactions |
| `errors_total` | Counter | type, severity | Application errors |
| `rate_limit_hits_total` | Counter | endpoint, blocked | Rate limit hits |

---

## Support

For dashboard issues or custom dashboard requests, please refer to:
- **Documentation**: `docs/deployment.md` (Monitoring section)
- **Metrics Implementation**: `server/internal/framework/metrics/`
- **Prometheus Config**: `/etc/prometheus/prometheus.yml`

---

## License

Copyright (c) 2025 Quester Platform. All rights reserved.
