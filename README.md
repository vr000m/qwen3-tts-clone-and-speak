# qwen3-tts-clone-and-speak

Voice cloning and text-to-speech using [MLX Audio](https://github.com/Blaizzy/mlx-audio) on Apple Silicon. Clone any voice with Qwen3-TTS, or use the fast Kokoro engine for quick synthesis.

## Features

- **3 TTS Engines**: Kokoro (fast), Qwen3-Clone (voice cloning), Qwen3-Custom (styled voices)
- **Voice Cloning**: Clone any voice from a short audio sample
- **Teleprompter Webapp**: Browser-based recorder for creating reference audio
- **Markdown Support**: Preprocess blog posts for TTS (strips code, frontmatter, links)
- **Phoneme-Rich Scripts**: 4 carefully crafted scripts optimized for voice cloning

## Requirements

- macOS with Apple Silicon (M1/M2/M3/M4)
- Python 3.10–3.12
- [uv](https://github.com/astral-sh/uv) package manager

## Installation

```bash
git clone https://github.com/vr000m/qwen3-tts-clone-and-speak.git
cd qwen3-tts-clone-and-speak
uv sync
```

## Quick Start

### Text to Speech (Kokoro - Fast)

```bash
# Basic usage
uv run python src/tts_record.py input.txt -o output.wav

# Different voice
uv run python src/tts_record.py input.txt --voice af_sky --speed 0.9
```

### Voice Cloning (Qwen3)

```bash
# Clone the included example voice
uv run python src/tts_record.py input.txt --engine qwen3-clone

# Use your own voice reference
uv run python src/tts_record.py input.txt --engine qwen3-clone \
  --ref-audio my_voice.wav --ref-text "The transcript of my_voice.wav"
```

### Markdown to Speech

```bash
# Preprocess markdown (strips code blocks, YAML frontmatter, HTML, links)
uv run python src/md2txt.py blog-post.md -o clean.txt

# Then convert to speech
uv run python src/tts_record.py clean.txt --engine qwen3-clone
```

## Engines

| Engine | Model | Speed | Use Case |
|--------|-------|-------|----------|
| `kokoro` | Kokoro-82M | Fast | Quick previews, batch processing |
| `qwen3-clone` | Qwen3-TTS-0.6B | Medium | Clone any voice from reference audio |
| `qwen3-custom` | Qwen3-TTS-1.7B | Slower | Predefined voices with emotion control |

## Creating Your Own Voice Clone

### Option 1: Use the Teleprompter Webapp

1. Open `webapp/index.html` in your browser
2. Select a script template (90s-180s)
3. Record yourself reading the script
4. Download the WAV file and use it as `--ref-audio`

**Word Gap Analysis**: Use `webapp/test-word-gap.html` to analyze recordings and find optimal word detection settings. It auto-detects which script was used from the filename.

### Option 2: Generate Synthetic Reference

```bash
# Generate reference audio using Kokoro
uv run python src/generate_reference.py --voice af_heart --out reference/my_ref.wav
```

### Option 3: Use Any Audio

Any clear audio recording (30s-180s) can work as a reference. Just provide the transcript.

## Scripts

### src/tts_record.py

Convert text files to speech.

| Option | Default | Description |
|--------|---------|-------------|
| `input_file` | required | Path to text file |
| `-o, --out` | auto | Output WAV path |
| `--engine` | `kokoro` | Engine: `kokoro`, `qwen3-clone`, `qwen3-custom` |
| `--voice` | engine default | Voice name |
| `--speed` | `1.0` | Speed multiplier (kokoro only) |
| `--ref-audio` | bundled example | Reference audio for voice cloning |
| `--ref-text` | bundled example | Transcript of reference audio |
| `--instruct` | none | Emotion/style instruction |

### src/generate_reference.py

Generate synthetic reference audio using Kokoro.

```bash
uv run python src/generate_reference.py --voice af_heart --out reference.wav
```

## Kokoro Voices

Available voices for the `kokoro` engine:

| Voice | Description |
|-------|-------------|
| `af_heart` | Female (default) |
| `af_bella` | Female |
| `af_nicole` | Female |
| `af_sarah` | Female |
| `af_sky` | Female |
| `am_adam` | Male |
| `am_michael` | Male |
| `bf_emma` | British Female |
| `bf_isabella` | British Female |
| `bm_george` | British Male |
| `bm_lewis` | British Male |

## Qwen3-Custom Voices

Available voices for the `qwen3-custom` engine (with `--instruct` support):

- `Vivian`, `Serena`, `Dylan`, `Uncle_Fu`, and more

Example with emotion:
```bash
uv run python src/tts_record.py input.txt --engine qwen3-custom \
  --voice Vivian --instruct "Speaking cheerfully and warmly"
```

## Phoneme-Rich Scripts

The `scripts/` folder contains 4 carefully crafted texts optimized for voice cloning:

| Script | Duration | Coverage |
|--------|----------|----------|
| `core-clarity-90s.txt` | ~90s | All 24 consonants + 16 vowels |
| `balanced-range-120s.txt` | ~120s | + diphthongs and clusters |
| `extended-coverage-150s.txt` | ~150s | + positional coverage |
| `full-spectrum-180s.txt` | ~180s | Complete phoneme coverage |

## License

MIT
