// render-svg-scene.tsx — adapter that turns an Earth/SVG scene into a takumi element.
//
// The SVG scenes in assets/svg/*.tsx are plain React trees (SVG elements), drawn
// in a 1600x900 space and pure functions of `t`. This wrapper puts one inside a
// full-frame <svg> that scales to whatever the pipeline asked for, so the same
// scene renders at 1080p, 720p or 480p preview without any changes.
//
//   const el = renderSvgScene("earth-spin", 0.5, { w: 1920, h: 1080 });
//   const png = await render(el, { width: 1920, height: 1080, fonts });

import type { ReactElement } from "react";
import { EARTH_SCENES } from "../svg/earth.tsx";
import { C } from "../svg/theme.ts";

const REGISTRY: Record<string, (t: number) => any> = {
  ...EARTH_SCENES,
};

export function isSvgScene(name: string | null | undefined): boolean {
  return !!name && name in REGISTRY;
}

export function svgSceneNames(): string[] {
  return Object.keys(REGISTRY);
}

export function renderSvgScene(name: string, t: number, opts: { w: number; h: number }): ReactElement {
  const draw = REGISTRY[name];
  if (!draw) throw new Error(`unknown svg scene "${name}" — have: ${svgSceneNames().join(", ")}`);
  const { w, h } = opts;
  // The scene is authored at 1600x900. Scale it to the requested frame, letterboxing
  // nothing — the aspect ratios match (both 16:9).
  return (
    <div style={{ display: "flex", width: w, height: h, background: C.space, overflow: "hidden" }}>
      <svg width={w} height={h} viewBox="0 0 1600 900" xmlns="http://www.w3.org/2000/svg">
        <rect width={1600} height={900} fill={C.space} />
        {draw(t)}
      </svg>
    </div>
  );
}
