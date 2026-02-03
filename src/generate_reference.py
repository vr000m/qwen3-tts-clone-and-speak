#!/usr/bin/env python3
"""
Generate a reference audio file for voice cloning using Kokoro TTS.

The generated audio uses a phonetically-rich paragraph that covers
most English phonemes, making it suitable as a voice cloning reference.

Example:
  uv run python src/generate_reference.py --voice af_heart --out reference/af_heart.wav
"""

from __future__ import annotations

import argparse

import numpy as np
import soundfile as sf

from mlx_audio.tts.utils import load_model

# Accent-friendly, low-twister reference text for voice cloning
# Covers all 24 consonants and 20 vowels/diphthongs including:
#   /ʒ/ (unusual, vision), /ɔɪ/ (enjoyed, voice), /ʊə/ (pure, sure), /eə/ (air, careful)
PHONEME_TEXT = (
    "The rain arrived early on Tuesday, and the streets in the city were calm. "
    "I walked past a quiet cafe, a small bookshop, and a yellow bus waiting at the corner. "
    "At nine fifteen, a train left the station for London, and a second train followed at "
    "nine thirty. A friend from Mumbai called later to confirm the plan for Friday. "
    "We agreed to meet near the old bridge, just after six. I said hello to Ravi, Maria, "
    "and Jean, and we talked about travel, work, and music. I enjoyed the casual atmosphere, "
    "which felt unusual in a pleasant way. "
    "Today's weather report said temperatures would stay between twelve and twenty one "
    "degrees, with light wind from the west. The forecast for the weekend mentioned "
    "scattered showers, but no storms. I was fairly sure the air would stay pure and fresh. "
    "I packed a light jacket, a notebook, and a charger. "
    "On the way home, I stopped at a market and bought rice, fruit, and coffee. The cashier "
    "asked me to repeat my phone number, so I spoke slowly: five, five, five, two, four, "
    "zero, nine, three, one, eight. "
    "In the evening, I read a short article about history and science. The author's vision "
    "showed careful attention to each point. It explained how "
    "small changes can lead to large results, especially over time. The example was simple: "
    "plant a seed, water it daily, and it grows. I like that idea because it is practical "
    "and clear. Before I went to sleep, I set the alarm for six thirty, turned off the "
    "light, and felt grateful for a quiet day."
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate reference audio for voice cloning."
    )
    parser.add_argument(
        "--model",
        default="mlx-community/Kokoro-82M-bf16",
        help="Kokoro model id (default: mlx-community/Kokoro-82M-bf16).",
    )
    parser.add_argument(
        "--voice",
        default="af_heart",
        help="Kokoro voice id (default: af_heart).",
    )
    parser.add_argument(
        "--speed",
        type=float,
        default=1.0,
        help="TTS speed multiplier (default: 1.0).",
    )
    parser.add_argument(
        "--sample-rate",
        type=int,
        default=24000,
        help="Output sample rate (default: 24000).",
    )
    parser.add_argument(
        "--text",
        default=None,
        help="Custom text to speak. If not provided, uses phoneme-rich default.",
    )
    parser.add_argument(
        "--out",
        default="reference.wav",
        help="Output WAV file path (default: reference.wav).",
    )
    parser.add_argument(
        "--print-text",
        action="store_true",
        help="Print the phoneme text and exit.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    text = args.text or PHONEME_TEXT

    if args.print_text:
        print("Phoneme-rich reference text:")
        print("-" * 40)
        print(text)
        print("-" * 40)
        return

    print(f"Generating reference audio with voice '{args.voice}'...")
    print(f"Text: {text[:80]}...")

    model = load_model(args.model)
    chunk_list = list(model.generate(text=text, voice=args.voice, speed=args.speed))

    if not chunk_list:
        raise SystemExit("No audio was generated.")

    audio = np.concatenate(
        [np.asarray(c.audio, dtype=np.float32) for c in chunk_list], axis=0
    )

    sf.write(args.out, audio, samplerate=args.sample_rate)
    print(f"Wrote {args.out} ({args.sample_rate} Hz)")
    print()
    print("Reference text (save this for --ref-text):")
    print("-" * 40)
    print(text)
    print("-" * 40)


if __name__ == "__main__":
    main()
