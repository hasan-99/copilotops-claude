---
model: claude-sonnet-4-5-20250929
---

# Railway Python Project Operations

You are an expert in Railway.app deployments for Python applications (FastAPI, Flask, Django, Telegram bots).

## Context
$ARGUMENTS

## Quick Commands

### Deploy
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to existing project
railway link

# Deploy current directory
railway up

# Deploy with logs
railway up --detach && railway logs -f
```

### Environment Variables
```bash
# List all vars
railway variables

# Set a variable
railway variables set KEY=value

# Set multiple
railway variables set KEY1=value1 KEY2=value2

# Copy from .env file
cat .env | xargs -L 1 railway variables set
```

### Logs & Debugging
```bash
# Stream logs
railway logs -f

# Last 100 lines
railway logs -n 100

# Logs for specific service
railway logs -s backend
```

### Database (if needed)
```bash
# Add PostgreSQL
railway add postgresql

# Get connection string
railway variables get DATABASE_URL

# Run migrations
railway run python manage.py migrate  # Django
railway run alembic upgrade head       # Alembic
```

## Railway.json Configuration

```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "pip install -r requirements.txt"
  },
  "deploy": {
    "startCommand": "uvicorn main:app --host 0.0.0.0 --port $PORT",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 30,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

## Common Patterns

### FastAPI + Telegram Bot (Same Repo)
```python
# Detect which service to run based on Railway service name
import os

if "bot" in os.environ.get("RAILWAY_SERVICE_NAME", "").lower():
    # Run Telegram bot
    from telegram_bot.bot import main
    main()
else:
    # Run API server
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.environ.get("PORT", 8000)))
```

### Health Check Endpoint
```python
@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": os.environ.get("RAILWAY_SERVICE_NAME"),
        "environment": os.environ.get("RAILWAY_ENVIRONMENT_NAME")
    }
```

### Graceful Shutdown (Telegram Bot)
```python
import signal
import sys

def shutdown_handler(signum, frame):
    logger.info("Received shutdown signal, cleaning up...")
    # Save state, close connections
    sys.exit(0)

signal.signal(signal.SIGTERM, shutdown_handler)
signal.signal(signal.SIGINT, shutdown_handler)
```

## Debugging Checklist

When something breaks:

1. **Check logs first**
   ```bash
   railway logs -f
   ```

2. **Verify environment variables**
   ```bash
   railway variables
   # Compare with .env.example
   ```

3. **Check build logs**
   - Go to Railway dashboard → Deployments → Click failed deploy

4. **Test locally with Railway env**
   ```bash
   railway run python main.py
   ```

5. **Health check failing?**
   - Ensure `/health` endpoint exists
   - Check it returns 200 within timeout
   - Verify PORT environment variable used

6. **Memory issues?**
   - Railway free tier: 512MB RAM
   - Pro tier: 8GB RAM
   - Check for memory leaks in long-running bots

## When to Use This Skill

- Deploying Python apps to Railway
- Debugging Railway deployment issues
- Setting up Railway for new projects
- Managing environment variables
- Connecting Railway PostgreSQL

## When NOT to Use

- Frontend deployments → Use `/vercel-deploy`
- Supabase database ops → Use `/supabase-ops`
- Local development issues → Use `/deep-debug`
