# Gemini OCR - Production Monitoring

This directory contains comprehensive monitoring and alerting configurations for the Gemini OCR application in production environments.

## 📊 Monitoring Stack

### Components

- **Prometheus** - Metrics collection and storage
- **Grafana** - Visualization and dashboards  
- **AlertManager** - Alert routing and notifications
- **Node Exporter** - System metrics collection
- **Redis Exporter** - Redis metrics collection

### Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Application   │───▶│    Prometheus    │───▶│    Grafana      │
│  (Port 3000)    │    │   (Port 9090)    │    │   (Port 3000)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐    ┌─────────────────┐
                       │   AlertManager   │───▶│ Slack/PagerDuty │
                       │   (Port 9093)    │    │   Notifications │
                       └──────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### 1. Deploy Monitoring Stack

```bash
# Make setup script executable
chmod +x scripts/setup-monitoring.sh

# Deploy monitoring stack to Kubernetes
./scripts/setup-monitoring.sh
```

### 2. Access Dashboards

After deployment, access the monitoring interfaces:

- **Grafana**: https://grafana.gemini-ocr.com
- **Prometheus**: https://prometheus.gemini-ocr.com  
- **AlertManager**: https://alertmanager.gemini-ocr.com

Credentials will be displayed after running the setup script.

## 📈 Metrics Collected

### Application Metrics

- **HTTP Requests**: Rate, duration, status codes
- **OCR Processing**: Queue length, success rate, processing time
- **Gemini API**: Request rate, quota usage, error rate
- **Circuit Breakers**: State, failure count, recovery time
- **Background Jobs**: Queue size, processing rate, failure rate

### Infrastructure Metrics

- **System Resources**: CPU, memory, disk, network
- **Database**: Connection pool, query performance, slow queries
- **Redis**: Memory usage, commands/sec, connected clients
- **Kubernetes**: Pod status, resource usage, events

### Business Metrics

- **User Activity**: Active sessions, API usage patterns
- **Processing Volume**: Documents processed, error rates
- **Performance**: Response times, throughput, availability

## 🚨 Alerting Rules

### Critical Alerts

- Application down (1 minute)
- Pod crash looping (2 minutes)
- Database connection pool exhausted
- Gemini API quota exhausted
- Kubernetes node not ready

### Warning Alerts

- High error rate (>10% for 2 minutes)
- High latency (>2s 95th percentile for 5 minutes)
- High CPU usage (>80% for 5 minutes)
- High memory usage (>80% for 5 minutes)
- OCR processing backlog (>100 items)
- Redis high memory usage (>80%)

### System Alerts

- Disk space running out (<10% free)
- High network errors
- Circuit breaker open

## 📊 Grafana Dashboards

### Main Dashboard Panels

1. **System Status** - Overall health indicators
2. **Request Rate** - HTTP request metrics by method/status
3. **Response Times** - Latency percentiles (50th, 95th, 99th)
4. **Error Rate** - 4xx and 5xx error trends
5. **OCR Queue** - Processing queue metrics
6. **OCR Success Rate** - Processing success percentage
7. **Gemini API Usage** - API quota and request metrics
8. **Resource Usage** - CPU and memory consumption
9. **Redis Metrics** - Cache performance and usage
10. **Circuit Breaker Status** - Breaker states and health
11. **Database Performance** - Connection pool and query metrics
12. **Pod Status** - Kubernetes pod health

## 🔧 Configuration

### Prometheus Configuration

- **Scrape Interval**: 15 seconds
- **Retention**: 200 hours (8+ days)
- **Storage**: 10GB persistent volume

### AlertManager Configuration

- **Grouping**: By alertname and service
- **Repeat Interval**: 12 hours (4 hours for warnings)
- **Notification Channels**: Slack, Email, PagerDuty

### Grafana Configuration

- **Data Sources**: Prometheus (auto-configured)
- **Dashboards**: Auto-provisioned from JSON
- **Plugins**: Piechart, Worldmap panels

## 🔒 Security

### Authentication

- **Grafana**: Admin user with generated password
- **Prometheus/AlertManager**: Basic auth (nginx-ingress)
- **TLS**: Automatic certificates via cert-manager

