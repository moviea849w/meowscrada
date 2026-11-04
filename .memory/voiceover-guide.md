# Voiceover Guide

Rules for voiceover in short videos.

## Language
- **Hindi voiceover**, spoken in natural everyday Hindi.
- **On-screen text is English only** (no Devanagari anywhere on screen).
- **No technical words or English technical terms in the Hindi audio.**
  - Say it the simple Hindi way a normal person would speak.
  - Avoid jargon like: "plus", "minus", "option", "timer", "video", "subscribe", "like", "share", "comment", "equation", "answer" (as an English word).
  - Use plain Hindi instead: जोड़, घटाना, जवाब, विकल्प, समय, गिनती, etc.
- Keep sentences short and clear, easy to follow.

## On-screen text
- **English only — no Devanagari on screen.** All titles, options, labels and reveals are in English.
- Use DejaVu Sans Bold (`/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf`).
- Keep on-screen text short: 3–6 words.
- Hindi exists **only in the voiceover**, never as text on screen.

## Numbers
- **Numbers are spoken in English** (e.g. "12", "15", "27") — mixed into the Hindi sentence naturally.
- Do not read symbols out loud ("+", "=") — say "जोड़" and "कितना होता है" / "जवाब है".
- Hindi number words are NOT required; plain English digits are preferred.

## Tone
- Friendly, curious, like a teacher or friend.
- Slight pause after the question to give thinking time.
- Reveal the answer clearly and warmly.

## Technical setup (for reference)
- TTS: `scripts/tts -l hi "..."` (Piper, voice `hi_IN-pratham-medium`)
- Audio mixed with ffmpeg in `scripts/math-short.sh`
- Question voice starts at 0.3s; answer voice starts 1s after the timer ends
- Font: `/usr/share/fonts/truetype/noto/NotoSansDevanagari-Bold.ttf`
