# TTS Engine Comparison

This project supports three TTS engines, each with different strengths.

## Quick Comparison

| Feature | Kokoro | Qwen3-Clone | Qwen3-Custom |
|---------|--------|-------------|--------------|
| Model Size | 82M | 0.6B | 1.7B |
| Speed | Fast | Medium | Slower |
| Voice Cloning | No | Yes | No |
| Custom Voices | 11 built-in | Any voice | ~10 predefined |
| Emotion Control | No | Yes (`--instruct`) | Yes (`--instruct`) |
| Best For | Quick previews | Cloning any voice | Styled narration |

## Kokoro

**Model**: `mlx-community/Kokoro-82M-bf16`

Fast, high-quality TTS with 11 built-in voices. Best for:
- Quick previews and iterations
- Batch processing large amounts of text
- When you don't need a specific voice

### Available Voices

| Voice ID | Description |
|----------|-------------|
| `af_heart` | American Female (default) |
| `af_bella` | American Female |
| `af_nicole` | American Female |
| `af_sarah` | American Female |
| `af_sky` | American Female |
| `am_adam` | American Male |
| `am_michael` | American Male |
| `bf_emma` | British Female |
| `bf_isabella` | British Female |
| `bm_george` | British Male |
| `bm_lewis` | British Male |

### Usage

```bash
uv run python src/tts_record.py input.txt --engine kokoro --voice af_sky --speed 0.9
```

### Speed Control

Kokoro supports speed adjustment (0.5-2.0):
- `--speed 0.8`: Slower, more deliberate
- `--speed 1.0`: Normal (default)
- `--speed 1.2`: Faster

## Qwen3-Clone

**Model**: `mlx-community/Qwen3-TTS-12Hz-0.6B-Base-bf16`

Voice cloning engine that can replicate any voice from a reference audio sample. Best for:
- Creating content in a specific person's voice
- Consistent voice across long-form content
- Personal voice assistants

### Requirements

- Reference audio (30-180 seconds WAV)
- Transcript of the reference audio

### Usage

```bash
# Basic voice cloning
uv run python src/tts_record.py input.txt \
  --engine qwen3-clone \
  --ref-audio my_voice.wav \
  --ref-text "The transcript of my_voice.wav"

# With emotion/style instruction
uv run python src/tts_record.py input.txt \
  --engine qwen3-clone \
  --ref-audio my_voice.wav \
  --ref-text transcript.txt \
  --instruct "Speaking with enthusiasm"
```

### Tips

- Longer reference audio (90-180s) produces better results
- Use phoneme-rich scripts from `scripts/` for best coverage
- Transcript must match audio exactly

## Qwen3-Custom

**Model**: `mlx-community/Qwen3-TTS-12Hz-1.7B-CustomVoice-bf16`

Predefined high-quality voices with emotion/style control. Best for:
- Professional narration
- Audiobooks and podcasts
- When you need consistent, styled output without creating a reference

### Available Voices

- `Vivian` (default)
- `Serena`
- `Dylan`
- `Uncle_Fu`
- And more...

### Usage

```bash
# Basic usage
uv run python src/tts_record.py input.txt --engine qwen3-custom --voice Vivian

# With emotion instruction
uv run python src/tts_record.py input.txt \
  --engine qwen3-custom \
  --voice Dylan \
  --instruct "Speaking slowly and thoughtfully, with a warm tone"
```

### Instruct Examples

The `--instruct` parameter accepts natural language descriptions:

| Instruction | Effect |
|-------------|--------|
| "Speaking calmly" | Slower, relaxed delivery |
| "With excitement" | More energetic, varied intonation |
| "In a professional tone" | Formal, clear articulation |
| "Whispering" | Softer, breathier voice |
| "Reading a bedtime story" | Gentle, soothing delivery |

## Choosing an Engine

**Use Kokoro when:**
- You need fast results
- Any of the built-in voices work for you
- Processing large batches of text

**Use Qwen3-Clone when:**
- You need a specific person's voice
- Creating personalized content
- Building a voice assistant

**Use Qwen3-Custom when:**
- You want high-quality predefined voices
- Need emotion/style control
- Creating professional narration
