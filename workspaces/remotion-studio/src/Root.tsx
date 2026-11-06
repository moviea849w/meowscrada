// Root — Remotion entry point. Registers every composition in this studio.
//
// The bridge short is the proven reference from the cartoon-3d-short skill:
// 2D cartoon characters in a 3D painted world, rendered with three.js.
//
// Add new compositions here (one <Composition> per video).

import React from "react";
import { Composition, registerRoot } from "remotion";
import { BridgeShort, BRIDGE_FRAMES } from "./videos/bridge/Bridge";
import { GlProbe, PROBE_FRAMES } from "./videos/probe/GlProbe";

const Root: React.FC = () => (
  <>
    <Composition
      id="BridgeShort"
      component={BridgeShort}
      durationInFrames={BRIDGE_FRAMES}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="GlProbe"
      component={GlProbe}
      durationInFrames={PROBE_FRAMES}
      fps={30}
      width={1080}
      height={1920}
    />
  </>
);

registerRoot(Root);
