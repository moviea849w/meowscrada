# Concept — open question

**Status: under revision.** Episode 1 was built and rendered, but the user judged the
concept "not good". Do not start Episode 2 until the direction is settled.

## What we tried

*Curiosity-based educational explainer* — "Why Was Being a Medieval King So Dangerous?"
Long-form (16:9, 4.5 min), Hindi voiceover, English on-screen text, public-domain artwork,
hand-drawn Rough.js annotations.

## What worked (keep regardless of concept)

- **Pipeline**: `scripts/longform.sh` builds a full episode from `scenes.json`
- **Look**: dark neutral surfaces + one gold accent, artwork filling frame, no UI chrome
- **Templates**: 5 scene layouts rotated so nothing repeats back-to-back
- **Assets**: license-clean library, all committed with credits
- **Thumbnails**: readable at 320px, one accent word

## What's in doubt

- The **topic angle** — history explainer is a crowded niche with high production bars
- **4.5 min** felt short against the 5–8 min target
- The **voice** (Piper Hindi) is flat and may be dragging down perceived quality
- Possibly the format itself (slideshow-of-paintings) rather than the topic

## Open questions for next session

1. Is the problem the **topic**, the **format**, or the **voice**?
2. Do we keep long-form, or go all-in on shorts?
3. Is there a niche the brother actually has an edge in?

## Decisions to revisit

- Niche (was: history/curiosity explainers)
- Voice (Piper vs cloud TTS)
- Episode length target
