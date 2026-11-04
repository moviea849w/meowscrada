---
name: remotion
description: Use Remotion for code-driven YouTube videos - React components to video, programmatic rendering, studio preview and batch export.
---

# Remotion Skill

Use Remotion to create YouTube videos with React/TypeScript, rendered via ffmpeg.

## Setup (when user asks)
- `npm create video` or manual: `npm i remotion @remotion/cli react react-dom`
- Entry: `src/index.ts` registers compositions via `registerRoot`
- Studio: `npx remotion studio`
- Render: `npx remotion render src/index.ts MyComp out/video.mp4`

## Component patterns
- Use `<Composition component={MyComp} durationInFrames={300} fps={30} width={1920} height={1080} />`
- Animate with `useCurrentFrame()`, `interpolate()`, `<spring()>`
- Sequence / Series for scene timing

## YouTube workflow
1. Script scenes as React components in `src/`
2. Preview in Studio, render to MP4
3. Post-process with ffmpeg skill if needed (faststart, thumbnails, captions)
4. Log render in .memory/done.md, ticket in .memory/tickets/

NOTE: This is skill-definition only. Do not install remotion packages unless user explicitly requests package installation.
