// Minimal night-world builder for "If the Moon Drifted Away".
// Reuses the bridge's painted-texture kit (grass, stone, planks) and its two-tone shading so the
// world reads as the same painted 3D style, but builds a small seaside town at night: a cobbled
// street, cottages with warm windows, a jetty into the sea, the sea itself, and a giant moon that
// can slide away from Earth on its own path.
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { staticFile } from "remotion";
import { Batch, boxGeo, lam, Kit } from "../bridge/build";
import { grassHD, stoneHD, cobbleHD, planksHD, cloudHD } from "../bridge/paint";
import { twoTone } from "../bridge/shade";
import { LOOK } from "./lights";

export type MoonKit = Kit;

const KENNEY = ["tree_oak", "tree_default", "tree_detailed", "tree_fat", "tree_cone", "plant_bushLarge", "plant_bushDetailed",
  "plant_bush", "hedge", "flower_redA", "flower_yellowA", "grass_large", "grass", "lantern", "cart", "stall-red", "stall-bench",
  "banner-red", "canoe"];
let kitP: Promise<MoonKit> | null = null;
export const loadMoonKit = () => {
  if (!kitP) {
    const loader = new GLTFLoader();
    kitP = Promise.all(KENNEY.map((n) => loader.loadAsync(staticFile(`bridge/kenney/${n}.glb`)).then((g) => [n, g.scene] as const).catch(() => [n, null] as const)))
      .then((list) => Object.fromEntries(list.filter((e) => e[1]).map(([n, s]) => [n, s!])) as MoonKit);
  }
  return kitP;
};

const quadUp = (x0: number, x1: number, z0: number, z1: number, ux: number, uz: number, y = 0) => {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute([x0, y, z0, x1, y, z0, x1, y, z1, x0, y, z0, x1, y, z1, x0, y, z1], 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute([x0 / ux, z0 / uz, x1 / ux, z0 / uz, x1 / ux, z1 / uz, x0 / ux, z0 / uz, x1 / ux, z1 / uz, x0 / ux, z1 / uz], 2));
  return g;
};

/** sea between the jetty and the horizon; depth 0 is the camera side */
export type SeaState = { level: number; rise: number; moonRef: number };

export class MoonWorld {
  root = new THREE.Group();
  private hemi: THREE.HemisphereLight;
  private moonLight: THREE.DirectionalLight;
  private skyMat: THREE.ShaderMaterial;
  private sea: THREE.Mesh;
  private seaMat: THREE.MeshLambertMaterial;
  private moon: THREE.Group;
  private clouds: THREE.Mesh[] = [];
  private lamps: THREE.PointLight[] = [];
  private windows: THREE.MeshBasicMaterial[] = [];
  private fog = new THREE.Fog("#28406e", 30, 320);
  private v = new THREE.Vector3();

  constructor(kit: MoonKit) {
    const R = this.root, M: Record<string, THREE.Material> = {};
    // ---- sky: 5 stops by elevation, pre-inverted for the NEUTRAL tone map by untone() ----
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: { c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() },
        c3: { value: new THREE.Color() }, c4: { value: new THREE.Color() }, e: { value: new THREE.Vector4() } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 c0, c1, c2, c3, c4; uniform vec4 e; varying vec3 vP;
        void main(){ float el = asin(clamp(normalize(vP).y, -1.0, 1.0));
          vec3 c = mix(c0, c1, smoothstep(0.0, e.x, el));
          c = mix(c, c2, smoothstep(e.x, e.y, el));
          c = mix(c, c3, smoothstep(e.y, e.z, el));
          c = mix(c, c4, smoothstep(e.z, e.w, el));
          gl_FragColor = vec4(c, 1.0); }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(2600, 48, 24), this.skyMat);
    sky.renderOrder = -1; sky.frustumCulled = false;
    R.add(sky);

