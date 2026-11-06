// Timeline for "If the Moon Drifted Away" (episode 005, cartoon-3d-short).
// 9 shots, 30 fps. Camera grammar from the reference study: no hard cuts except on big jumps,
// 6-8 f crossfades on place changes, every hold creeps (0.15-0.35 %/f), low lens heights, 4-5 deg rolls.
import * as THREE from "three";
import type { SeaState } from "./world";

export const FPS = 30;
export type V3 = [number, number, number];
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };

/** word times from words.json (voice), used so every visual reaction lands 0-3 f before its word */
export const WORDS: Record<string, number> = {
  hook: 0.0, leaving: 1.6, notTonight: 2.9, setting: 4.4, fourCm: 6.2, fingernails: 8.6,
  action: 10.6, millions: 11.4, day22: 13.0, fillMore: 14.6, snap: 16.6, notAlone: 17.6, wePush: 19.2,
  luckily: 21.0, unluckily: 24.2, explanation: 27.2, skater: 28.2, armsOut: 29.4, armsIn: 31.0,
  consequence: 33.4, tugs: 35.2, higher: 37.4, whatWeLose: 40.0, tides: 41.0, tilt: 43.2, seasons: 45.4,
  callback: 47.6, fourAgain: 49.2, lifetime: 51.0, moonWill: 53.2,
};

export type ShotDef = { id: number; a: number; b: number; tau: (t: number) => number };
export const TOTAL = 1680; // 56 s
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 168, tau: (t) => t },      // hook: moon over the town, crane up
  { id: 2, a: 168, b: 336, tau: (t) => t },    // setting: hand + fingernail scale gag
  { id: 3, a: 336, b: 546, tau: (t) => t },    // action: the moon pulls back, sky darkens
  { id: 4, a: 546, b: 714, tau: (t) => t },    // snap: the sea bulge leads the moon
  { id: 5, a: 714, b: 882, tau: (t) => t },    // double: the skater
  { id: 6, a: 882, b: 1050, tau: (t) => t },   // explanation: the tug, a rope of light
  { id: 7, a: 1050, b: 1218, tau: (t) => t },  // consequence: the tide comes in, goes out
  { id: 8, a: 1218, b: 1386, tau: (t) => t },  // what we lose: tilted Earth, wobble
  { id: 9, a: 1386, b: TOTAL, tau: (t) => t }, // callback: back to the hook shot, moon a hair further
];
export const XFADE: Record<number, number> = { 2: 8, 4: 8, 5: 8, 6: 8, 7: 8, 8: 8, 9: 8 };
export const FLASH_AT = 60;

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

// ---------------- moon path ----------------
/** moon distance from Earth in "screen metres": starts close, drifts away over the short */
export const moonDist = (t: number) => 1 + 0.16 * smooth((t - 6) / 18) + 0.06 * smooth((t - 30) / 20);
/** moon angle in the sky (degrees above the horizon): rises through the short */
export const moonEl = (t: number) => 14 + 22 * smooth(t / 52);
export const moonAz = (t: number) => 18 + 10 * smooth(t / 40);
/** moon world position for a shot, placed relative to the camera's look point so it always reads in frame */
export const moonAt = (cam: { pos: V3; look: V3 }, t: number): V3 => {
  const d = moonDist(t) * 90;
  const el = THREE.MathUtils.degToRad(moonEl(t)), az = THREE.MathUtils.degToRad(moonAz(t));
  return [cam.look[0] + Math.sin(az) * Math.cos(el) * d, cam.look[1] + Math.sin(el) * d, cam.look[2] - Math.cos(az) * Math.cos(el) * d];
};

// ---------------- sea ----------------
/** tide: rises on "tugs", falls on "higher" (shot 7); moonRef pulls the bulge toward the moon (shot 4) */
export const seaState = (id: number, t: number): SeaState => {
  const u = clamp01((t - 35) / 7);
  return { level: 0.0 + 0.55 * Math.sin(u * Math.PI), rise: 0.35 * smooth(u), moonRef: id === 4 ? smooth((t - 17) / 5) : 0 };
};

// ---------------- cameras ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Key = { f: number; dur?: number; cut?: boolean; s: (f: number) => Cam };
const mixCam = (a: Cam, b: Cam, k: number): Cam => ({
  pos: a.pos.map((v, i) => v + (b.pos[i] - v) * k) as V3, look: a.look.map((v, i) => v + (b.look[i] - v) * k) as V3,
  fov: a.fov + (b.fov - a.fov) * k, roll: a.roll + (b.roll - a.roll) * k,
});
const full = (c: Partial<Cam> & { pos: V3; look: V3 }): Cam => ({ fov: 40, roll: 0, ...c });
/** push-in factor since f0 (the reference's creep: 0.15-0.35 %/f, punches on key words) */
const pushK = (f: number, f0: number, rate: number, punch = 0, n = 30) => {
  const x = Math.max(0, f - f0);
  let s = rate * x;
  if (punch > rate) for (let i = 0; i < Math.min(x, n); i++) s += (punch - rate) * Math.max(0, Math.min(1, (i + 0.5) / 8, (n - i - 0.5) / 8));
  return Math.exp(-s);
};
const dolly = (pos: V3, look: V3, k: number, rest: Partial<Cam> = {}): Cam =>
  ({ pos: [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k], look, fov: 40, roll: 0, ...rest });