### Network Policies

```yaml
# Example network policy for monitoring namespace
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: monitoring-network-policy
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
```

## 🛠️ Maintenance

### Updating Configurations

```bash
# Update Prometheus config
kubectl patch configmap prometheus-config -n monitoring \
  --patch-file=<(echo 'data:'; echo '  prometheus.yml: |'; \
  cat ./monitoring/prometheus.yml | sed 's/^/    /')

# Restart Prometheus
kubectl rollout restart deployment/prometheus -n monitoring
```

### Backup Considerations

```bash
# Backup Prometheus data
kubectl exec -n monitoring prometheus-xxx -- tar czf - /prometheus | \
  gzip > prometheus-backup-$(date +%Y%m%d).tar.gz

# Backup Grafana dashboards
kubectl get configmap grafana-dashboard-files -n monitoring -o yaml > \
  grafana-dashboards-backup.yaml
```

### Scaling

```bash
# Scale Prometheus for higher load
kubectl patch deployment prometheus -n monitoring \
  -p '{"spec":{"replicas":2,"template":{"spec":{"containers":[{
    "name":"prometheus","resources":{"limits":{"cpu":"2000m","memory":"4Gi"}}}]}}}}'
```

## 📱 Notification Channels

### Slack Integration

1. Create Slack webhook URLs
2. Update `alertmanager.yml` with webhook URLs
3. Configure channel-specific routing

### PagerDuty Integration

1. Create PagerDuty service integration
2. Add integration key to `alertmanager.yml`
3. Configure escalation policies

### Email Notifications

1. Configure SMTP settings in `alertmanager.yml`
2. Set up email groups for different alert severities
3. Configure email templates

## 🧪 Testing Alerts

### Trigger Test Alerts

```bash
# Test application down alert
kubectl scale deployment gemini-ocr-app --replicas=0 -n gemini-ocr

# Test high CPU alert  
kubectl exec -it gemini-ocr-app-xxx -n gemini-ocr -- \
  sh -c 'while true; do :; done &'

# Test memory alert
kubectl exec -it gemini-ocr-app-xxx -n gemini-ocr -- \
  node -e 'const a = []; while(true) a.push(new Array(1000000).join("x"));'
```

### Silence Alerts

```bash
# Silence alerts during maintenance
amtool silence add alertname="MaintenanceMode" \
  --alertmanager.url=https://alertmanager.gemini-ocr.com \
  --comment="Scheduled maintenance window"
```

## 📊 Performance Tuning

### Prometheus Optimization

```yaml
# Increase query performance
global:
  query_log_file: /prometheus/queries.log
  
# Reduce cardinality
metric_relabel_configs:
- source_labels: [__name__]
  regex: 'go_.*'
  action: drop
```

### Grafana Optimization

```ini
# grafana.ini optimizations
[database]
max_idle_conn = 2
max_open_conn = 50

[server]
enable_gzip = true

[dashboards]
min_refresh_interval = 10s
```

## 🆘 Troubleshooting

### Common Issues

1. **High cardinality metrics** - Check for labels with many values
2. **Alert fatigue** - Tune alert thresholds and grouping
3. **Storage issues** - Monitor disk usage and retention policies
4. **Query performance** - Optimize PromQL queries and recording rules

### Debug Commands

```bash
# Check Prometheus targets
kubectl port-forward -n monitoring svc/prometheus-service 9090:9090
curl http://localhost:9090/api/v1/targets

# Check AlertManager status
kubectl port-forward -n monitoring svc/alertmanager-service 9093:9093
curl http://localhost:9093/api/v1/status

# View pod logs
kubectl logs -n monitoring deployment/prometheus
kubectl logs -n monitoring deployment/grafana
kubectl logs -n monitoring deployment/alertmanager
```

## 📚 Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [AlertManager Documentation](https://prometheus.io/docs/alerting/latest/alertmanager/)
- [Kubernetes Monitoring Guide](https://kubernetes.io/docs/tasks/debug-application-cluster/resource-usage-monitoring/)

---

**Note**: Ensure all webhook URLs, credentials, and domain names are updated for your specific environment before deploying to production.