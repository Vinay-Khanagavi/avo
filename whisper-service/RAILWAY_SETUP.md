# Railway + AWS EC2 Setup Guide

## Architecture Overview

```
┌─────────────┐         ┌──────────────┐
│   Railway   │────────▶│  AWS EC2     │
│  Next.js    │  HTTP   │  Whisper     │
│   App       │◀────────│  Service     │
└─────────────┘         └──────────────┘
```

**Why this architecture is faster than APIs:**
- ✅ **No rate limits**: Your own service
- ✅ **Always-on**: Model stays loaded in memory
- ✅ **No cold starts**: Pre-loaded on startup
- ✅ **Dedicated resources**: Not shared with others
- ✅ **Lower latency**: Direct connection, no API gateway

## Step-by-Step Setup

### 1. Deploy Whisper Service to AWS EC2

```bash
cd whisper-service

# Quick deployment (interactive)
./quick-deploy.sh

# Or manual deployment
export AWS_KEY_NAME=your-key-name
export AWS_REGION=us-east-1
export INSTANCE_TYPE=t3.small  # For better performance
./deploy-ec2.sh
```

**After deployment, note:**
- EC2 Public IP: `http://X.X.X.X:8000`
- Instance ID: `i-xxxxx`

### 2. Complete EC2 Setup

SSH into your EC2 instance:

```bash
ssh -i ~/.ssh/your-key.pem ubuntu@<EC2_PUBLIC_IP>
```

Deploy the service:

```bash
# Clone your repository
git clone <your-repo-url>
cd whisper-service

# Or copy files manually
# scp -r whisper-service/* ubuntu@<EC2_IP>:~/whisper-service/

# Create production .env
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

# Deploy
docker-compose -f docker-compose.prod.yml up -d

# Pre-load model (makes first request fast)
./warmup.sh
```

### 3. Configure Railway

In your Railway project dashboard:

1. Go to **Variables** tab
2. Add these environment variables:

```
WHISPER_SERVICE_URL=http://<EC2_PUBLIC_IP>:8000
WHISPER_API_KEY=your-secure-api-key-here
```

**Important:** Use the same `WHISPER_API_KEY` on both AWS and Railway.

### 4. Verify Connection

Test from Railway or locally:

```bash
# Test health endpoint
curl http://<EC2_PUBLIC_IP>:8000/health

# Should return:
# {
#   "status": "healthy",
#   "model": "base",
#   "model_loaded": true,
#   "ready": true,
#   ...
# }
```

## Performance Tips

### Keep Service Warm

The service automatically stays warm via cron job, but you can verify:

```bash
# On EC2 instance
curl http://localhost:8000/health
```

### Monitor Performance

Check service logs:

```bash
# On EC2 instance
docker-compose -f docker-compose.prod.yml logs -f whisper-service
```

### Upgrade for Better Performance

```bash
# Stop current instance
aws ec2 stop-instances --instance-ids <INSTANCE_ID>

# Change instance type
aws ec2 modify-instance-attribute \
    --instance-id <INSTANCE_ID> \
    --instance-type Value=t3.medium

# Start instance
aws ec2 start-instances --instance-ids <INSTANCE_ID>

# Get new IP
aws ec2 describe-instances \
    --instance-ids <INSTANCE_ID> \
    --query 'Reservations[0].Instances[0].PublicIpAddress' \
    --output text
```

## Troubleshooting

### Railway can't connect to EC2

1. **Check security group**: Port 8000 must be open
2. **Check EC2 status**: Instance must be running
3. **Check service**: `curl http://<EC2_IP>:8000/health`
4. **Check API key**: Must match on both sides

### Slow first request

- Model is loading (~30-60s first time)
- Run `warmup.sh` on EC2 to pre-load
- Subsequent requests will be fast (5-10s)

### Service not responding

```bash
# On EC2
docker-compose -f docker-compose.prod.yml ps
docker-compose -f docker-compose.prod.yml logs whisper-service
docker-compose -f docker-compose.prod.yml restart whisper-service
```

## Cost Estimate

- **t3.small**: ~$15/month (recommended)
- **t3.medium**: ~$30/month (faster)
- **t2.micro**: Free tier (slower, limited)

**Total**: ~$15-30/month for always-on, fast transcription service.

## Success Checklist

- [ ] EC2 instance deployed and running
- [ ] Whisper service deployed on EC2
- [ ] Model pre-loaded (run `warmup.sh`)
- [ ] Health check returns `"ready": true`
- [ ] Railway configured with `WHISPER_SERVICE_URL`
- [ ] Same `WHISPER_API_KEY` on both services
- [ ] CORS configured with Railway URL
- [ ] Test transcription works end-to-end

Your setup is now faster and more reliable than using external APIs! 🚀

