#!/bin/bash

# EC2 Free Tier Deployment Script for Whisper Service
# This script automates the deployment of Whisper service on EC2 t2.micro instance

set -e

echo "=== Whisper Service EC2 Deployment ==="

# Configuration
INSTANCE_TYPE="t2.micro"
AMI_ID="ami-0c55b159cbfafe1f0"  # Ubuntu 22.04 LTS (us-east-1) - Update for your region
KEY_NAME="whisper-key"  # Update with your key pair name
SECURITY_GROUP_NAME="whisper-service-sg"
REGION="us-east-1"

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo "Error: AWS CLI not found. Please install AWS CLI first."
    exit 1
fi

echo "Step 1: Creating security group..."
# Check if security group already exists
SG_ID=$(aws ec2 describe-security-groups \
    --group-names "$SECURITY_GROUP_NAME" \
    --region "$REGION" \
    --query 'SecurityGroups[0].GroupId' \
    --output text 2>/dev/null || echo "None")

if [ "$SG_ID" == "None" ] || [ "$SG_ID" == "null" ]; then
    echo "Creating new security group..."
    SG_ID=$(aws ec2 create-security-group \
        --group-name "$SECURITY_GROUP_NAME" \
        --description "Security group for Whisper transcription service" \
        --region "$REGION" \
        --query 'GroupId' \
        --output text)
    
    # Allow port 8000 from anywhere (restrict to your IP in production)
    aws ec2 authorize-security-group-ingress \
        --group-id "$SG_ID" \
        --protocol tcp \
        --port 8000 \
        --cidr 0.0.0.0/0 \
        --region "$REGION"
    
    echo "Security group created: $SG_ID"
else
    echo "Security group already exists: $SG_ID"
fi

echo ""
echo "Step 2: Launching EC2 t2.micro instance..."
INSTANCE_ID=$(aws ec2 run-instances \
    --image-id "$AMI_ID" \
    --instance-type "$INSTANCE_TYPE" \
    --key-name "$KEY_NAME" \
    --security-group-ids "$SG_ID" \
    --region "$REGION" \
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=whisper-service}]" \
    --query 'Instances[0].InstanceId' \
    --output text)

echo "Instance launched: $INSTANCE_ID"
echo "Waiting for instance to be running..."

aws ec2 wait instance-running \
    --instance-ids "$INSTANCE_ID" \
    --region "$REGION"

echo "Instance is running!"

echo ""
echo "Step 3: Getting public IP..."
PUBLIC_IP=$(aws ec2 describe-instances \
    --instance-ids "$INSTANCE_ID" \
    --region "$REGION" \
    --query 'Reservations[0].Instances[0].PublicIpAddress' \
    --output text)

echo "Public IP: $PUBLIC_IP"

echo ""
echo "Step 4: Waiting for SSH to be ready..."
sleep 30

echo ""
echo "=== Deployment Instructions ==="
echo ""
echo "1. SSH into the instance:"
echo "   ssh -i ~/.ssh/$KEY_NAME.pem ubuntu@$PUBLIC_IP"
echo ""
echo "2. Install Docker:"
echo "   sudo apt-get update"
echo "   sudo apt-get install -y docker.io docker-compose"
echo "   sudo systemctl start docker"
echo "   sudo systemctl enable docker"
echo "   sudo usermod -aG docker \$USER"
echo "   newgrp docker"
echo ""
echo "3. Clone your repository or copy files:"
echo "   git clone <your-repo-url>"
echo "   cd whisper-service"
echo ""
echo "4. Set environment variables:"
echo "   export WHISPER_MODEL=base"
echo "   export WHISPER_DEVICE=cpu"
echo "   export MAX_SESSIONS=5"
echo "   export SESSION_TTL=600"
echo "   export WHISPER_API_KEY=your-secret-key"
echo ""
echo "5. Run with Docker Compose:"
echo "   docker-compose up -d"
echo ""
echo "6. Service will be available at:"
echo "   http://$PUBLIC_IP:8000"
echo ""
echo "7. Health check:"
echo "   curl http://$PUBLIC_IP:8000/health"
echo ""
echo "=== Important Notes ==="
echo "- This instance is FREE for 12 months (AWS Free Tier)"
echo "- Stop the instance after Nov 15 to avoid charges:"
echo "  aws ec2 stop-instances --instance-ids $INSTANCE_ID --region $REGION"
echo "- To terminate (deletes everything):"
echo "  aws ec2 terminate-instances --instance-ids $INSTANCE_ID --region $REGION"
echo ""
echo "Instance ID: $INSTANCE_ID"
echo "Public IP: $PUBLIC_IP"
echo "Security Group: $SG_ID"

