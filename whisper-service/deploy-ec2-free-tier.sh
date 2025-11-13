#!/bin/bash

# EC2 Free Tier Deployment Script for Whisper Service
# This script automates the deployment of Whisper service on EC2 t2.micro instance

set -e

echo "=== Whisper Service EC2 Deployment ==="

# Configuration
INSTANCE_TYPE="t2.micro"
# AMI_ID will be dynamically resolved below
KEY_NAME="${AWS_KEY_NAME:-whisper-key}"  # Set AWS_KEY_NAME env var or use default
SECURITY_GROUP_NAME="whisper-service-sg"
REGION="${AWS_REGION:-us-east-1}"
ALLOWED_IP="${ALLOWED_IP:-}"  # Set ALLOWED_IP env var to restrict access (e.g., "1.2.3.4/32")

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo "Error: AWS CLI not found. Please install AWS CLI first."
    exit 1
fi

# Validate key pair exists
echo "Step 0: Validating key pair..."
if ! aws ec2 describe-key-pairs --key-names "$KEY_NAME" --region "$REGION" &>/dev/null; then
    echo "Error: Key pair '$KEY_NAME' not found in region $REGION"
    echo "Please create a key pair first:"
    echo "  aws ec2 create-key-pair --key-name $KEY_NAME --region $REGION --query 'KeyMaterial' --output text > ~/.ssh/$KEY_NAME.pem"
    echo "  chmod 400 ~/.ssh/$KEY_NAME.pem"
    exit 1
fi
echo "Key pair validated: $KEY_NAME"

# Dynamically resolve AMI ID for Ubuntu 22.04 LTS
echo "Step 0.5: Resolving Ubuntu 22.04 LTS AMI ID..."
AMI_ID=$(aws ec2 describe-images \
    --owners 099720109477 \
    --filters "Name=name,Values=ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*" "Name=state,Values=available" \
    --region "$REGION" \
    --query 'Images | sort_by(@, &CreationDate) | [-1].ImageId' \
    --output text)

if [ -z "$AMI_ID" ] || [ "$AMI_ID" == "None" ]; then
    echo "Error: Could not resolve AMI ID for Ubuntu 22.04 LTS in region $REGION"
    exit 1
fi
echo "Using AMI: $AMI_ID"

# Determine allowed CIDR for port 8000
if [ -z "$ALLOWED_IP" ]; then
    echo "Warning: ALLOWED_IP not set. Port 8000 will be open to 0.0.0.0/0 (not recommended for production)"
    echo "Set ALLOWED_IP environment variable to restrict access (e.g., export ALLOWED_IP=\"1.2.3.4/32\")"
    ALLOWED_CIDR="0.0.0.0/0"
else
    ALLOWED_CIDR="$ALLOWED_IP"
    echo "Restricting port 8000 access to: $ALLOWED_CIDR"
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
    
    # Allow SSH (port 22) from anywhere - required for initial setup
    # In production, restrict this to your IP
    aws ec2 authorize-security-group-ingress \
        --group-id "$SG_ID" \
        --protocol tcp \
        --port 22 \
        --cidr 0.0.0.0/0 \
        --region "$REGION"
    
    # Allow port 8000 from specified CIDR (or 0.0.0.0/0 if not specified)
    aws ec2 authorize-security-group-ingress \
        --group-id "$SG_ID" \
        --protocol tcp \
        --port 8000 \
        --cidr "$ALLOWED_CIDR" \
        --region "$REGION"
    
    echo "Security group created: $SG_ID"
    echo "  - SSH (22): 0.0.0.0/0"
    echo "  - Service (8000): $ALLOWED_CIDR"
else
    echo "Security group already exists: $SG_ID"
    # Check if rules need updating
    HAS_SSH=$(aws ec2 describe-security-groups \
        --group-ids "$SG_ID" \
        --region "$REGION" \
        --query 'SecurityGroups[0].IpPermissions[?FromPort==`22`]' \
        --output text)
    
    if [ -z "$HAS_SSH" ]; then
        echo "Adding SSH rule to existing security group..."
        aws ec2 authorize-security-group-ingress \
            --group-id "$SG_ID" \
            --protocol tcp \
            --port 22 \
            --cidr 0.0.0.0/0 \
            --region "$REGION"
    fi
fi

echo ""
echo "Step 2: Launching EC2 t2.micro instance..."

# Check if user-data script exists and use it
USER_DATA_ARG=""
if [ -f "user-data.sh" ]; then
    echo "Found user-data.sh, including in instance launch..."
    USER_DATA_ARG="--user-data file://user-data.sh"
fi

INSTANCE_ID=$(aws ec2 run-instances \
    --image-id "$AMI_ID" \
    --instance-type "$INSTANCE_TYPE" \
    --key-name "$KEY_NAME" \
    --security-group-ids "$SG_ID" \
    --region "$REGION" \
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=whisper-service}]" \
    $USER_DATA_ARG \
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
if [ -f "user-data.sh" ]; then
    echo "User-data script was included. Docker should be installed automatically."
    echo "Check /var/log/user-data.log on the instance for setup progress."
    echo ""
fi
echo "1. SSH into the instance:"
echo "   ssh -i ~/.ssh/$KEY_NAME.pem ubuntu@$PUBLIC_IP"
echo ""
if [ ! -f "user-data.sh" ]; then
    echo "2. Install Docker:"
    echo "   sudo apt-get update"
    echo "   sudo apt-get install -y docker.io docker-compose"
    echo "   sudo systemctl start docker"
    echo "   sudo systemctl enable docker"
    echo "   sudo usermod -aG docker \$USER"
    echo "   newgrp docker"
    echo ""
fi
echo "2. Clone your repository or copy files:"
echo "   git clone <your-repo-url>"
echo "   cd whisper-service"
echo ""
echo "3. Create .env file with required variables (see .env.example):"
echo "   cp .env.example .env"
echo "   nano .env  # Edit with your settings"
echo ""
echo "4. Run with Docker Compose:"
echo "   docker-compose up -d"
echo ""
echo "5. Service will be available at:"
echo "   http://$PUBLIC_IP:8000"
echo ""
echo "6. Health check:"
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

