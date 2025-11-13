#!/bin/bash
# User-data script for automated EC2 setup and deployment
# Optimized for fast deployment and performance

set -e

# Log everything
exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1
echo "Starting optimized user-data script at $(date)"

# Update system
apt-get update -y
apt-get upgrade -y

# Install Docker
apt-get install -y docker.io docker-compose
systemctl start docker
systemctl enable docker

# Add ubuntu user to docker group
usermod -aG docker ubuntu

# Install git and curl
apt-get install -y git curl

# Create app directory
mkdir -p /home/ubuntu/whisper-service
chown ubuntu:ubuntu /home/ubuntu/whisper-service

# Clone repository (if REPO_URL is provided via instance tags or environment)
# Otherwise, user will need to clone manually
REPO_URL="${REPO_URL:-}"
if [ -n "$REPO_URL" ]; then
    echo "Cloning repository: $REPO_URL"
    sudo -u ubuntu git clone "$REPO_URL" /home/ubuntu/whisper-service || echo "Repository clone failed - will deploy manually"
fi

# Set up automatic warmup script to keep service fast
cat > /home/ubuntu/warmup.sh << 'WARMUP_EOF'
#!/bin/bash
# Warmup script to keep Whisper service ready (pre-loads model)
SERVICE_URL="http://localhost:8000"
MAX_RETRIES=10
RETRY_DELAY=5

for i in $(seq 1 $MAX_RETRIES); do
    if curl -sf "$SERVICE_URL/health" > /dev/null 2>&1; then
        echo "Service is ready"
        # Trigger model load by making a health check
        curl -sf "$SERVICE_URL/health" > /dev/null
        exit 0
    fi
    echo "Waiting for service... ($i/$MAX_RETRIES)"
    sleep $RETRY_DELAY
done
echo "Service not ready after $MAX_RETRIES attempts"
exit 1
WARMUP_EOF

chmod +x /home/ubuntu/warmup.sh
chown ubuntu:ubuntu /home/ubuntu/warmup.sh

# Set up cron job to keep service warm (every 5 minutes)
(crontab -u ubuntu -l 2>/dev/null; echo "*/5 * * * * curl -sf http://localhost:8000/health > /dev/null 2>&1 || true") | crontab -u ubuntu -

echo "User-data script completed at $(date)"
echo "Next steps:"
echo "1. SSH into instance"
echo "2. cd whisper-service"
echo "3. Copy your files or git clone"
echo "4. docker-compose up -d"
echo "5. Run ./warmup.sh to pre-load model"
