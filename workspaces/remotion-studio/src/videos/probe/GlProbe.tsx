// GL probe — the smallest possible three.js scene that still proves a real WebGL
// render happened: gradient sky, lit ground, a sphere with a directional light,
// and one 2D cartoon card from the bridge cast. If this comes back blank or
// black on a runner, 3D is impossible there; if it comes back with a lit sphere,
// the cartoon-3d-short pipeline can render on that runner.
//
// Rendered by .github/workflows/gl-probe.yml, which reports which GL renderer
// the browser actually got (swiftshader / llvmpipe / hardware) in the log.
import React from "react";
import * as THREE from "three";
import { AbsoluteFill, useCurrentFrame, staticFile } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { Pen, bodyFront, KID } from "../bridge/toon";

export const PROBE_FRAMES = 30;

const Inner: React.FC = () => {
  const f = useCurrentFrame();
  const { gl, scene, camera } = useThree();
  React.useEffect(() => {
    const r = (gl as unknown as { getContext?: () => WebGLRenderingContext | WebGL2RenderingContext }).getContext?.() ?? (gl as unknown as WebGLRenderingContext);
    const dbg = r?.getExtension?.("WEBGL_debug_renderer_info") as { UNMASKED_RENDERER_WEBGL: number } | null | undefined;
    const name = dbg ? r.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : r?.getParameter?.(r.RENDERER);
    console.log(`[gl-probe] renderer=${name} version=${r?.getParameter?.(r.VERSION)}`);
  }, [gl]);
  React.useEffect(() => {
    const cv = document.createElement("canvas");
    cv.width = 600; cv.height = 1000;
    bodyFront(new Pen(cv.getContext("2d")!), KID, { mode: "stand", wave: 0.6, seed: 3, expr: "smile" });
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    scene.background = new THREE.Color("#0b1330");
    scene.fog = new THREE.Fog("#0b1330", 30, 120);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshLambertMaterial({ color: "#2f6b4f" }));
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);
    const moon = new THREE.Mesh(new THREE.SphereGeometry(6, 48, 32), new THREE.MeshLambertMaterial({ color: "#f2e9cf" }));
    moon.position.set(18, 22, -40);
    scene.add(moon);
    const post = new THREE.Mesh(new THREE.BoxGeometry(2, 6, 2), new THREE.MeshLambertMaterial({ color: "#8c3b4a" }));
    post.position.set(-6, 3, -10);
    scene.add(post);
    const kid = new THREE.Mesh(new THREE.PlaneGeometry(2.16, 3.6), new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide }));
    kid.position.set(0, 1.8, 0);
    scene.add(kid);
    scene.add(new THREE.HemisphereLight("#dcecff", "#2a4a3a", 0.6));
    const sun = new THREE.DirectionalLight("#fff3e0", 2.8);
    sun.position.set(10, 20, 12);
    sun.castShadow = true;
    scene.add(sun);
  }, [scene]);
  const cam = camera as THREE.PerspectiveCamera;
  cam.position.set(0 + f * 0.02, 2.4, 9);
  cam.lookAt(0, 2.6, 0);
  return null;
};

export const GlProbe: React.FC = () => (
  <AbsoluteFill style={{ background: "#0b1330" }}>
    <ThreeCanvas width={1080} height={1920} shadows camera={{ fov: 40, near: 0.2, far: 500 }}>
      <Inner />
    </ThreeCanvas>
  </AbsoluteFill>
);
