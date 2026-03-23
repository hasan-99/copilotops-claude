#!/usr/bin/env python3
"""
Voice-to-text hotkey listener for Razer Basilisk V3 35K mouse button.
Press forward button to start recording. Stops automatically after
1.5s of silence. Pastes transcription and presses Enter.
"""

import subprocess
import sys
import os
import signal
import json
import threading
import time
import struct
import wave

try:
    import evdev
    from evdev import ecodes
except ImportError:
    print("Install evdev: pip install evdev")
    sys.exit(1)

# Config
ELEVEN_API_KEY = os.environ.get("ELEVEN_API_KEY", "sk_7ed98c8dfe85842183561244ebc3e7120ac291b7005ec0ca")
MOUSE_NAME = "Razer Razer Basilisk V3 35K"
TARGET_BUTTON = 276  # BTN_EXTRA = mouse forward button
AUDIO_FILE = "/tmp/voice-input.wav"
MIC_DEVICE = "plughw:1,0"  # USB Condenser Microphone

# Silence detection
SILENCE_THRESHOLD = 500    # RMS amplitude below this = silence
SILENCE_DURATION = 1.5     # Seconds of silence before auto-stop
CHECK_INTERVAL = 0.2       # How often to check audio level

recording_proc = None
is_recording = False
lock = threading.Lock()


def notify(msg, timeout=2000):
    subprocess.Popen(["notify-send", "-t", str(timeout), "Voice Input", msg],
                     stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def get_rms(audio_file):
    """Get RMS of the last chunk of recorded audio."""
    try:
        size = os.path.getsize(audio_file)
        if size < 1000:
            return 0
        # Read last 0.2s of audio (16000 Hz * 2 bytes * 0.2s = 6400 bytes)
        chunk_size = 6400
        with open(audio_file, "rb") as f:
            # Skip WAV header area, read from near end
            read_start = max(44, size - chunk_size)
            f.seek(read_start)
            data = f.read(chunk_size)

        if len(data) < 100:
            return 0

        # Parse as 16-bit signed samples
        samples = struct.unpack(f"<{len(data)//2}h", data[:len(data) - len(data) % 2])
        if not samples:
            return 0
        rms = (sum(s * s for s in samples) / len(samples)) ** 0.5
        return rms
    except Exception:
        return 0


def silence_monitor():
    """Background thread: monitors audio level and stops recording on silence."""
    global is_recording
    silence_start = None

    # Wait a bit before starting to monitor (let user start speaking)
    time.sleep(0.8)

    while is_recording:
        time.sleep(CHECK_INTERVAL)
        if not is_recording:
            break

        rms = get_rms(AUDIO_FILE)

        if rms < SILENCE_THRESHOLD:
            if silence_start is None:
                silence_start = time.time()
            elif time.time() - silence_start >= SILENCE_DURATION:
                # Silence long enough — stop and transcribe
                with lock:
                    if is_recording:
                        is_recording = False
                        stop_and_transcribe()
                return
        else:
            silence_start = None


def start_recording():
    global recording_proc, is_recording

    with lock:
        if is_recording:
            return
        is_recording = True

    notify("Recording...")
    recording_proc = subprocess.Popen(
        ["arecord", "-D", MIC_DEVICE, "-f", "S16_LE", "-r", "16000", "-c", "1", AUDIO_FILE],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
    )

    # Start silence monitor in background
    t = threading.Thread(target=silence_monitor, daemon=True)
    t.start()


def stop_and_transcribe():
    global recording_proc, is_recording

    if recording_proc:
        try:
            recording_proc.terminate()
            recording_proc.wait(timeout=2)
        except Exception:
            pass
        recording_proc = None

    is_recording = False

    if not os.path.exists(AUDIO_FILE):
        notify("No audio recorded")
        return

    if os.path.getsize(AUDIO_FILE) < 10000:
        notify("Recording too short")
        try:
            os.unlink(AUDIO_FILE)
        except OSError:
            pass
        return

    notify("Transcribing...")

    try:
        result = subprocess.run(
            ["curl", "-s", "-X", "POST", "https://api.elevenlabs.io/v1/speech-to-text",
             "-H", f"xi-api-key: {ELEVEN_API_KEY}",
             "-F", f"file=@{AUDIO_FILE}",
             "-F", "model_id=scribe_v1"],
            capture_output=True, text=True, timeout=30
        )
        os.unlink(AUDIO_FILE)

        response = json.loads(result.stdout)
        text = response.get("text", "").strip()

        if not text:
            notify("No speech detected")
            return

        # Copy to clipboard, paste, then press Enter (wtype = Wayland-native, no daemon)
        subprocess.run(["wl-copy", text], check=True)
        time.sleep(0.1)
        # Ctrl+V (paste)
        subprocess.run(["wtype", "-M", "ctrl", "v", "-m", "ctrl"], check=True)
        time.sleep(0.15)
        # Enter (send)
        subprocess.run(["wtype", "-k", "Return"], check=True)

        notify(text[:100])

    except Exception as e:
        notify(f"Error: {str(e)[:80]}")
        try:
            os.unlink(AUDIO_FILE)
        except OSError:
            pass


def find_device():
    """Find the Razer mouse event device."""
    devices = [evdev.InputDevice(path) for path in evdev.list_devices()]
    for dev in devices:
        if MOUSE_NAME in dev.name:
            caps = dev.capabilities(verbose=True)
            for (etype, _), codes in caps.items():
                for code_info in codes:
                    if isinstance(code_info, tuple):
                        _, code_val = code_info
                        if code_val == TARGET_BUTTON:
                            return dev
                    elif code_info == TARGET_BUTTON:
                        return dev
    for dev in devices:
        if MOUSE_NAME in dev.name and "Keyboard" not in dev.name:
            return dev
    return None


def main():
    global is_recording

    dev = find_device()
    if not dev:
        print(f"Could not find '{MOUSE_NAME}' input device.")
        print("Available devices:")
        for path in evdev.list_devices():
            d = evdev.InputDevice(path)
            print(f"  {path}: {d.name}")
        sys.exit(1)

    print(f"Listening on: {dev.name} ({dev.path})")
    print(f"Press mouse forward button to record. Auto-stops on {SILENCE_DURATION}s silence.")

    for event in dev.read_loop():
        if event.type == ecodes.EV_KEY and event.code == TARGET_BUTTON and event.value == 1:
            if not is_recording:
                start_recording()


if __name__ == "__main__":
    main()
