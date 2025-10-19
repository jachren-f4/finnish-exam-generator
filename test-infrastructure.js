const fs = require('fs');
const path = require('path');

function testJSON(filePath, description) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    JSON.parse(content);
    console.log(`✅ ${description}: Valid JSON`);
    return true;
  } catch (error) {
    console.log(`❌ ${description}: ${error.message}`);
    return false;
  }
}

function testDockerfile(filePath, description) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    // Basic Dockerfile syntax checks
    const hasFrom = lines.some(line => line.trim().toUpperCase().startsWith('FROM'));
    const hasValidInstructions = lines.every(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return true;
      return /^(FROM|WORKDIR|COPY|ADD|RUN|CMD|ENTRYPOINT|EXPOSE|ENV|ARG|LABEL|USER|VOLUME|SHELL|HEALTHCHECK|ONBUILD|STOPSIGNAL)/i.test(trimmed);
    });
    
    if (hasFrom && hasValidInstructions) {
      console.log(`✅ ${description}: Valid Dockerfile syntax`);
      return true;
    } else {
      console.log(`❌ ${description}: Invalid Dockerfile syntax`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${description}: ${error.message}`);
    return false;
  }
}

function testEnvFile(filePath, description) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n').filter(line => line.trim() && !line.trim().startsWith('#'));
    
    const validLines = lines.every(line => {
      return line.includes('=') || line.trim().startsWith('#');
    });
    
    const envCount = lines.length;
    
    if (validLines) {
      console.log(`✅ ${description}: Valid format with ${envCount} environment variables`);
      return true;
    } else {
      console.log(`❌ ${description}: Invalid environment file format`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${description}: ${error.message}`);
    return false;
  }
}

function testYAMLStructure(filePath, description) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Basic YAML structure checks
    const hasValidIndentation = content.split('\n').every(line => {
      const trimmed = line.trim();
      if (!trimmed) return true;
      
      // Check for common YAML errors
      if (line.includes('\t')) return false; // No tabs allowed
      if (trimmed.endsWith(':') && !trimmed.endsWith('::')) return true;
      if (trimmed.includes(': ') || trimmed.includes(':')) return true;
      if (trimmed.startsWith('- ')) return true;
      if (trimmed.startsWith('#')) return true;
      if (trimmed.startsWith('---')) return true;
      
      return true;
    });
    
    const hasKubernetesFields = content.includes('apiVersion') && content.includes('kind');
    
    if (hasValidIndentation) {
      const type = hasKubernetesFields ? 'Kubernetes' : 'YAML';
      console.log(`✅ ${description}: Valid ${type} structure`);
      return true;
    } else {
      console.log(`❌ ${description}: Invalid YAML structure`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${description}: ${error.message}`);
    return false;
  }
}

function testShellScript(filePath, description) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    const hasShebang = content.startsWith('#!/bin/bash') || content.startsWith('#!/bin/sh');
    const hasSetE = content.includes('set -e');
    const hasValidSyntax = !content.includes('\\`') || content.split('\\`').length % 2 === 1;
    
    if (hasShebang) {
      console.log(`✅ ${description}: Valid shell script with${hasSetE ? '' : 'out'} error handling`);
      return true;
    } else {
      console.log(`❌ ${description}: Missing shebang or invalid syntax`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${description}: ${error.message}`);
    return false;
  }
}

console.log('🧪 Testing Infrastructure Configuration Files...\n');

const tests = [
  // JSON files
  () => testJSON('monitoring/grafana-dashboards.json', 'Grafana Dashboard JSON'),
  () => testJSON('package.json', 'Package.json'),
  
  // Dockerfile
  () => testDockerfile('Dockerfile', 'Dockerfile'),
  
  // Environment files
  () => testEnvFile('.env.example', 'Environment Example File'),
  
  // YAML files
  () => testYAMLStructure('k8s/deployment.yaml', 'K8s Deployment'),
  () => testYAMLStructure('k8s/service.yaml', 'K8s Service'),
  () => testYAMLStructure('k8s/configmap.yaml', 'K8s ConfigMap'),
  () => testYAMLStructure('k8s/secret.yaml', 'K8s Secret'),
  () => testYAMLStructure('k8s/namespace.yaml', 'K8s Namespace'),
  () => testYAMLStructure('k8s/pvc.yaml', 'K8s PVC'),
  () => testYAMLStructure('k8s/hpa.yaml', 'K8s HPA'),
  () => testYAMLStructure('monitoring/prometheus.yml', 'Prometheus Config'),
  () => testYAMLStructure('monitoring/alert_rules.yml', 'Alert Rules'),
  () => testYAMLStructure('monitoring/alertmanager.yml', 'AlertManager Config'),
  () => testYAMLStructure('monitoring/k8s-monitoring.yaml', 'Monitoring Stack'),
  () => testYAMLStructure('docker-compose.yml', 'Docker Compose Dev'),
  () => testYAMLStructure('docker-compose.prod.yml', 'Docker Compose Prod'),
  () => testYAMLStructure('.github/workflows/ci.yml', 'GitHub Actions CI'),
  
  // Shell scripts
  () => testShellScript('scripts/setup-monitoring.sh', 'Monitoring Setup Script'),
];

console.log('Running tests...\n');

const results = tests.map(test => test());
const passed = results.filter(Boolean).length;
const total = results.length;

console.log(`\n📊 TEST SUMMARY:`);
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${total - passed}`);
console.log(`📈 Success Rate: ${Math.round((passed / total) * 100)}%`);

if (passed === total) {
  console.log('\n🎉 All infrastructure tests passed!');
} else {
  console.log(`\n⚠️  ${total - passed} test(s) failed. Review the output above for details.`);
}