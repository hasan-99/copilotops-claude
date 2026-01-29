#!/bin/bash
# Post-deployment verification hook for Claude Code
# Runs after deployment to verify success

DEPLOYMENT_URL="$1"
MAX_RETRIES=5
RETRY_DELAY=10

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

printf "${YELLOW}Running post-deployment verification...${NC}\n"

# If no URL provided, try to get from Vercel
if [ -z "$DEPLOYMENT_URL" ]; then
    # Try to get latest Vercel deployment URL
    if command -v vercel &> /dev/null; then
        DEPLOYMENT_URL=$(vercel ls --limit 1 2>/dev/null | tail -1 | awk '{print $2}')
    fi
fi

if [ -z "$DEPLOYMENT_URL" ]; then
    printf "${YELLOW}No deployment URL provided, skipping verification${NC}\n"
    exit 0
fi

# Ensure URL has protocol
if [[ ! "$DEPLOYMENT_URL" =~ ^https?:// ]]; then
    DEPLOYMENT_URL="https://$DEPLOYMENT_URL"
fi

echo "Verifying deployment at: $DEPLOYMENT_URL"

# Health check with retries
for i in $(seq 1 $MAX_RETRIES); do
    echo "Attempt $i of $MAX_RETRIES..."

    # Try health endpoint first, then root
    for endpoint in "/api/health" "/health" "/"; do
        URL="${DEPLOYMENT_URL}${endpoint}"

        HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 "$URL" 2>/dev/null)

        if [ "$HTTP_STATUS" = "200" ]; then
            printf "${GREEN}Deployment verified successfully!${NC}\n"
            echo "  URL: $URL"
            echo "  Status: $HTTP_STATUS"
            exit 0
        fi
    done

    if [ $i -lt $MAX_RETRIES ]; then
        echo "Waiting ${RETRY_DELAY}s before retry..."
        sleep $RETRY_DELAY
    fi
done

printf "${RED}Deployment verification failed after %s attempts${NC}\n" "$MAX_RETRIES"
echo "Last status code: $HTTP_STATUS"
exit 1
