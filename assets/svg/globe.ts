// globe.ts — a real, accurate Earth as SVG path data.
//
// The point of this file: every later asset (continents, oceans, atmosphere,
// city lights, rotation arrows) is drawn *on top of a real projection*, so the
// geography is never approximate. We use Natural Earth 1 at 110m resolution —
// 177 countries, ~90 KB of topojson — projected once at module load.
//
// Output is plain SVG path `d` strings, so it drops into the same React "divs
// and paths" renderer the other animations use (takumi renders SVG inline).
//
//   import { LAND, COUNTRY_PATHS, project } from "../svg/globe";
//
// Coordinate space is 1600x900 (16:9), globe centred, fitted with 40px margin.

import { geoNaturalEarth1, geoPath, geoGraticule10, geoOrthographic, geoDistance } from "d3-geo";
import { featureCollection, type Topology } from "./topo.ts";
import world from "./data/world-110m.json" with { type: "json" };

export const W = 1600;
export const H = 900;
const MARGIN = 40;

const topo = world as unknown as Topology;

export const LAND = featureCollection(topo, topo.objects.land);
export const COUNTRIES = featureCollection(topo, topo.objects.countries);

// fitted equirectangular-ish projection (Natural Earth 1)
const projection = geoNaturalEarth1().fitExtent(
  [[MARGIN, MARGIN], [W - MARGIN, H - MARGIN]],
  { type: "Sphere" } as any,
);

const path = geoPath(projection);

/** The whole planet outline as one path. */
export const SPHERE: string = path({ type: "Sphere" } as any) ?? "";

/** Every landmass, merged. Use for a flat silhouette. */
export const LAND_PATH: string = path(LAND) ?? "";

/** One path per country — lets a scene light countries up individually. */
export const COUNTRY_PATHS: string[] = (COUNTRIES as any).features
  .map((f: any) => path(f))
  .filter((d: string | null): d is string => !!d);

/** Latitude/longitude grid — the "spin lines" a globe is drawn with. */
export const GRATICULE: string = path(geoGraticule10()) ?? "";

/** Project a lon/lat to screen x/y (for arrows, labels, impact markers). */
export function project(lon: number, lat: number): [number, number] {
  const p = projection([lon, lat]);
  return p ? [p[0], p[1]] : [0, 0];
}

/** A true globe (orthographic) — for the "seen from space" beat. */
export function globeAt(rotateLon: number) {
  const ortho = geoOrthographic()
    .rotate([rotateLon, -15])
    .fitExtent([[MARGIN, MARGIN], [W - MARGIN, H - MARGIN]], { type: "Sphere" } as any);
  // d3-geo does NOT clip line strings to the horizon — it only skips a whole
  // line if its centroid is back-facing, so meridians leak past the limb as
  // straight chords. Worse, orthographic *folds* back-facing points into the
  // visible disc (120° out still projects inside the limb), so a screen-space
  // distance test can't detect them. Test the angular distance from the centre
  // of the globe in lon/lat space instead.
  const centre = ortho([rotateLon, -15]) ?? [0, 0];
  // The centre of the projected disc is translate() — NOT project([rotateLon,-15]).
  // `project` centres on latitude 0 and the -15° tilt shifts the centre point down,
  // which made every latitude ring look "off the limb" (a constant vertical offset
  // of 205px showed up as 277 false positives).
  const [cx, cy] = ortho.translate();
  const radius = ortho.scale();
  const onGlobe = (lon: number, lat: number) =>
    geoDistance([lon, lat], [rotateLon, -15]) <= Math.PI / 2 - 0.01;

  const graticulePaths: string[] = [];
  for (const line of geoGraticule10().coordinates) {
    let current: string[] = [];
    for (const pt of line) {
      const [lon, lat] = pt as [number, number];
      if (onGlobe(lon, lat)) {
        const q = ortho([lon, lat]) as [number, number];
        current.push(`${current.length ? "L" : "M"}${q[0].toFixed(1)},${q[1].toFixed(1)}`);
      } else if (current.length > 1) {
        graticulePaths.push(current.join(""));
        current = [];
      } else {
        current = [];
      }
    }
    if (current.length > 1) graticulePaths.push(current.join(""));
  }

  const p = geoPath(ortho);
  return {
    sphere: p({ type: "Sphere" } as any) ?? "",
    land: p(LAND) ?? "",
    graticule: graticulePaths.join(""),
    centre: [cx, cy] as [number, number],
    radius,
    /** is this lon/lat on the visible hemisphere right now? */
    visible: (lon: number, lat: number) => onGlobe(lon, lat),
    project: (lon: number, lat: number): [number, number] => {
      const q = ortho([lon, lat]);
      return q ? [q[0], q[1]] : [0, 0];
    },
  };
}

export const CITIES = {
  delhi: { lon: 77.2, lat: 28.6, name: "Delhi" },
  newYork: { lon: -74.0, lat: 40.7, name: "New York" },
  london: { lon: -0.1, lat: 51.5, name: "London" },
  nairobi: { lon: 36.8, lat: -1.3, name: "Nairobi" },
  tokyo: { lon: 139.7, lat: 35.7, name: "Tokyo" },
  saoPaulo: { lon: -46.6, lat: -23.5, name: "Sao Paulo" },
  equator: { lon: 0, lat: 0, name: "Equator" },
} as const;
