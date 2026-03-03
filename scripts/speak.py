#!/usr/bin/env python3
"""ElevenLabs TTS - pipe text to this script to hear it spoken."""

import sys
import os
import subprocess
import tempfile

from elevenlabs import ElevenLabs

API_KEY = os.environ.get("ELEVEN_API_KEY")
VOICE_ID = os.environ.get("ELEVEN_VOICE_ID", "PB6BdkFkZLbI39GHdnbQ")

if not API_KEY:
    sys.exit(0)

def speak(text: str):
    if not text.strip():
        return

    client = ElevenLabs(api_key=API_KEY)

    audio = client.text_to_speech.convert(
        voice_id=VOICE_ID,
        text=text,
        model_id="eleven_turbo_v2_5",
    )

    # Write to temp file and play
    with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as f:
        for chunk in audio:
            f.write(chunk)
        f.flush()

        # Play with mpv (quiet mode) or paplay
        try:
            subprocess.run(["mpv", "--no-video", "--really-quiet", f.name], check=True)
        except FileNotFoundError:
            subprocess.run(["ffplay", "-nodisp", "-autoexit", "-loglevel", "quiet", f.name], check=True)

        os.unlink(f.name)

if __name__ == "__main__":
    if len(sys.argv) > 1:
        text = " ".join(sys.argv[1:])
    else:
        text = sys.stdin.read()

    speak(text)
