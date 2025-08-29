#!/bin/bash
# Essential setup script for complex test package
# This script is included in all variants (minimal, standard, full)

set -e

echo "🔧 Running essential setup for complex-test-package..."

# Create essential directories
mkdir -p "${HOME}/.complex-test-package"
mkdir -p "${HOME}/.complex-test-package/config"

# Create basic configuration
cat > "${HOME}/.complex-test-package/config/essential.conf" << EOF
# Essential configuration for complex-test-package
created_at=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
version=essential
setup_completed=true
EOF

echo "✅ Essential setup completed successfully!"
echo "📁 Configuration saved to: ${HOME}/.complex-test-package/config/essential.conf"