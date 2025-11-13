#!/bin/bash
# User-data script for automated EC2 setup
# This script runs automatically when the instance starts

set -e

# Log everything
exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1
echo "Starting user-data script at $(date)"

# Update system
apt-get update -y
apt-get upgrade -y

# Install Docker
apt-get install -y docker.io docker-compose
systemctl start docker
systemctl enable docker

# Add ubuntu user to docker group
usermod -aG docker ubuntu

# Install git (if needed for cloning)
apt-get install -y git

# Create app directory
mkdir -p /home/ubuntu/whisper-service
chown ubuntu:ubuntu /home/ubuntu/whisper-service

# Note: Application files should be copied via S3, git clone, or manual transfer
# This script only sets up the environment

echo "User-data script completed at $(date)"

