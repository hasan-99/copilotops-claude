#!/bin/bash
# Quick TTS wrapper for hooks
# Requires ELEVEN_API_KEY env var (set in shell profile or .env.claude)
export PYTHONWARNINGS="ignore::UserWarning"
export ELEVEN_VOICE_ID="${ELEVEN_VOICE_ID:-PB6BdkFkZLbI39GHdnbQ}"

TEXT="${1:-}"
if [ -n "$TEXT" ] && [ -n "$ELEVEN_API_KEY" ]; then
    echo "$TEXT" | "$HOME/.claude/venv/bin/python" "$HOME/.claude/scripts/speak.py" &
fi
