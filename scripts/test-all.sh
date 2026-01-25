#!/bin/bash
# Run integration tests against multiple JBrowse versions
#
# Usage:
#   ./scripts/test-all.sh           # Setup and run all versions
#   ./scripts/test-all.sh setup     # Setup all versions only
#   ./scripts/test-all.sh run       # Run tests only (assumes setup done)
#   ./scripts/test-all.sh v4.0.4    # Run tests for specific version

set -e

cd "$(dirname "$0")/.."

case "${1:-all}" in
  setup)
    echo "Setting up all JBrowse versions..."
    node scripts/test-versions.mjs setup
    ;;
  run)
    echo "Running tests against all versions..."
    node scripts/test-versions.mjs run
    ;;
  all)
    echo "Setting up and running tests against all versions..."
    node scripts/test-versions.mjs setup
    node scripts/test-versions.mjs run
    ;;
  *)
    # Assume it's a version number
    VERSION="$1"
    echo "Running tests against JBrowse $VERSION..."
    node scripts/test-versions.mjs setup "$VERSION"
    node scripts/test-versions.mjs run "$VERSION"
    ;;
esac