    // stars: a point field on the sky sphere, only above the horizon
    const sp: number[] = [];
    for (let i = 0; i < 900; i++) {
      const a = (i * 2.39996) % (Math.PI * 2), u = ((i * 0.618033) % 1) * 0.92 + 0.04;
      const el = Math.asin(u), r = 2400;
      sp.push(Math.cos(el) * Math.cos(a) * r, Math.sin(el) * r, Math.cos(el) * Math.sin(a) * r);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute("position", new THREE.Float32BufferAttribute(sp, 3));
    const stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xdfe8ff, size: 7, sizeAttenuation: true, fog: false, transparent: true, opacity: 0.85, depthWrite: false }));
    stars.renderOrder = -0.8; stars.frustumCulled = false;
    R.add(stars);

    // ---- lights ----
    this.hemi = new THREE.HemisphereLight("#3a4f86", "#1b2438", 0.5);
    this.moonLight = new THREE.DirectionalLight("#cfe0ff", 3.0);
    this.moonLight.castShadow = true;
    this.moonLight.shadow.mapSize.set(2048, 2048);
    const sc = this.moonLight.shadow.camera;
    sc.left = -60; sc.right = 60; sc.top = 60; sc.bottom = -60; sc.near = 1; sc.far = 600;
    this.moonLight.shadow.bias = -0.0005;
    R.add(this.hemi, this.moonLight, this.moonLight.target);

    // ---- the moon: a lit sphere with a few painted maria, plus a halo card that blooms ----
    this.moon = new THREE.Group();
    const moonMat = new THREE.MeshLambertMaterial({ color: "#f2e9cf", emissive: new THREE.Color("#8a8368"), emissiveIntensity: 0.55 });
    const ball = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 48), moonMat);
    this.moon.add(ball);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: halo(), color: new THREE.Color(0.55, 0.62, 0.85), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    halo.scale.setScalar(4.2); halo.renderOrder = 5;
    this.moon.add(halo);
    this.moon.frustumCulled = false;
    R.add(this.moon);

    // ---- clouds ----
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + 0.5, d = 900 + (i % 3) * 120;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: cloudHD(i % 4, LOOK.cloud), color: new THREE.Color(0.55, 0.6, 0.8), transparent: true, depthWrite: false, fog: false }));
      const w = 220 + (i % 4) * 40;
      m.position.set(Math.cos(a) * d, 160 + (i % 4) * 45, Math.sin(a) * d); m.scale.set(w, w / 2, 1);
      this.clouds.push(m); R.add(m);
    }

    // ---- land: the town side (z > 0) is a cobbled street ending in a low sea wall ----
    const b = new Batch();
    M.grass = lam("grassHD", () => ({ map: grassHD() }));
    M.cobble = lam("cobbleHD", () => ({ map: cobbleHD() }));
    M.wall = lam("wallHD", () => ({ map: stoneHD("moonWall", ["#8f8a9c", "#878195", "#9992a6", "#7f7a8d"], "#5f5a6c") }));
    M.planks = lam("planksHD", () => ({ map: planksHD() }));
    M.wood = twoTone(new THREE.MeshLambertMaterial({ color: "#6a5140" }), 0.15);
    M.window = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.55, 0.72) });
    M.windowDark = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.12, 0.13, 0.2) });
    M.roof = lam("roof", () => ({ color: "#5a3346" }));
    M.wallLight = lam("wallLight", () => ({ color: "#9a8f9e" }));
    M.wallWarm = lam("wallWarm", () => ({ color: "#8f7a72" }));
    M.iron = twoTone(new THREE.MeshPhongMaterial({ color: "#3d414c", specular: "#8a8a8a", shininess: 60 }), 0.15);

    // ground: street from z = 2 to z = 26, grass beyond
    b.add(quadUp(-120, 120, 2, 26, 6, 6), M.cobble);
    b.add(quadUp(-120, 120, 26, 160, 12, 12), M.grass);
    // sea wall + a small quay at the jetty root
    b.add(boxGeo(new THREE.Vector3(-120, -3, 1.2), new THREE.Vector3(120, 0.9, 2.2), 2), M.wall);
    b.add(boxGeo(new THREE.Vector3(-120, 0.9, 1.4), new THREE.Vector3(120, 1.15, 2.4), 2), M.wall);
    // jetty: planks on posts reaching out to sea (z < 0)
    for (let i = 0; i < 14; i++) {
      const z0 = 1.0 - i * 1.4, z1 = z0 - 1.35;
      b.add(quadUp(-2.2, 2.2, z1, z0, 1.2, 1.2, 0.98), M.planks);
      for (const x of [-2.1, 2.1]) b.add(boxGeo(new THREE.Vector3(x - 0.1, -2.4, z1 + 0.1), new THREE.Vector3(x + 0.1, 0.95, z1 + 0.3)), M.wood);
    }

    // cottages: two rows along the street, gabled, warm windows
    const houses: [number, number, number, number, number, number][] = [
      // x, z, w, d, h, variant
      [-8.5, 9, 6, 5, 5.2, 0], [-8.5, 16, 6, 5, 6.0, 1], [-8.5, 23, 6, 5, 5.4, 2],
      [9.0, 8, 6, 5, 5.6, 1], [9.0, 15, 6, 5, 5.0, 2], [9.0, 22, 6, 5, 6.2, 0],
      [-20, 12, 7, 6, 6.4, 2], [21, 19, 7, 6, 5.8, 0], [-21, 25, 7, 6, 5.2, 1], [22, 9, 7, 6, 6.0, 1],
    ];
    const walls = [M.wallLight, M.wallWarm, M.wall];
    houses.forEach(([x, z, w, d, h, v], i) => {
      const wm = walls[v % 3];
      b.add(boxGeo(new THREE.Vector3(x - w / 2, 0, z - d / 2), new THREE.Vector3(x + w / 2, h, z + d / 2), 2), wm);
      // gable roof (a prism: two sloped quads)
      const roofH = 2.2, x0 = x - w / 2 - 0.3, x1 = x + w / 2 + 0.3, z0 = z - d / 2 - 0.3, z1 = z + d / 2 + 0.3;
      const a = new THREE.Vector3(x0, h, z0), c = new THREE.Vector3(x1, h, z1), ridge0 = new THREE.Vector3(x0, h + roofH, z), ridge1 = new THREE.Vector3(x1, h + roofH, z);
      const g1 = new THREE.BufferGeometry();
      g1.setAttribute("position", new THREE.Float32BufferAttribute([...a.toArray(), ...ridge0.toArray(), ...ridge1.toArray(), ...a.toArray(), ...ridge1.toArray(), ...c.toArray()], 3));
      g1.computeVertexNormals();
      b.add(g1, M.roof);
      // windows facing the street
      const face = x < 0 ? x + w / 2 + 0.02 : x - w / 2 - 0.02;
      for (let k = 0; k < 2; k++) for (let r = 0; r < 2; r++) {
        const wy = 1.5 + r * 2.0, wz = z - 1.0 + k * 2.0;
        const lit = (i * 3 + k + r * 2) % 4 !== 0;
        const q = new THREE.PlaneGeometry(0.8, 0.95);
        q.rotateY(x < 0 ? Math.PI / 2 : -Math.PI / 2);
        q.translate(face, wy, wz);
        b.add(q, lit ? M.window : M.windowDark);
      }
    });
    // street lamps along the quay
    for (const [x, z] of [[-4.5, 3.6], [4.5, 3.6], [-12, 6.5], [12, 6.5]]) {
      b.add(boxGeo(new THREE.Vector3(x - 0.06, 0, z - 0.06), new THREE.Vector3(x + 0.06, 3.2, z + 0.06)), M.iron);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 2.2, 1.0) }));
      head.position.set(x, 3.35, z);
      b.add(head.geometry, head.material, new THREE.Matrix4().makeTranslation(x, 3.35, z));
    }
    b.build(R);

    // the moon's light: a soft point light per lamp so the street has warm pools
    for (const [x, z] of [[-4.5, 3.6], [4.5, 3.6]]) {
      const L = new THREE.PointLight("#ffb463", 6, 14, 2);
      L.position.set(x, 3.3, z);
      this.lamps.push(L); R.add(L);
    }

    // ---- sea ----
    this.seaMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    this.sea = new THREE.Mesh(quadUp(-1500, 1500, -1500, 2.0, 40, 40, -0.6), this.seaMat);
    this.sea.receiveShadow = true;
    R.add(this.sea);

    // ---- kit props (trees, bushes) ----
    const place = (name: string, x: number, z: number, h: number) => {
      const src = kit[name];
      if (!src) return;
      const o = src.clone(true);
      const bb = new THREE.Box3().setFromObject(o), size = bb.getSize(new THREE.Vector3());
      const s = h / Math.max(0.001, size.y);
      o.scale.setScalar(s);
      o.position.set(x, 0, z);
      o.traverse((c) => { const m = c as THREE.Mesh; if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; (m.material as THREE.MeshLambertMaterial).color?.multiplyScalar(0.6); } });
      R.add(o);
    };
    place("tree_oak", -14, 30, 9); place("tree_default", 16, 31, 8.5); place("tree_fat", -26, 34, 10);
    place("tree_cone", 27, 36, 9); place("plant_bushLarge", -4.2, 27, 1.4); place("plant_bush", 4.6, 28, 1.2);
    place("hedge", -3.2, 24, 0.9); place("hedge", 3.4, 25, 0.9);

    // ---- fog ----
    this.fog.color.set("#28406e");
  }

  /** pose the world for shot `id` at frame `f`; returns the point the lens focuses on by default */
  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene): THREE.Vector3 {
    const su = this.skyMat.uniforms;
    LOOK.sky.c.forEach((h, i) => su["c" + i].value.set(h));
    const e = LOOK.sky.e.map((d) => THREE.MathUtils.degToRad(d));
    su.e.value.set(e[1], e[2], e[3], e[4]);
    scene.fog = this.fog;
    scene.background = null;
    // sky + clouds follow the camera; the moon is placed per shot by the caller
    this.moon.position.set(0, 0, 0);
    return new THREE.Vector3(0, 2, 10);
  }
}

const halo = () => {
  const c = document.createElement("canvas"); c.width = c.height = 256;
  const g = c.getContext("2d")!;
  const gr = g.createRadialGradient(128, 128, 10, 128, 128, 128);
  gr.addColorStop(0, "rgba(255,255,255,0.9)");
  gr.addColorStop(0.25, "rgba(200,215,255,0.35)");
  gr.addColorStop(1, "rgba(120,150,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
};
