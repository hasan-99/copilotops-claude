#!/bin/bash
# Quick TTS wrapper for hooks
# Requires ELEVEN_API_KEY env var (set in shell profile or .env.claude)
# Cross-platform: detects Windows venv path vs Unix venv path
export PYTHONWARNINGS="ignore::UserWarning"
export ELEVEN_VOICE_ID="${ELEVEN_VOICE_ID:-PB6BdkFkZLbI39GHdnbQ}"

TEXT="${1:-}"
if [ -n "$TEXT" ] && [ -n "$ELEVEN_API_KEY" ]; then
    # Cross-platform venv python detection
    VENV_PYTHON="$HOME/.claude/venv/bin/python"
    if [ ! -f "$VENV_PYTHON" ]; then
        VENV_PYTHON="$HOME/.claude/venv/Scripts/python"
    fi
    if [ -f "$VENV_PYTHON" ]; then
        echo "$TEXT" | "$VENV_PYTHON" "$HOME/.claude/scripts/speak.py" &
    fi
fi
