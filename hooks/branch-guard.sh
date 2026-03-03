#!/bin/bash
# Branch protection hook — blocks direct push to main/master
# Triggered by PreToolUse on git push

BRANCH=$(git branch --show-current 2>/dev/null || echo "")

# Block any push while on main/master (catches bare "git push" too)
if [ "$BRANCH" = "main" ] || [ "$BRANCH" = "master" ]; then
    echo "BLOCKED: Direct push from $BRANCH is not allowed."
    echo "Create a feature branch first: git checkout -b feature/your-feature"
    echo "Then push: git push origin feature/your-feature"
    exit 2
fi

exit 0
