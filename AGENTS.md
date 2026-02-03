# AGENTS.md

This file provides guidance to Claude Code or Codex when working with code in this repository.

## Project Overview

Voice cloning and text-to-speech using MLX Audio on Apple Silicon. Supports three TTS engines: Kokoro (fast), Qwen3-Clone (voice cloning), and Qwen3-Custom (styled voices with emotion control).

**Requirements**: macOS Apple Silicon (M1/M2/M3/M4), Python 3.10-3.12, uv package manager

## Commands

```bash
# Install dependencies
uv sync

# Text to speech (Kokoro - fastest)
uv run python src/tts_record.py input.txt -o output.wav
uv run python src/tts_record.py input.txt --voice af_sky --speed 0.9

# Voice cloning (Qwen3)
uv run python src/tts_record.py input.txt --engine qwen3-clone
uv run python src/tts_record.py input.txt --engine qwen3-clone --ref-audio voice.wav --ref-text "transcript"

# Custom voice with emotion
uv run python src/tts_record.py input.txt --engine qwen3-custom --voice Vivian --instruct "Speaking cheerfully"

# Generate synthetic reference audio
uv run python src/generate_reference.py --voice af_heart --out reference/my_ref.wav
uv run python src/generate_reference.py --print-text  # Show phoneme-rich text
```

## Architecture

### TTS Engines

| Engine | Model | Parameters | Voice Cloning |
|--------|-------|------------|---------------|
| `kokoro` | Kokoro-82M | 82M | No (11 built-in voices) |
| `qwen3-clone` | Qwen3-TTS-0.6B | 600M | Yes (from reference audio) |
| `qwen3-custom` | Qwen3-TTS-1.7B | 1.7B | No (predefined voices + instruct) |

### Data Flow

```
Text input → tts_record.py → MLX Audio model → numpy audio chunks → soundfile → WAV output
```

For voice cloning, reference audio + transcript are passed to qwen3-clone engine.

### Key Files

- `src/tts_record.py` - Main TTS CLI with all three engines
- `src/generate_reference.py` - Creates synthetic reference audio using Kokoro
- `webapp/` - Browser-based teleprompter for recording voice samples
- `scripts/` - Phoneme-rich text templates (90s-180s) optimized for voice cloning
- `reference/` - Voice reference audio files and transcripts

### Voice Alias System

`tts_record.py` uses `VOICE_ALIASES` dict to map voice names to reference audio/text paths. Default alias `af_heart` points to bundled reference files in `reference/`.

### Output Naming

Default output path: `{input_dir}/{date}-{input_stem}-{model_name}.wav`

## Kokoro Voices

`af_heart` (default), `af_bella`, `af_nicole`, `af_sarah`, `af_sky`, `am_adam`, `am_michael`, `bf_emma`, `bf_isabella`, `bm_george`, `bm_lewis`

## Notes

- All audio output is WAV at 24000 Hz
- The `--speed` flag only works with the kokoro engine
- The `--instruct` flag works with qwen3-clone and qwen3-custom for emotion/style control
- Webapp at `webapp/index.html` records voice samples with auto-scrolling teleprompter
