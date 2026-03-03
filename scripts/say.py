#!/usr/bin/env python3
"""
Smart TTS wrapper with ElevenLabs best practices.
- Filters code, errors, and system noise
- Normalizes text for natural speech (numbers, URLs, abbreviations)
- Only speaks natural conversation

Usage: echo "message" | say.py  OR  say.py "message"
"""

import sys
import os
import re
import subprocess
import tempfile
import warnings

warnings.filterwarnings("ignore")

# ============================================================================
# CONFIGURATION
# ============================================================================

VOLUME = 50       # 0-100, set to 0 to mute completely
MAX_LENGTH = 500  # Max characters to speak
MIN_LENGTH = 2    # Min characters
MAX_NEWLINES = 4  # Max newlines allowed

# Patterns that indicate non-conversational content (reject if matched)
REJECT_PATTERNS = [
    r'```',                        # Code blocks
    r'^\s*import\s+',              # Import statements
    r'^\s*export\s+',              # Export statements
    r'^\s*const\s+\w+\s*=',        # JS variable declarations
    r'^\s*let\s+\w+\s*=',          # JS let declarations
    r'^\s*var\s+\w+\s*=',          # JS var declarations
    r'^\s*function\s+\w+\s*\(',    # JS function definitions
    r'^\s*def\s+\w+\s*\(',         # Python functions
    r'^\s*class\s+\w+',            # Class definitions
    r'^\s*async\s+',               # Async declarations
    r'^\s*await\s+',               # Await expressions
    r'\{\s*\n',                    # Opening braces with newline (code)
    r'^\s*<[a-zA-Z]',              # HTML/JSX tags
    r'^\s*\d+[→│\|]\s*',           # Line number prefixes (file reads)
    r'node_modules',               # Path noise
    r'\.tsx?:\d+',                 # File:line references (file.ts:123)
    r'\.jsx?:\d+',                 # File:line references (file.js:123)
    r'\.py:\d+',                   # Python file:line references
    r'Error:|error:|ERROR|ERR!',   # Error messages
    r'Warning:|warning:|WARN',     # Warnings
    r'^\s*at\s+\w+\s*\(',          # Stack traces
    r'Traceback \(most recent',    # Python tracebacks
    r'^\s*\$\s+',                  # Shell prompts
    r'^\s*>\s+',                   # REPL prompts
    r'npm\s+(ERR|WARN|notice)',    # npm messages
    r'^\s*[-*]\s+`',               # Markdown list with code
    r'^\s*\d+\.\s+`',              # Numbered list with code
    r'\|\s*\w+\s*\|',              # Markdown tables
    r'={3,}|_{3,}|-{3,}',          # Markdown separators
]

# ============================================================================
# TEXT NORMALIZATION (ElevenLabs best practices)
# ============================================================================

def normalize_numbers(text: str) -> str:
    """Convert numbers to speakable format."""
    # Simple number to words for common cases
    number_words = {
        '0': 'zero', '1': 'one', '2': 'two', '3': 'three', '4': 'four',
        '5': 'five', '6': 'six', '7': 'seven', '8': 'eight', '9': 'nine',
        '10': 'ten', '11': 'eleven', '12': 'twelve'
    }

    # Handle percentages: 50% -> fifty percent
    text = re.sub(r'(\d+)%', lambda m: f"{m.group(1)} percent", text)

    # Handle simple standalone small numbers
    for num, word in number_words.items():
        text = re.sub(rf'\b{num}\b', word, text)

    return text

def normalize_urls(text: str) -> str:
    """Convert URLs to speakable format or remove."""
    # Remove full URLs - they're not speakable
    text = re.sub(r'https?://[^\s]+', '', text)
    # Simplify file paths
    text = re.sub(r'[~/][\w/.-]+\.(py|sh|js|ts|json|md)', 'the script', text)
    return text

