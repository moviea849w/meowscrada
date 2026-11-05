// topo.ts — minimal TopoJSON decoder (arc delta-encoding + feature assembly).
//
// Replaces `topojson-client` with ~40 lines so the repo owns the dependency:
// the map data is committed (assets/svg/data/world-110m.json, Natural Earth
// 110m, public domain) and only needs decoding, never re-encoding.

export type Topology = {
  type: "Topology";
  transform?: { scale: [number, number]; translate: [number, number] };
  objects: Record<string, any>;
  arcs: number[][][];
};

export type Feature = {
  type: "Feature";
  id?: string | number;
  properties: Record<string, unknown>;
  geometry: { type: string; coordinates?: any; geometries?: any[] };
};

/** Arc index -> absolute lon/lat ring (handles quantised topologies). */
function decodeArc(topo: Topology, index: number): [number, number][] {
  const reverse = index < 0;
  const arc = topo.arcs[reverse ? ~index : index];
  let x = 0;
  let y = 0;
  const out: [number, number][] = [];
  for (const [dx, dy] of arc as number[][]) {
    x += dx;
    y += dy;
    out.push([x, y]);
  }
  // quantised topologies store integer deltas + scale/translate; already-decoded
  // ones store lon/lat directly
  const t = topo.transform;
  const pts = t && !(topo as any).decoded
    ? out.map(([px, py]): [number, number] => [px * t.scale[0] + t.translate[0], py * t.scale[1] + t.translate[1]])
    : out;
  return reverse ? pts.reverse() : pts;
}

/** Join a list of arc indices into one ring/line. */
function decodeLine(topo: Topology, arcIndexes: number[]): [number, number][] {
  const out: [number, number][] = [];
  for (const i of arcIndexes) {
    const seg = decodeArc(topo, i);
    // drop the duplicated first point where arcs meet
    out.push(...(out.length ? seg.slice(1) : seg));
  }
  return out;
}

/** Turn a Topology object (e.g. `objects.land`) into a GeoJSON FeatureCollection. */
export function featureCollection(topo: Topology, object: any): { type: "FeatureCollection"; features: Feature[] } {
  const geometries: any[] = object.type === "GeometryCollection" ? object.geometries : [object];
  const features = geometries.map((g, idx) => {
    let geometry: any;
    if (g.type === "Polygon") {
      geometry = { type: "Polygon", coordinates: g.arcs.map((ring: number[]) => decodeLine(topo, ring)) };
    } else if (g.type === "MultiPolygon") {
      geometry = {
        type: "MultiPolygon",
        coordinates: g.arcs.map((poly: number[][]) => poly.map((ring: number[]) => decodeLine(topo, ring))),
      };
    } else if (g.type === "GeometryCollection") {
      // recursive — countries-110m has none, but keep it correct
      geometry = featureCollection(topo, g).features[0]?.geometry;
    } else {
      throw new Error(`unsupported topojson geometry: ${g.type}`);
    }
    return {
      type: "Feature" as const,
      id: g.id ?? g.properties?.name ?? idx,
      properties: g.properties ?? {},
      geometry,
    };
  });
  return { type: "FeatureCollection", features };
}
