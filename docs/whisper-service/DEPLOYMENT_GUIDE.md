# Whisper Service Deployment Guide

## Architecture: AWS EC2 + Railway

**AWS EC2** → Whisper Service (always-on, optimized for speed)  
**Railway** → Next.js App (connects to AWS Whisper service)

This architecture provides:
- ✅ **Faster than API keys**: No rate limits, no external API calls
- ✅ **Always-on**: No cold starts, model pre-loaded
- ✅ **Cost-effective**: ~$15-30/month for t3.small/medium
- ✅ **Scalable**: Can upgrade instance type as needed
- ✅ **Reliable**: Full control over the service

## Performance Comparison

| Solution | First Request | Subsequent Requests | Cost |
|----------|---------------|---------------------|------|
| **AWS EC2 (this)** | 30-60s (one-time model load) | 5-10s per chunk | ~$15-30/mo |
| Whisper API | 2-5s | 2-5s per chunk | Pay per use |
| Railway (cold) | 60-120s | 5-10s per chunk | ~$5-20/mo |
| Railway (warm) | 5-10s | 5-10s per chunk | ~$5-20/mo |

**Why AWS EC2 is faster:**
- Model stays loaded in memory (no cold starts)
- Dedicated resources (no sharing)
- Pre-loading optimization (warmup script)
- No API rate limits

## Quick Deployment

### Step 1: Deploy to AWS EC2

```bash
cd whisper-service

# Set your AWS configuration
export AWS_KEY_NAME=your-key-name
export AWS_REGION=us-east-1  # Choose closest to your users
export INSTANCE_TYPE=t3.small  # For better performance (default)

# Optional: Restrict access to Railway IPs
export ALLOWED_IP=0.0.0.0/0  # Or specific IPs

# Deploy
./deploy-ec2.sh
```

The script will:
1. ✅ Dynamically resolve latest Ubuntu AMI
2. ✅ Create/update security groups
3. ✅ Launch optimized EC2 instance
4. ✅ Auto-install Docker via user-data
5. ✅ Provide deployment instructions

### Step 2: Deploy Service on EC2

After EC2 instance is running:

```bash
# SSH into instance
ssh -i ~/.ssh/your-key.pem ubuntu@<PUBLIC_IP>

# Clone repository
git clone <your-repo-url>
cd whisper-service

# Or copy files manually
# scp -r whisper-service/* ubuntu@<PUBLIC_IP>:~/whisper-service/

# Create .env file
cp .env.example .env
nano .env  # Edit with your settings

# Set production environment variables
cat > .env << EOF
WHISPER_MODEL=base
WHISPER_DEVICE=cpu
MAX_SESSIONS=10
SESSION_TTL=600
BUFFER_OVERLAP_SECONDS=2.0
WHISPER_API_KEY=your-secure-api-key-here
REQUIRE_API_KEY=true
ALLOWED_ORIGINS=https://your-railway-app.up.railway.app
PORT=8000
EOF

# Deploy with Docker Compose
docker-compose -f docker-compose.prod.yml up -d

# Pre-load model for faster first request
./warmup.sh
```

### Step 3: Configure Railway

In your Railway Next.js app, set environment variables:

```
WHISPER_SERVICE_URL=http://<EC2_PUBLIC_IP>:8000
WHISPER_API_KEY=your-secure-api-key-here
```

**Important:** Use the same `WHISPER_API_KEY` on both AWS and Railway.

### Step 4: Verify Deployment

```bash
# Test from anywhere
curl http://<EC2_PUBLIC_IP>:8000/health

# Should return:
# {"status":"healthy","model":"base","device":"cpu",...}
```

## Performance Optimization

### 1. Pre-load Model (Automatic)

The `warmup.sh` script pre-loads the model:

```bash
./warmup.sh
```

### 2. Keep Service Warm (Automatic)

The user-data script sets up a cron job to ping the service every 5 minutes:

