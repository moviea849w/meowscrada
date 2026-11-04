# Cartoon 3D Shorts Guide

**Skill:** `.opencode/skills/cartoon-3d-short/` (from [mromidev/claude-animated-shorts](https://github.com/mromidev/claude-animated-shorts), MIT)

55–70 s vertical shorts: 2D cartoon characters in a 3D painted world, ink outlines,
gliding cameras, synthesized SFX + music. Rendered with three.js inside Remotion.

> ⚠️ **Cannot render in this Codespace.** Chrome's GPU process fails in every mode
> (see `failures.md`). Authoring works here; rendering must happen elsewhere.
>
> **Decision (2026-11-04): 3D is out of scope.** The only machine available is this
> Codespace (the user's laptop is broken, working over SSH from Termux). CPU 3D would
> take 5–12 hours per short. All video work is **2D via Takumi + ffmpeg** until a
> capable machine exists. This skill is kept for later.

## Where things live

| What | Where |
|---|---|
| Skill (pipeline, rules, style bible, reference frames) | `.opencode/skills/cartoon-3d-short/` |
| Remotion project | **`/workspaces/remotion-studio`** (sibling, not in this repo) |
| Shorts in progress | `/workspaces/remotion-studio/shorts/<slug>/` |

The Remotion project is a sibling folder because it needs **React 19** while this repo
pins **React 18** for Takumi. Never merge them into one `package.json`.

## The script formula (from SKILL.md)

~3.7 words/s, 55–70 s. Eight beats:

1. **Hook** — the absurd fact in one line
2. **Setting** — year/place/pride
3. **Action** — escalation over 3–4 beats
4. **Snap** — the moment it breaks
5. **Deadpan double** — "Luckily … / Unluckily …"
6. **Explanation** — one idea through an everyday analogy
7. **Consequence** — the rule it created
8. **Callback twist** — the ending

Rules: no captions or labels on screen, English only, one steady voice tone,
jokes must be researched real facts.

## Getting it running on a machine that can render

```bash
# 1. copy the project out of Codespaces
scp -r /workspaces/remotion-studio you@machine:~/remotion-studio

# 2. install (React 19 — do not mix with the Takumi repo)
cd ~/remotion-studio && npm install

# 3. browser
npx remotion browser ensure

# 4. check it renders
npx remotion render src/Root.tsx BridgeShort out/test.mp4 --frames=0-29

# 5. stills for the look pass (fast, iterate here)
node scripts/bridge-stills.mjs out/name/x_ 100,400 0.5
```

Final render: `--codec h264 --crf 16 --scale 1.3333` (2K vertical, 1440x2560).

## Shorts made

| # | Topic | Status |
|---|---|---|
| 001 | How noise-cancelling headphones work | script written, not rendered |
