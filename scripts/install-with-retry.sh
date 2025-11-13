#!/bin/bash
set -e

# Retry yarn install with exponential backoff
MAX_RETRIES=3
RETRY_DELAY=5

for i in $(seq 1 $MAX_RETRIES); do
  echo "Attempt $i of $MAX_RETRIES: Installing dependencies..."
  if yarn install --frozen-lockfile --network-timeout 600000; then
    echo "Installation successful!"
    exit 0
  fi
  
  if [ $i -lt $MAX_RETRIES ]; then
    echo "Installation failed. Retrying in $RETRY_DELAY seconds..."
    sleep $RETRY_DELAY
    RETRY_DELAY=$((RETRY_DELAY * 2))
  fi
done

echo "Installation failed after $MAX_RETRIES attempts"
exit 1

