// Night look for "If the Moon Drifted Away". Same field names as the bridge's lights.ts so
// world.ts can consume it unchanged; the values are a moonlit night: cool key from the moon,
// violet shadows, deep navy sky, a bright moon disc that blooms.
type C3 = [number, number, number];
export type LightPreset = {
  az: number; el: number;
  lit: C3; shade: C3; lift: C3; lambert: number; sideK: number; term: number;
  charTint: C3; charShade: number; charGrad: number; bodyGrad: number; sideTint: C3;
  blob: C3; actorShadow: boolean;
  top: string; hor: string; skyCurve: C3; fog: string; fogNear: number; fogFar: number; sunDisc: string;
  sunCol: string; sunI: number; sky: string; ground: string; hemiI: number;
  bias: number; normalBias: number;
};
export type WorldLook = {
  sky: { c: string[]; e: number[] };
  water: { near: string; mid: string; far: string; crest: string; trough: string; glint: string; shade: C3 };
  bounce: C3;
  sat: number;
  cloud: { lit: string; mid: string; shade: string };
};

/** one preset: the moon is the key light, frozen per shot like the bridge sun */
export const NIGHT: LightPreset = {
  az: 18, el: 26,
  lit: [1.05, 1.12, 1.42], shade: [0.16, 0.17, 0.3], lift: [0.03, 0.04, 0.1], lambert: 0.35, sideK: 0.8, term: 0.16,
  charTint: [0.78, 0.84, 1.0], charShade: 0.9, charGrad: 0.1, bodyGrad: 0.24, sideTint: [0.82, 0.84, 1.0],
  blob: [0.5, 0.55, 0.78], actorShadow: true,
  top: "#0b1330", hor: "#28406e", skyCurve: [0.0, 0.45, 0.7], fog: "#28406e", fogNear: 30, fogFar: 320, sunDisc: "#f4f0e2",
  sunCol: "#cfe0ff", sunI: 3.0, sky: "#3a4f86", ground: "#1b2438", hemiI: 0.5,
  bias: -0.0005, normalBias: 0.025,
};

export const LOOK: WorldLook = {
  // measured night sky: near-black navy at the zenith, cold slate at the horizon
  sky: { c: ["#28406e", "#1e3260", "#16264d", "#101c3c", "#0a1129"], e: [0, 4, 10, 22, 50] },
  water: { near: "#16324f", mid: "#112a4c", far: "#2a4068", crest: "#8fb2d8", trough: "#0a1a33", glint: "#e9f1ff", shade: [0.42, 0.5, 0.72] },
  cloud: { lit: "#dfe7f6", mid: "#9aa8c8", shade: "#55648c" },
  bounce: [0, 0, 0],
  sat: 1.0,
};
