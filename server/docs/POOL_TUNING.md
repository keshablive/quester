# PostgreSQL Connection Pool Tuning Guide

This document provides guidance on tuning the PostgreSQL connection pool for optimal performance in the Quester application.

## Table of Contents

- [Overview](#overview)
- [Configuration Parameters](#configuration-parameters)
- [Environment Variables](#environment-variables)
- [Optimal Settings by Workload](#optimal-settings-by-workload)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

## Overview

Quester uses a connection pool to manage database connections efficiently. The pool maintains a set of established connections that can be reused, reducing the overhead of creating new connections for each request.

### Key Benefits

- **Reduced latency**: Pre-established connections eliminate connection handshake overhead
- **Resource efficiency**: Limits total database connections
- **Load smoothing**: Queue requests during spikes instead of overwhelming the database
- **Connection health**: Background health checks detect and replace unhealthy connections

## Configuration Parameters

### Core Pool Settings

| Parameter | Default | Description |
|-----------|---------|-------------|
| `MaxOpenConns` | 25 | Maximum number of open connections to the database |
| `MaxIdleConns` | 5 | Maximum number of idle connections in the pool |
| `ConnMaxLifetime` | 5m | Maximum time a connection can be reused |
| `ConnMaxIdleTime` | 5m | Maximum time a connection can be idle before being closed |

### Warmup Settings

| Parameter | Default | Description |
|-----------|---------|-------------|
| `WarmupEnabled` | false | Enable pre-warming connections on startup |
| `WarmupSize` | 10 | Number of connections to establish during warmup |
| `WarmupTimeout` | 30s | Maximum time to wait for warmup to complete |

### Health Check Settings

| Parameter | Default | Description |
|-----------|---------|-------------|
| `HealthCheckEnabled` | true | Enable background health checks |
| `HealthCheckInterval` | 30s | Interval between health checks |
| `HealthCheckTimeout` | 5s | Timeout for each health check |

### Adaptive Sizing Settings

| Parameter | Default | Description |
|-----------|---------|-------------|
| `AdaptiveEnabled` | false | Enable adaptive pool sizing |
| `AdaptiveMinFloor` | 10 | Minimum pool size (floor) |
| `AdaptiveMaxCeiling` | 50 | Maximum pool size (ceiling) |
| `AdaptiveScaleUpThreshold` | 80% | Utilization threshold to trigger scale up |
| `AdaptiveScaleDownThreshold` | 30% | Utilization threshold to trigger scale down |

## Environment Variables

All pool settings can be configured via environment variables:

```bash
# Core pool settings
DB_MAX_OPEN_CONNS=25
DB_MAX_IDLE_CONNS=5
DB_CONN_MAX_LIFETIME=5m
DB_CONN_MAX_IDLE_TIME=5m

# Warmup settings
DB_POOL_WARMUP_ENABLED=false
DB_POOL_WARMUP_SIZE=10
DB_POOL_WARMUP_TIMEOUT=30s

# Health check settings
DB_POOL_HEALTH_CHECK_ENABLED=true
DB_POOL_HEALTH_CHECK_INTERVAL=30s
DB_POOL_HEALTH_CHECK_TIMEOUT=5s

# Adaptive sizing settings
DB_POOL_ADAPTIVE_ENABLED=false
DB_POOL_MIN_FLOOR=10
DB_POOL_MAX_CEILING=50
DB_POOL_ADAPTIVE_SCALE_UP_THRESHOLD=80
DB_POOL_ADAPTIVE_SCALE_DOWN_THRESHOLD=30
```

## Optimal Settings by Workload

### Low-Traffic Application (< 100 req/sec)

```bash
DB_MAX_OPEN_CONNS=10
DB_MAX_IDLE_CONNS=5
DB_CONN_MAX_LIFETIME=5m
DB_CONN_MAX_IDLE_TIME=2m
DB_POOL_WARMUP_ENABLED=false
DB_POOL_ADAPTIVE_ENABLED=false
```

### Medium-Traffic Application (100-1000 req/sec)

```bash
DB_MAX_OPEN_CONNS=25
DB_MAX_IDLE_CONNS=10
DB_CONN_MAX_LIFETIME=5m
DB_CONN_MAX_IDLE_TIME=5m
DB_POOL_WARMUP_ENABLED=true
DB_POOL_WARMUP_SIZE=10
DB_POOL_ADAPTIVE_ENABLED=false
```

### High-Traffic Application (1000+ req/sec)

```bash
DB_MAX_OPEN_CONNS=50
DB_MAX_IDLE_CONNS=20
DB_CONN_MAX_LIFETIME=10m
DB_CONN_MAX_IDLE_TIME=5m
DB_POOL_WARMUP_ENABLED=true
DB_POOL_WARMUP_SIZE=20
DB_POOL_ADAPTIVE_ENABLED=true
DB_POOL_MIN_FLOOR=20
DB_POOL_MAX_CEILING=100
```

### Bursty Traffic (unpredictable peaks)

```bash
DB_MAX_OPEN_CONNS=30
DB_MAX_IDLE_CONNS=15
DB_CONN_MAX_LIFETIME=5m
DB_CONN_MAX_IDLE_TIME=3m
DB_POOL_WARMUP_ENABLED=true
DB_POOL_WARMUP_SIZE=15
DB_POOL_ADAPTIVE_ENABLED=true
DB_POOL_MIN_FLOOR=15
DB_POOL_MAX_CEILING=60
DB_POOL_ADAPTIVE_SCALE_UP_THRESHOLD=70
DB_POOL_ADAPTIVE_SCALE_DOWN_THRESHOLD=40
```

## Sizing Guidelines

### Maximum Open Connections

Formula: `max_connections = available_cores * (1 + disk_io_factor)`

Where `disk_io_factor` is typically 1-2 for SSDs, 5+ for HDDs.

Example for 4 cores with SSD: `4 * 2 = 8-16` connections per application instance.

For multiple application instances:
```
total_pool_size = (db_max_connections - reserved) / num_instances
```

### Maximum Idle Connections

Recommended: 20-40% of `MaxOpenConns`

- Too few: Connections closed and recreated frequently
- Too many: Memory wasted on idle connections

### Connection Lifetime

Recommended: 5-30 minutes

Short lifetimes (1-5m):
- More frequent reconnects
- Better handling of PostgreSQL session bloat
- Better load balancing across replicas

Long lifetimes (15-30m):
- Fewer reconnects
- Less overhead
- Better for long-running queries

### Idle Time

Recommended: Equal to or less than `ConnMaxLifetime`

Should be set to handle network firewall idle timeouts (often 300s).

## Monitoring

### Prometheus Metrics

The pool exposes the following metrics at `/metrics`:

```
# Core pool stats
quester_db_pool_connections_open       # Current open connections
quester_db_pool_connections_idle       # Current idle connections  
quester_db_pool_connections_max_open   # Max open connections setting
quester_db_pool_wait_count_total       # Total waits for connections
quester_db_pool_wait_duration_seconds  # Wait time histogram

# Warmup metrics
quester_db_pool_warmup_duration_seconds
quester_db_pool_warmup_connections_established
quester_db_pool_warmup_success_total
quester_db_pool_warmup_failures_total

# Health check metrics
quester_db_pool_health_check_duration_seconds
quester_db_pool_health_check_success_total
quester_db_pool_health_check_failures_total
quester_db_pool_health_status

# Adaptive sizing metrics
quester_db_pool_adaptive_resize_total{direction="up|down"}
quester_db_pool_adaptive_current_size
quester_db_pool_adaptive_utilization
```

### Health Endpoints

- `GET /health/database/pool` - Detailed pool status
- `GET /ready` - Includes warmup status check

### Key Alerts

1. **High utilization** (> 80%): Pool may need to scale up
2. **Long wait times** (> 100ms): Insufficient connections
3. **Frequent reconnects**: Connection lifetime too short or database issues
4. **Health check failures**: Network or database problems

## Troubleshooting

### Issue: High Connection Wait Time

**Symptoms**: Slow queries, high `quester_db_pool_wait_duration_seconds`

**Solutions**:
1. Increase `MaxOpenConns`
2. Optimize slow queries
3. Enable adaptive sizing
4. Add read replicas

### Issue: Connection Exhaustion

**Symptoms**: "too many connections" errors, requests timing out

**Solutions**:
1. Review PostgreSQL `max_connections` setting
2. Reduce pool size or number of application instances
3. Check for connection leaks (uncommitted transactions)

### Issue: Stale Connections

**Symptoms**: Random query failures, "connection reset by peer"

**Solutions**:
1. Reduce `ConnMaxLifetime`
2. Enable health checks
3. Check firewall idle timeout settings

### Issue: Cold Start Latency

**Symptoms**: First requests after deployment are slow

**Solutions**:
1. Enable warmup with appropriate size
2. Use readiness probes that wait for warmup

### Issue: Memory Usage

**Symptoms**: High memory consumption per instance

**Solutions**:
1. Reduce `MaxIdleConns`
2. Reduce `ConnMaxIdleTime`
3. Review prepared statement caching

## Performance Testing

Before deploying pool configuration changes:

1. Load test with expected traffic patterns
2. Monitor P50/P95/P99 latency
3. Check connection pool metrics
4. Verify health check behavior
5. Test adaptive scaling triggers

Target metrics:
- Connection acquisition P95: < 10ms
- Pool utilization: 50-80% during peak
- Wait count: Minimal during normal operation

## References

- [PostgreSQL Connection Pooling](https://www.postgresql.org/docs/current/runtime-config-connection.html)
- [Go database/sql Connection Pool](https://go.dev/doc/database/manage-connections)
- [GORM Connection Pool](https://gorm.io/docs/connecting_to_the_database.html#Connection-Pool)
