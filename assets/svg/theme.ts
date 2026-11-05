// theme.ts — one visual system for the whole episode.
//
// The explainer skill's rule: lock type scale, colour grammar and easing BEFORE
// scene 2. Colour means one thing and is never reassigned mid-video.
//
//   space    deep background, always behind everything
//   land     continents in every wide shot
//   water    oceans, atmosphere, anything fluid
//   heat     danger, speed, friction, the thing going wrong
//   calm     safety, the fix, the thing that is fine
//   ink      text and lines
//   dim      secondary structure (grids, shadows, scale)

export const C = {
  space: "#080d18",
  spaceMid: "#0e1728",
  land: "#2f6b4f",
  landDark: "#1d4634",
  landLit: "#4a9c74",
  water: "#1b3a63",
  waterLit: "#2f6fa8",
  heat: "#ff5a3c",
  heatDim: "#8a2f20",
  calm: "#5fd0a0",
  ink: "#f2f5fa",
  dim: "#3a4a63",
  dimMore: "#22304a",
} as const;

// Type scale (px at 1600x900). Scene templates handle the big type; these are
// for labels inside diagrams so everything lines up.
export const T = {
  label: 22,
  caption: 26,
  body: 30,
  subhead: 40,
  head: 64,
  hero: 104,
} as const;

// One easing curve everywhere. Scene content should only ever use these.
export const ease = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** 0 before `from`, ramps to 1 by `to` (linear clock, eased where used). */
export const win = (t: number, from: number, to: number) => clamp01((t - from) / (to - from));
