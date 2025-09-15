#!/bin/bash
set -e

# Gemini OCR - Monitoring Stack Setup Script
# This script sets up Prometheus, Grafana, and AlertManager for production monitoring

echo "🔧 Setting up Gemini OCR monitoring stack..."

# Create monitoring namespace
kubectl create namespace monitoring --dry-run=client -o yaml | kubectl apply -f -

# Create ConfigMaps for configuration files
echo "📝 Creating configuration ConfigMaps..."

kubectl create configmap prometheus-config \
  --from-file=prometheus.yml=./monitoring/prometheus.yml \
  --namespace=monitoring \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl create configmap prometheus-rules \
  --from-file=alert_rules.yml=./monitoring/alert_rules.yml \
  --namespace=monitoring \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl create configmap alertmanager-config \
  --from-file=alertmanager.yml=./monitoring/alertmanager.yml \
  --namespace=monitoring \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl create configmap grafana-dashboard-files \
  --from-file=gemini-ocr-dashboard.json=./monitoring/grafana-dashboards.json \
  --namespace=monitoring \
  --dry-run=client -o yaml | kubectl apply -f -

# Create Grafana datasources and dashboard provisioning configs
echo "📊 Creating Grafana provisioning configs..."

cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-datasources
  namespace: monitoring
data:
  prometheus.yml: |
    apiVersion: 1
    datasources:
      - name: Prometheus
        type: prometheus
        access: proxy
        url: http://prometheus-service:9090
        isDefault: true
        editable: false
EOF

cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-dashboards
  namespace: monitoring
data:
  dashboard.yml: |
    apiVersion: 1
    providers:
      - name: 'default'
        orgId: 1
        folder: ''
        type: file
        disableDeletion: false
        editable: true
        options:
          path: /var/lib/grafana/dashboards
EOF

# Create secrets
echo "🔐 Creating monitoring secrets..."

# Generate random passwords if not already set
GRAFANA_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD:-$(openssl rand -base64 32)}
MONITORING_AUTH_PASSWORD=${MONITORING_AUTH_PASSWORD:-$(openssl rand -base64 16)}

kubectl create secret generic grafana-secret \
  --from-literal=admin-password="$GRAFANA_ADMIN_PASSWORD" \
  --namespace=monitoring \
  --dry-run=client -o yaml | kubectl apply -f -

# Create basic auth for monitoring endpoints
htpasswd -cb auth admin "$MONITORING_AUTH_PASSWORD"
kubectl create secret generic monitoring-auth \
  --from-file=auth=auth \
  --namespace=monitoring \
  --dry-run=client -o yaml | kubectl apply -f -
rm auth

echo "🚀 Deploying monitoring stack..."

# Apply the monitoring Kubernetes manifests
kubectl apply -f ./monitoring/k8s-monitoring.yaml

echo "⏳ Waiting for monitoring stack to be ready..."

# Wait for deployments to be ready
kubectl wait --for=condition=available --timeout=300s deployment/prometheus -n monitoring
kubectl wait --for=condition=available --timeout=300s deployment/alertmanager -n monitoring  
kubectl wait --for=condition=available --timeout=300s deployment/grafana -n monitoring

# Wait for Redis exporter in gemini-ocr namespace
kubectl wait --for=condition=available --timeout=300s deployment/redis-exporter -n gemini-ocr || echo "Redis exporter deployment not found or failed"

echo "✅ Monitoring stack deployed successfully!"

echo ""
echo "📊 Monitoring Dashboard Access:"
echo "🔗 Grafana: https://grafana.gemini-ocr.com"
echo "   Username: admin"
echo "   Password: $GRAFANA_ADMIN_PASSWORD"
echo ""
echo "📈 Prometheus: https://prometheus.gemini-ocr.com"
echo "   Username: admin"
echo "   Password: $MONITORING_AUTH_PASSWORD"
echo ""
echo "🚨 AlertManager: https://alertmanager.gemini-ocr.com"
echo "   Username: admin"
echo "   Password: $MONITORING_AUTH_PASSWORD"
echo ""

# Check pod status
echo "🔍 Monitoring Pod Status:"
kubectl get pods -n monitoring
echo ""
kubectl get pods -n gemini-ocr -l app=redis-exporter

echo "📝 Next Steps:"
echo "1. Update DNS records to point monitoring subdomains to your ingress controller"
echo "2. Configure Slack webhook URLs in alertmanager.yml"
echo "3. Set up PagerDuty integration keys"
echo "4. Import additional Grafana dashboards as needed"
echo "5. Configure backup for Prometheus and Grafana data"
echo ""
echo "🔧 To update configurations:"
echo "   kubectl patch configmap prometheus-config -n monitoring --patch-file=<(echo 'data:'; echo '  prometheus.yml: |'; cat ./monitoring/prometheus.yml | sed 's/^/    /')"
echo "   kubectl rollout restart deployment/prometheus -n monitoring"
echo ""
echo "✅ Monitoring setup complete!"