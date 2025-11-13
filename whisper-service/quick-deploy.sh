#!/bin/bash
# Quick deployment script for AWS EC2
# Automates the entire deployment process

set -e

echo "=== Quick Deploy: Whisper Service to AWS EC2 ==="
echo ""

# Check if deploy script exists
if [ ! -f "deploy-ec2.sh" ]; then
    echo "Error: deploy-ec2.sh not found. Run this from whisper-service directory."
    exit 1
fi

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo "Error: AWS CLI not found. Please install AWS CLI first."
    exit 1
fi

# Configuration prompts
echo "Configuration:"
read -p "AWS Key Name [whisper-key]: " KEY_NAME
KEY_NAME=${KEY_NAME:-whisper-key}

read -p "AWS Region [us-east-1]: " REGION
REGION=${REGION:-us-east-1}

read -p "Instance Type [t3.small]: " INSTANCE_TYPE
INSTANCE_TYPE=${INSTANCE_TYPE:-t3.small}

read -p "Whisper Model [base]: " WHISPER_MODEL
WHISPER_MODEL=${WHISPER_MODEL:-base}

read -p "API Key (leave empty to generate): " API_KEY
if [ -z "$API_KEY" ]; then
    API_KEY=$(openssl rand -hex 32)
    echo "Generated API Key: $API_KEY"
fi

read -p "Railway App URL (for CORS): " RAILWAY_URL

echo ""
echo "=== Deploying to AWS ==="
export AWS_KEY_NAME="$KEY_NAME"
export AWS_REGION="$REGION"
export INSTANCE_TYPE="$INSTANCE_TYPE"
export WHISPER_MODEL="$WHISPER_MODEL"

# Run deployment
./deploy-ec2.sh

# Get the instance IP from the output or AWS
echo ""
echo "=== Getting Instance Details ==="
INSTANCE_ID=$(aws ec2 describe-instances \
    --region "$REGION" \
    --filters "Name=tag:Name,Values=whisper-service" "Name=instance-state-name,Values=running" \
    --query 'Reservations[0].Instances[0].InstanceId' \
    --output text 2>/dev/null || echo "")

if [ -z "$INSTANCE_ID" ] || [ "$INSTANCE_ID" == "None" ]; then
    echo "⚠️  Could not find instance. Please deploy manually."
    exit 1
fi

PUBLIC_IP=$(aws ec2 describe-instances \
    --instance-ids "$INSTANCE_ID" \
    --region "$REGION" \
    --query 'Reservations[0].Instances[0].PublicIpAddress' \
    --output text)

echo "Instance ID: $INSTANCE_ID"
echo "Public IP: $PUBLIC_IP"
echo ""
echo "=== Next Steps ==="
echo ""
echo "1. SSH into the instance:"
echo "   ssh -i ~/.ssh/$KEY_NAME.pem ubuntu@$PUBLIC_IP"
echo ""
echo "2. Deploy the service:"
echo "   cd whisper-service"
echo "   git clone <your-repo-url> . || echo 'Already cloned'"
echo "   cp .env.example .env"
echo "   nano .env  # Set the following:"
echo ""
echo "   WHISPER_MODEL=$WHISPER_MODEL"
echo "   WHISPER_API_KEY=$API_KEY"
echo "   REQUIRE_API_KEY=true"
if [ -n "$RAILWAY_URL" ]; then
    echo "   ALLOWED_ORIGINS=$RAILWAY_URL"
fi
echo ""
echo "3. Start the service:"
echo "   docker-compose -f docker-compose.prod.yml up -d"
echo ""
echo "4. Pre-load model:"
echo "   ./warmup.sh"
echo ""
echo "5. Configure Railway:"
echo "   WHISPER_SERVICE_URL=http://$PUBLIC_IP:8000"
echo "   WHISPER_API_KEY=$API_KEY"
echo ""
echo "✅ Deployment initiated! Follow the steps above to complete setup."

