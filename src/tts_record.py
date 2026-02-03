#!/usr/bin/env python3
"""
Convert a text file to speech using Kokoro or Qwen3 TTS, producing a WAV audio output.

Example:
  uv run python src/tts_record.py input.txt -o output.wav
  uv run python src/tts_record.py input.txt --voice af_sky --speed 0.9
  uv run python src/tts_record.py input.txt --engine qwen3-clone
  uv run python src/tts_record.py input.txt --engine qwen3-clone --ref-audio my_voice.wav
  uv run python src/tts_record.py input.txt --engine qwen3-custom --voice Vivian --instruct "Very happy"

For markdown files, preprocess with md2text.py first:
  uv run python src/md2text.py blog.md -o clean.txt && uv run python src/tts_record.py clean.txt
"""

from __future__ import annotations

import argparse
from datetime import date
from pathlib import Path

import numpy as np
import soundfile as sf

from mlx_audio.tts.utils import load_model

# Project root directory for resolving relative paths (reference files, etc.)
SCRIPT_DIR = Path(__file__).parent.resolve()
PROJECT_ROOT = SCRIPT_DIR.parent

# Engine-specific defaults
ENGINE_DEFAULTS = {
    "kokoro": {
        "model": "mlx-community/Kokoro-82M-bf16",
        "voice": "af_heart",
    },
    "qwen3-clone": {
        "model": "mlx-community/Qwen3-TTS-12Hz-0.6B-Base-bf16",
        "voice": "af_heart",  # Default to Kokoro-generated example
    },
    "qwen3-custom": {
        "model": "mlx-community/Qwen3-TTS-12Hz-1.7B-CustomVoice-bf16",
        "voice": "Vivian",
    },
}

# Voice aliases for Qwen3 voice cloning (paths relative to project root)
VOICE_ALIASES = {
    "af_heart": {
        "ref_audio": PROJECT_ROOT / "reference/af_heart-core-clarity-90s.wav",
        "ref_text": PROJECT_ROOT / "reference/af_heart-core-clarity-90s.txt",
    },
}


def generate_output_path(input_file: str, model: str) -> str:
    """Generate default output path beside the input file: {input_dir}/{date}-{stem}-{model}.wav"""
    input_path = Path(input_file).resolve()
    input_dir = input_path.parent
    input_stem = input_path.stem
    model_name = model.split("/")[-1].lower()
    today = date.today().isoformat()
    return str(input_dir / f"{today}-{input_stem}-{model_name}.wav")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Convert a text file to speech using Kokoro or Qwen3 TTS."
    )
    parser.add_argument(
        "input_file",
        help="Path to the input text file.",
    )
    parser.add_argument(
        "-o", "--out",
        default=None,
        help="Output WAV file path (default: {input_dir}/{date}-{inputfile}-{model}.wav).",
    )
    parser.add_argument(
        "--engine",
        choices=["kokoro", "qwen3-clone", "qwen3-custom"],
        default="kokoro",
        help="TTS engine: kokoro, qwen3-clone (voice cloning), qwen3-custom (predefined speakers with instruct).",
    )
    parser.add_argument(
        "--voice",
        default=None,
        help="Voice name (default: af_heart for kokoro/qwen3-clone, Vivian for qwen3-custom).",
    )
    parser.add_argument(
        "--speed",
        type=float,
        default=1.0,
        help="Speech speed multiplier (default: 1.0).",
    )
    parser.add_argument(
        "--sample-rate",
        type=int,
        default=24000,
        help="Output sample rate in Hz (default: 24000).",
    )
    parser.add_argument(
        "--language",
        default="English",
        help="Language for qwen3-clone/qwen3-custom (default: English).",
    )
    parser.add_argument(
        "--ref-audio",
        default=None,
        help="Override reference audio path for qwen3-clone.",
    )
    parser.add_argument(
        "--ref-text",
        default=None,
        help="Reference transcript for qwen3-clone: inline text or path to .txt file.",
    )
    parser.add_argument(
        "--instruct",
        default=None,
        help="Emotion/style instruction for qwen3-clone/qwen3-custom (e.g., 'Very happy and excited.').",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    # Read the input text file
    with open(args.input_file, "r", encoding="utf-8") as f:
        text = f.read().strip()

    if not text:
        raise SystemExit("Input file is empty.")

    # Get engine defaults
    engine_config = ENGINE_DEFAULTS[args.engine]
    model_name = engine_config["model"]
    voice = args.voice or engine_config["voice"]

    # Generate output path if not provided
    output_path = args.out or generate_output_path(args.input_file, model_name)

    print(f"Loading model: {model_name}")
    model = load_model(model_name)

    if args.engine == "kokoro":
        print(f"Generating speech with voice '{voice}' at speed {args.speed}...")
        chunks = list(model.generate(text=text, voice=voice, speed=args.speed))
    elif args.engine == "qwen3-clone":
        # Voice cloning with reference audio/text
        alias = VOICE_ALIASES.get(voice, VOICE_ALIASES["af_heart"])
        ref_audio = args.ref_audio or str(alias["ref_audio"])
        if not Path(ref_audio).is_file():
            raise SystemExit(f"Reference audio file not found: {ref_audio}")
        ref_text_value = args.ref_text or alias["ref_text"]
        # Support both file paths and inline text
        # Treat as file path if it ends with .txt or contains path separators
        ref_text_str = str(ref_text_value)
        looks_like_path = ref_text_str.endswith(".txt") or "/" in ref_text_str or "\\" in ref_text_str
        ref_text_path = Path(ref_text_value)
        if ref_text_path.is_file():
            ref_text = ref_text_path.read_text().strip()
        elif looks_like_path:
            raise SystemExit(f"Reference text file not found: {ref_text_value}")
        else:
            ref_text = ref_text_str.strip()
        instruct = args.instruct or ""

        print(f"Generating speech with Qwen3 (voice: {voice}, language: {args.language})...")
        print(f"  Reference audio: {ref_audio}")
        if instruct:
            print(f"  Instruct: {instruct}")
        chunks = list(model.generate(
            text=text,
            ref_audio=ref_audio,
            ref_text=ref_text,
            language=args.language,
            instruct=instruct,
        ))
    else:  # qwen3-custom
        # Predefined speakers with instruct for emotion/style
        instruct = args.instruct or ""
        print(f"Generating speech with Qwen3 CustomVoice (speaker: {voice}, language: {args.language})...")
        if instruct:
            print(f"  Instruct: {instruct}")
        chunks = list(model.generate_custom_voice(
            text=text,
            speaker=voice,
            language=args.language,
            instruct=instruct,
        ))

    if not chunks:
        raise SystemExit("No audio was generated.")

    audio = np.concatenate(
        [np.asarray(c.audio, dtype=np.float32) for c in chunks], axis=0
    )

    sf.write(output_path, audio, samplerate=args.sample_rate)
    print(f"Wrote {output_path} ({args.sample_rate} Hz, {len(audio) / args.sample_rate:.2f}s)")


if __name__ == "__main__":
    main()