def expand_abbreviations(text: str) -> str:
    """Expand common abbreviations for clearer speech."""
    abbreviations = {
        r'\bTTS\b': 'text to speech',
        r'\bAPI\b': 'A P I',
        r'\bURL\b': 'U R L',
        r'\bUI\b': 'U I',
        r'\bAI\b': 'A I',
        r'\bOK\b': 'okay',
        r'\bok\b': 'okay',
        r'\bconfig\b': 'configuration',
        r'\brepo\b': 'repository',
        r'\binfo\b': 'information',
        r'\bdocs?\b': 'documentation',
        r'\bauth\b': 'authentication',
        r'\benv\b': 'environment',
    }
    for pattern, replacement in abbreviations.items():
        text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
    return text

def clean_for_speech(text: str) -> str:
    """Clean and normalize text for natural speech."""
    # Remove markdown formatting
    text = re.sub(r'\*\*([^*]+)\*\*', r'\1', text)  # Bold
    text = re.sub(r'\*([^*]+)\*', r'\1', text)      # Italic
    text = re.sub(r'`([^`]+)`', r'\1', text)        # Inline code
    text = re.sub(r'#{1,6}\s*', '', text)           # Headers

    # Remove special characters that don't speak well
    text = re.sub(r'[→│\|•]', ' ', text)
    text = re.sub(r'[\[\]]', '', text)              # Square brackets

    # Normalize whitespace
    text = re.sub(r'\s+', ' ', text)

    # Apply normalizations
    text = normalize_urls(text)
    text = expand_abbreviations(text)
    text = normalize_numbers(text)

    return text.strip()

# ============================================================================
# FILTERING
# ============================================================================

def should_speak(text: str) -> bool:
    """Return True if text is natural conversation worth speaking."""
    text = text.strip()

    # Length checks
    if len(text) < MIN_LENGTH or len(text) > MAX_LENGTH:
        return False

    # Too many newlines = probably not conversation
    if text.count('\n') > MAX_NEWLINES:
        return False

    # Check reject patterns
    for pattern in REJECT_PATTERNS:
        if re.search(pattern, text, re.MULTILINE | re.IGNORECASE):
            return False

    return True

# ============================================================================
# SPEECH OUTPUT
# ============================================================================

def speak(text: str):
    """Speak text via ElevenLabs with optimized settings."""
    if VOLUME <= 0:
        return

    try:
        from elevenlabs import ElevenLabs
    except ImportError:
        print("elevenlabs not installed", file=sys.stderr)
        return

    api_key = os.environ.get("ELEVEN_API_KEY")
    voice_id = os.environ.get("ELEVEN_VOICE_ID", "PB6BdkFkZLbI39GHdnbQ")

    if not api_key:
        return

    client = ElevenLabs(api_key=api_key)

    # Clean text for speech
    clean_text = clean_for_speech(text)

    if not clean_text or len(clean_text) < MIN_LENGTH:
        return

    try:
        audio = client.text_to_speech.convert(
            voice_id=voice_id,
            text=clean_text,
            model_id="eleven_turbo_v2_5",  # Fast, good quality
        )

        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as f:
            for chunk in audio:
                f.write(chunk)
            f.flush()
            temp_path = f.name

        # Play audio
        try:
            subprocess.run(
                ["mpv", "--no-video", "--really-quiet", "--volume=50", temp_path],
                check=True,
                capture_output=True
            )
        except FileNotFoundError:
            try:
                subprocess.run(
                    ["ffplay", "-nodisp", "-autoexit", "-loglevel", "quiet", "-volume", "50", temp_path],
                    check=True,
                    capture_output=True
                )
            except FileNotFoundError:
                print("No audio player found (mpv or ffplay)", file=sys.stderr)

        os.unlink(temp_path)

    except Exception as e:
        # Silently fail - don't interrupt workflow
        pass

# ============================================================================
# MAIN
# ============================================================================

if __name__ == "__main__":
    if len(sys.argv) > 1:
        text = " ".join(sys.argv[1:])
    else:
        text = sys.stdin.read()

    text = text.strip()

    if should_speak(text):
        speak(text)
