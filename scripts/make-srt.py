#!/usr/bin/env python3
"""make-srt.py — build a Hinglish .srt from scenes.json + clip durations.

Each scene's narration WAV already determines its on-screen duration, and the
merge step crossfades clips, so subtitle timings must match the *merged* timeline,
not the sum of raw clip lengths.

Usage:
  python3 scripts/make-srt.py episodes/<slug>/scenes.json .temp/<slug> <xfade> <out.srt>

Reads:   <work>/clips/NN.mp4   (for durations)
Writes:  <out.srt>

Subtitle text comes from "sub" (Hinglish, Latin script) falling back to "text"
with newlines collapsed. Scenes without either are skipped, but their time is kept.
"""

import json
import subprocess
import sys


def duration(path: str) -> float:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "csv=p=0", path],
        capture_output=True, text=True, check=True,
    ).stdout.strip()
    return float(out)


def ts(seconds: float) -> str:
    if seconds < 0:
        seconds = 0
    ms = int(round(seconds * 1000))
    h, ms = divmod(ms, 3_600_000)
    m, ms = divmod(ms, 60_000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def main() -> int:
    if len(sys.argv) < 5:
        print(__doc__)
        return 1
    scenes_path, work, xfade_s, out_path = sys.argv[1:5]
    xfade = float(xfade_s)

    scenes = json.load(open(scenes_path, encoding="utf-8"))
    lines, t, idx = [], 0.0, 0

    for n, scene in enumerate(scenes, start=1):
        clip = f"{work}/clips/{n:02d}.mp4"
        try:
            dur = duration(clip)
        except Exception:
            continue  # clip not rendered yet; leave a gap rather than lie

        text = (scene.get("sub") or scene.get("text") or "").strip()
        text = " ".join(text.split())
        # clip ends with a small tail; stop the caption slightly before the cut
        end = t + max(0.8, dur - xfade - 0.05)
        if text:
            idx += 1
            lines.append(f"{idx}\n{ts(t)} --> {ts(end)}\n{text}\n")
        t += dur - xfade

    with open(out_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    print(f"✓ {out_path} ({idx} captions, {ts(t)} total)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
