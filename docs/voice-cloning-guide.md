# Voice Cloning Guide

This guide explains how to create high-quality voice clones using Qwen3-TTS.

## Overview

Voice cloning requires two inputs:
1. **Reference Audio**: A WAV file of the target voice (30s-180s recommended)
2. **Reference Text**: The exact transcript of what was spoken in the audio

The model learns the voice characteristics from the reference and applies them to new text.

## Creating Reference Audio

### Option 1: Teleprompter Webapp (Recommended)

The webapp provides a guided recording experience with phoneme-rich scripts.

1. Open `webapp/index.html` in your browser
2. Allow microphone access when prompted
3. Select a script template:
   - **Core Clarity (90s)**: Minimal, covers essential sounds
   - **Balanced Range (120s)**: Good balance of coverage and length
   - **Extended Coverage (150s)**: Better positional coverage
   - **Full Spectrum (180s)**: Complete phoneme coverage
4. Click "Start Recording" and read the script naturally
5. Click "Stop" when finished
6. Download the WAV file

**Tips for recording:**
- Use a quiet environment
- Speak naturally at your normal pace
- Maintain consistent volume and distance from microphone
- Don't rush - pauses are fine

### Option 2: Synthetic Reference (Kokoro)

Generate reference audio from one of Kokoro's built-in voices:

```bash
uv run python src/generate_reference.py \
  --voice af_heart \
  --out reference/af_heart.wav
```

The script will print the transcript to save alongside the audio.

### Option 3: Existing Recordings

Any clear audio recording can work. Requirements:
- Clear audio quality (minimal background noise)
- Single speaker
- 30-180 seconds duration (longer = better quality, but diminishing returns after 180s)
- Accurate transcript of what was spoken

## Using Your Voice Clone

Once you have reference audio and its transcript:

```bash
# Basic usage
uv run python src/tts_record.py input.txt \
  --engine qwen3-clone \
  --ref-audio path/to/reference.wav \
  --ref-text "The exact transcript of what was spoken in reference.wav"

# From a transcript file
uv run python src/tts_record.py input.txt \
  --engine qwen3-clone \
  --ref-audio reference.wav \
  --ref-text path/to/transcript.txt
```

### Adding Emotion/Style

Use `--instruct` to control speaking style:

```bash
uv run python src/tts_record.py input.txt \
  --engine qwen3-clone \
  --ref-audio reference.wav \
  --ref-text transcript.txt \
  --instruct "Speaking warmly and cheerfully"
```

Example instructions:
- "Speaking calmly and slowly"
- "With enthusiasm and energy"
- "In a professional, formal tone"
- "Softly, as if telling a bedtime story"

## Analyzing Your Recording

Use the word gap analysis tool to verify your recording quality:

1. Open `webapp/test-word-gap.html` in your browser
2. Select your recorded audio file
3. The tool auto-detects which script was used from the filename
4. Click "Analyze Audio" to test different word gap detection settings

The tool shows how many words were detected at various gap thresholds, helping you verify the recording captured all expected words clearly.

## Quality Tips

### Reference Audio Quality

| Factor | Impact | Recommendation |
|--------|--------|----------------|
| Duration | High | 90-180 seconds ideal |
| Audio quality | High | Use good microphone, quiet room |
| Speaking variety | Medium | Include questions, statements, emotions |
| Transcript accuracy | High | Must match audio exactly |

### Common Issues

**Cloned voice sounds robotic:**
- Reference audio may be too short (try 90s+)
- Audio quality may be poor
- Try a different script with more phoneme variety

**Some sounds are wrong:**
- Reference may not cover all phonemes
- Use a phoneme-rich script from `scripts/`

**Voice doesn't match well:**
- Ensure transcript matches audio exactly
- Check that reference audio has only one speaker

## Voice Aliases

You can create voice aliases for frequently used references by editing `src/tts_record.py`:

```python
VOICE_ALIASES = {
    "my_voice": {
        "ref_audio": PROJECT_ROOT / "reference/my_voice.wav",
        "ref_text": PROJECT_ROOT / "reference/my_voice.txt",
    },
}
```

Then use:
```bash
uv run python src/tts_record.py input.txt --engine qwen3-clone --voice my_voice
```