const CAMS: Record<number, Key[]> = {
  // hook: low over the street, the moon big above the roofs; crane up and push as it is named
  ][1]: [] as Key[],
};
CAMS[1] = [
  { f: 0, s: (f) => dolly([0.4, 2.2, 13.5], [0, 9.5, -6], pushK(f, 0, 0.0022), { fov: 44, roll: -0.03 }) },
  { f: 40, dur: 40, s: (f) => dolly([0.0, 3.4, 12.0], [0, 11.0, -10], pushK(f, 40, 0.0018, 0.005, 26), { fov: 42, roll: 0.02 }) },
];
// setting: the hand held up, the moon behind it at the same apparent size (scale gag)
CAMS[2] = [{ f: 168, s: (f) => dolly([1.6, 1.55, 6.2], [0, 1.5, 3.2], pushK(f, 168, 0.0026), { fov: 38, roll: 0.035 }) }];
// action: the moon pulls back over the town; the sky darkens with it
CAMS[3] = [
  { f: 336, s: (f) => dolly([-2.2, 2.0, 12.5], [0, 10.0, -20], pushK(f, 336, 0.0016), { fov: 46, roll: -0.04 }) },
  { f: 430, dur: 32, s: (f) => dolly([-1.2, 2.4, 11.5], [0, 10.5, -26], pushK(f, 430, 0.0014, 0.004, 24), { fov: 44, roll: 0.03 }) },
];
// snap: the sea at night, the bulge of water leading the moon
CAMS[4] = [{ f: 546, s: (f) => dolly([0.6, 1.1, 9.5], [0, 1.0, -14], pushK(f, 546, 0.0022), { fov: 42, roll: -0.035 }) }];
// double: the skater on the frozen pond, wide then closer on the arms
CAMS[5] = [
  { f: 714, s: (f) => dolly([1.8, 1.7, 8.0], [0, 1.1, 0], pushK(f, 714, 0.0018), { fov: 40 }) },
  { f: 800, dur: 30, s: (f) => dolly([1.1, 1.45, 5.4], [0, 1.15, 0], pushK(f, 800, 0.0022, 0.005, 26), { fov: 36, roll: 0.04 }) },
];
// explanation: the bulge drags, a rope of light pulls the moon higher
CAMS[6] = [{ f: 882, s: (f) => dolly([0.4, 1.3, 10.0], [0, 2.2, -12], pushK(f, 882, 0.0020), { fov: 42, roll: 0.03 }) }];
// consequence: the tide comes in, then goes out
CAMS[7] = [{ f: 1050, s: (f) => dolly([2.4, 1.5, 8.6], [-1.5, 0.9, -6], pushK(f, 1050, 0.0022, 0.004, 28), { fov: 42, roll: -0.04 }) }];
// what we lose: the tilted Earth wobbling, seasons slipping
CAMS[8] = [{ f: 1218, s: (f) => dolly([0.0, 2.6, 11.0], [0, 3.2, -2], pushK(f, 1218, 0.0018), { fov: 40 }) }];
// callback: back to the hook framing, the moon a hair further away
CAMS[9] = [{ f: 1386, s: (f) => dolly([0.4, 2.2, 13.5], [0, 9.5, -6], pushK(f, 1386, 0.0016), { fov: 44, roll: 0.03 }) }];

export const camAt = (id: number, f: number): Cam => {
  const keys = CAMS[id];
  let cur = full(keys[0].s(f));
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (f < k.f) break;
    cur = k.cut ? full(k.s(f)) : mixCam(cur, full(k.s(f)), glide((f - k.f) / (k.dur ?? 24)));
  }
  return cur;
};

// ---------------- depth of field ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const DOF: Dof[] = [
  { f: 0, cInf: 14 },
  { f: 168, cInf: 15, focus: (f) => [0, 1.6, 3.2] },   // the hand
  { f: 336, cInf: 0 },                                  // wide, establishing
  { f: 546, cInf: 12 },
  { f: 714, cInf: 13, focus: (f) => [0, 1.3, 0] },     // the skater
  { f: 882, cInf: 12 },
  { f: 1050, cInf: 11 },
  { f: 1218, cInf: 0 },
  { f: 1386, cInf: 14 },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};
