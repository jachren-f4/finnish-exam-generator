#!/bin/bash

# Prompt Optimization Experiment Runner
# Tests different prompt variants by temporarily modifying config

set -e

echo "==================================="
echo "PROMPT OPTIMIZATION EXPERIMENT"
echo "==================================="
echo ""

# Backup original config
echo "Backing up original config..."
cp src/lib/config.ts src/lib/config.ts.backup

# Test each variant
for variant in "variant1" "variant2" "variant3"; do
  echo ""
  echo "========================================="
  echo "Testing $variant"
  echo "========================================="

  # Replace the prompt in config.ts
  echo "Applying $variant to config.ts..."

  # This will be done by a Node script
  node -e "
    const fs = require('fs');
    const variants = require('./src/lib/config-test-variants.ts');

    // Read current config
    let config = fs.readFileSync('src/lib/config.ts', 'utf8');

    // Get the variant prompt
    const variantPrompt = variants.getPromptVariant('$variant', 'core_academics', 5);

    console.log('Variant prompt length:', variantPrompt.length);
  "

done

# Restore original config
echo ""
echo "Restoring original config..."
mv src/lib/config.ts.backup src/lib/config.ts

echo ""
echo "Experiment complete!"
