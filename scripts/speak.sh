#!/bin/bash
# ElevenLabs TTS for Claude Code notifications
# Usage: speak.sh "Your message here"

TEXT="${1:-Task complete}"
VOICE_ID="${CLAUDE_VOICE_ID:-pNInz6obpgDQGcFmaJgB}"  # Adam (deep male) - change in .env.claude

# Skip if no API key
if [[ -z "$ELEVENLABS_API_KEY" ]]; then
  echo "No ELEVENLABS_API_KEY set" >&2
  exit 0
fi

# Escape text for JSON (prevents injection)
JSON_TEXT=$(printf '%s' "$TEXT" | jq -Rs '.')

# Generate and play speech
curl -s "https://api.elevenlabs.io/v1/text-to-speech/$VOICE_ID" \
  -H "xi-api-key: $ELEVENLABS_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"text\":$JSON_TEXT,\"model_id\":\"eleven_turbo_v2_5\",\"voice_settings\":{\"stability\":0.5,\"similarity_boost\":0.75}}" \
  --output /tmp/claude_speak.mp3 2>/dev/null

# Play with ffplay (quiet mode)
if [[ -f /tmp/claude_speak.mp3 && -s /tmp/claude_speak.mp3 ]]; then
  ffplay -nodisp -autoexit -loglevel quiet /tmp/claude_speak.mp3 2>/dev/null &
fi
