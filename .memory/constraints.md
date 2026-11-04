# Constraints

Hard limits of the current setup. Check this before proposing anything ambitious.

## The machine

| | |
|---|---|
| Environment | GitHub Codespaces (free tier) |
| CPU | **2 cores** |
| RAM | **7 GB** |
| GPU | **none, and no working GPU process** |
| Display | none (headless; Xvfb does not help) |
| Budget | 120 core-hours/month ≈ **60 real hours ≈ 2 h/day** |
| User access | **SSH from Termux on a phone** — no local machine, laptop broken (4-day repair) |

## What this rules out

| Approach | Why it fails |
|---|---|
| **Remotion** (three.js) | Chrome's GPU process cannot start in this container; software GL and Xvfb both fail |
| **Obscura + three.js** | Obscura disables WebGL *by design* (anti-fingerprinting) — `getContext('webgl')` returns null |
| **headless-gl CPU 3D** | Builds, but ~10–40 s/frame → **5–12 hours** per 62 s short |
| **Cloud GPU render** | Cost; not set up |

## What works

| Approach | Speed | Notes |
|---|---|---|
| **Takumi → PNG → ffmpeg** | 4.5 min episode in ~12 min | proven, the main pipeline |
| **Rough.js doodles** (node-canvas) | instant | proven |
| **Piper TTS** | RTF ~0.95 | works, but the Hindi voice is flat |
| **Wikimedia / Openverse fetch** | seconds | proven |

## Rules that follow

1. **Anything that renders must finish in minutes, not hours.** The user has 2 h/day.
2. **No browser-based rendering.** No Chrome, no Puppeteer, no Remotion, no WebGL.
3. **Prefer Node-native rasterizers** — Takumi and node-canvas both work without a GPU.
4. **Idle time still bills.** Stop the Codespace when not working; the 30-minute idle
   timeout will kill long renders.
5. **The 3D cartoon shorts need a working machine.** Keep the skill, park the project.

## If a machine comes back

1. Copy `/workspaces/remotion-studio` to it, `npm install`, `npx remotion browser ensure`.
2. Test: `npx remotion render src/Root.tsx BridgeShort out/test.mp4 --frames=0-29`
3. Then `shorts/001-anc-headphones/SCRIPT.md` is ready to build.
