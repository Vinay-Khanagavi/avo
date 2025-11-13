#!/bin/bash
# Warmup script to pre-load Whisper model for faster first request
# Run this after deploying the service to avoid cold start delays

SERVICE_URL="${WHISPER_SERVICE_URL:-http://localhost:8000}"
MAX_RETRIES=30
RETRY_DELAY=2

echo "=== Whisper Service Warmup ==="
echo "Pre-loading model to ensure fast response times..."
echo ""

# Wait for service to be ready
for i in $(seq 1 $MAX_RETRIES); do
    if curl -sf "$SERVICE_URL/health" > /dev/null 2>&1; then
        echo "✅ Service is ready"
        break
    fi
    if [ $i -eq $MAX_RETRIES ]; then
        echo "❌ Service not ready after $MAX_RETRIES attempts"
        echo "   Check if service is running: docker-compose ps"
        exit 1
    fi
    echo "⏳ Waiting for service... ($i/$MAX_RETRIES)"
    sleep $RETRY_DELAY
done

# Trigger model load by making health check requests
echo ""
echo "🔄 Pre-loading Whisper model (this may take 30-60 seconds)..."
for i in {1..3}; do
    echo "   Request $i/3..."
    curl -sf "$SERVICE_URL/health" > /dev/null 2>&1 || true
    sleep 2
done

# Verify model is loaded
HEALTH_RESPONSE=$(curl -sf "$SERVICE_URL/health" 2>/dev/null)
if echo "$HEALTH_RESPONSE" | grep -q "healthy"; then
    echo ""
    echo "✅ Model pre-loaded successfully!"
    echo "   Service is ready for fast transcription"
    echo ""
    echo "Health status:"
    echo "$HEALTH_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$HEALTH_RESPONSE"
else
    echo ""
    echo "⚠️  Service responded but model may still be loading"
    echo "   First request may still be slower"
fi

echo ""
echo "💡 Tip: Set up automatic warmup with cron:"
echo "   (crontab -l 2>/dev/null; echo \"*/5 * * * * curl -sf http://localhost:8000/health > /dev/null\") | crontab -"