```bash
# Already configured via user-data.sh
# Or manually:
(crontab -l 2>/dev/null; echo "*/5 * * * * curl -sf http://localhost:8000/health > /dev/null") | crontab -
```

### 3. Use Larger Instance for Better Performance

```bash
# For faster transcription, use t3.medium
export INSTANCE_TYPE=t3.medium
./deploy-ec2.sh
```

**Instance Recommendations:**
- `t2.micro`: Free tier, 1GB RAM, slower (~15-20s per chunk)
- `t3.small`: ~$15/mo, 2GB RAM, good (~5-10s per chunk) ⭐ **Recommended**
- `t3.medium`: ~$30/mo, 4GB RAM, excellent (~3-5s per chunk)

### 4. Model Selection

Edit `.env` on EC2:

```bash
# Faster, less accurate
WHISPER_MODEL=tiny

# Balanced (default)
WHISPER_MODEL=base

# Better accuracy, slower
WHISPER_MODEL=small  # Requires t3.small or larger
```

## Security Configuration

### 1. Set API Key

On EC2 (`.env`):
```
WHISPER_API_KEY=your-very-secure-random-key-here
REQUIRE_API_KEY=true
```

On Railway:
```
WHISPER_API_KEY=your-very-secure-random-key-here
```

### 2. Restrict CORS

On EC2 (`.env`):
```
ALLOWED_ORIGINS=https://your-railway-app.up.railway.app
```

### 3. Restrict Security Group (Optional)

```bash
# Get Railway IPs and restrict access
export ALLOWED_IP=<RAILWAY_IP>/32
./deploy-ec2.sh
```

## Monitoring & Maintenance

### Check Service Status

```bash
# SSH into EC2
ssh -i ~/.ssh/your-key.pem ubuntu@<PUBLIC_IP>

# Check Docker containers
docker-compose -f docker-compose.prod.yml ps

# Check logs
docker-compose -f docker-compose.prod.yml logs -f whisper-service

# Health check
curl http://localhost:8000/health
```

### Update Service

```bash
# SSH into EC2
cd whisper-service

# Pull latest changes
git pull

# Rebuild and restart
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build

# Warmup
./warmup.sh
```

### Stop/Start Instance

```bash
# Stop (saves costs, keeps data)
aws ec2 stop-instances --instance-ids <INSTANCE_ID> --region <REGION>

# Start
aws ec2 start-instances --instance-ids <INSTANCE_ID> --region <REGION>

# Get new IP after start
aws ec2 describe-instances --instance-ids <INSTANCE_ID> --query 'Reservations[0].Instances[0].PublicIpAddress' --output text
```

## Troubleshooting

### Service Not Responding

```bash
# Check if service is running
docker-compose -f docker-compose.prod.yml ps

# Check logs
docker-compose -f docker-compose.prod.yml logs whisper-service

# Restart service
docker-compose -f docker-compose.prod.yml restart whisper-service
```

### Model Not Loading

```bash
# Check disk space
df -h

# Check model cache
ls -lh ~/.cache/whisper/

# Force re-download
rm -rf ~/.cache/whisper/
docker-compose -f docker-compose.prod.yml restart whisper-service
```

### Slow Performance

1. **Upgrade instance type**: `t3.small` → `t3.medium`
2. **Use smaller model**: `base` → `tiny`
3. **Check instance CPU credits**: `t2.micro` has limited CPU credits
4. **Pre-load model**: Run `warmup.sh`

## Cost Optimization

- **Free Tier**: Use `t2.micro` (limited performance)
- **Production**: Use `t3.small` (~$15/mo) - best balance
- **Stop when not in use**: Saves ~70% costs (EBS storage still charged)
- **Reserved Instances**: Save up to 75% for 1-3 year commitments

## Next Steps

1. ✅ Deploy to AWS EC2
2. ✅ Configure Railway with EC2 URL
3. ✅ Test transcription
4. ✅ Monitor performance
5. ✅ Optimize based on usage

Your Whisper service is now faster and more reliable than using external APIs! 🚀

