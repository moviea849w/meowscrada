// storyboard-templates.tsx — vertical (1080x1920) storyboard explainer panels.
//
// Storyboard style = paper, ink, hand-drawn frames. Every scene is a drawn panel:
// a cream page, a wobbly ink border, a small panel number, a sketch illustration,
// and a headline set in a marker-ish weight. Reads like someone is drawing the
// explanation as they talk.
//
// Panels (picked by "template" in scenes.json):
//   sketch     — big drawn illustration + headline underneath (the workhorse)
//   wave       — sound-wave diagram: noise / invert / cancel / twist phases
//   split      — two-column contrast, left vs right, ink divider down the middle
//   swing      — push/pull diagram with a swing arc and a badly-timed push
//   quote      — one big statement, nothing else, for the twist
//
// All coordinates are in the 1080x1920 page space.

import type { ReactNode } from "react";
import { ANIMATIONS } from "./animate.tsx";

export type Scene = {
  template?: string;
  text?: string;
  accent?: string;
  sub?: string;
  kicker?: string;
  art?: string;
  phase?: string;
  draw?: string;
  panel?: string;
};

export type Palette = {
  paper: string;
  ink: string;
  inkDim: string;
  accent: string;
  accentSoft: string;
};

export const W = 1080;
export const H = 1920;

const M = 72; // page margin
const PANEL = W - M * 2;

// ---------------------------------------------------------------- primitives

const Page = ({ children, c, n }: { children: ReactNode; c: Palette; n?: string }) => (
  <div
    style={{
      display: "flex",
      position: "relative",
      width: W,
      height: H,
      background: c.paper,
      fontFamily: "Poppins",
      overflow: "hidden",
    }}
  >
    {/* faint ruled-paper grid, so empty areas still read as a page */}
    <div
      style={{
        display: "flex",
        position: "absolute",
        left: 0,
        top: 0,
        width: W,
        height: H,
        backgroundImage:
          "linear-gradient(to right, rgba(29,26,22,0.045) 1px, transparent 1px), linear-gradient(to bottom, rgba(29,26,22,0.045) 1px, transparent 1px)",
        backgroundSize: "60px 60px",
      }}
    />
    {children}
    {n ? (
      <div
        style={{
          display: "flex",
          position: "absolute",
          left: M,
          bottom: 54,
          fontSize: 30,
          fontWeight: 700,
          color: c.inkDim,
          letterSpacing: 6,
        }}
      >
        {n}
      </div>
    ) : null}
    {/* page corner mark */}
    <div
      style={{
        display: "flex",
        position: "absolute",
        right: M,
        bottom: 60,
        fontSize: 26,
        fontWeight: 600,
        color: c.inkDim,
        letterSpacing: 4,
      }}
    >
      HOW IT WORKS
    </div>
  </div>
);

// a hand-drawn-ish panel frame: double border, slightly inset, uneven
const Frame = ({ c, top, height }: { c: Palette; top: number; height: number }) => (
  <>
    <div
      style={{
        display: "flex",
        position: "absolute",
        left: M,
        top,
        width: PANEL,
        height,
        border: `5px solid ${c.ink}`,
        borderRadius: 6,
      }}
    />
    <div
      style={{
        display: "flex",
        position: "absolute",
        left: M + 14,
        top: top + 12,
        width: PANEL - 28,
        height: height - 24,
        border: `2px solid ${c.ink}`,
        borderRadius: 4,
        opacity: 0.35,
      }}
    />
  </>
);

// headline that bolds the accented fragment
const Headline = ({
  text,
  accent,
  c,
  size,
  align = "left",
  width,
}: {
  text?: string;
  accent?: string;
  c: Palette;
  size: number;
  align?: "left" | "center";
  width: number;
}) => {
  const parts = (text ?? "").split("\n");
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width,
        alignItems: align === "center" ? "center" : "flex-start",
        textAlign: align,
      }}
    >
      {parts.map((line, i) => {
        const has = accent && line.includes(accent);
        const at = has ? line.indexOf(accent) : -1;
        const before = has ? line.slice(0, at) : line;
        const after = has ? line.slice(at + accent.length) : "";
        return (
          <div
            key={i}
            style={{
              display: "flex",
              flexDirection: "row",
              flexWrap: "wrap",
              fontSize: size,
              fontWeight: 800,
              lineHeight: 1.16,
              color: c.ink,
              letterSpacing: -1,
            }}
          >
            {has ? (
              <>
                <div style={{ display: "flex" }}>{before}</div>
                <div style={{ display: "flex", color: c.accent }}>{accent}</div>
                <div style={{ display: "flex" }}>{after}</div>
              </>
            ) : (
              <div style={{ display: "flex" }}>{line || " "}</div>
            )}
          </div>
        );
      })}
    </div>
  );
};

const Sub = ({ text, c }: { text?: string; c: Palette }) =>
  text ? (
    <div style={{ display: "flex", fontSize: 36, fontWeight: 600, color: c.inkDim, lineHeight: 1.35 }}>
      {text}
    </div>
  ) : null;

const Kicker = ({ text, c }: { text?: string; c: Palette }) =>
  text ? (
    <div style={{ display: "flex", fontSize: 30, fontWeight: 700, color: c.accent, letterSpacing: 4 }}>
      {text}
    </div>
  ) : null;

// ---------------------------------------------------------------- drawings
//
// Illustrations are pure divs — bars, circles, strokes — so they render on CPU
// with Takumi and animate later with ffmpeg motion. Each `draw` name maps to one.

const Bar = ({ x, y, w, h, c, fill, r = 6 }: { x: number; y: number; w: number; h: number; c: Palette; fill?: string; r?: number }) => (
  <div
    style={{
      display: "flex",
      position: "absolute",
      left: x,
      top: y,
      width: w,
      height: h,
      background: fill ?? c.ink,
      borderRadius: r,
    }}
  />
);

const Ring = ({ x, y, size, c, thick = 6 }: { x: number; y: number; size: number; c: Palette; thick?: number }) => (
  <div
    style={{
      display: "flex",
      position: "absolute",
      left: x,
      top: y,
      width: size,
      height: size,
      border: `${thick}px solid ${c.ink}`,
      borderRadius: size,
    }}
  />
);

const Dot = ({ x, y, size, c, fill }: { x: number; y: number; size: number; c: Palette; fill?: string }) => (
  <div
    style={{
      display: "flex",
      position: "absolute",
      left: x,
      top: y,
      width: size,
      height: size,
      background: fill ?? c.accent,
      borderRadius: size,
    }}
  />
);

const Line = ({ x, y, w, h, c, fill }: { x: number; y: number; w: number; h: number; c: Palette; fill?: string }) => (
  <div style={{ display: "flex", position: "absolute", left: x, top: y, width: w, height: h, background: fill ?? c.ink }} />
);

// a wave drawn as a row of vertical bars (sample heights supplied per phase).
// The bar spans from the baseline up for a peak, and from the baseline down for
// a trough, so "peak meets trough" actually looks like it.
const WaveBars = ({
  x,
  y,
  w,
  h,
  samples,
  c,
  color,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  samples: number[];
  c: Palette;
  color?: string;
}) => {
  const n = samples.length;
  const gap = 6;
  const bw = (w - gap * (n - 1)) / n;
  const base = y + h / 2;
  return (
    <>
      {/* the zero line */}
      <Line x={x - 14} y={base - 2} w={w + 28} h={4} c={c} fill={c.inkDim} />
      {samples.map((s, i) => {
        const bh = Math.max(10, Math.abs(s) * (h / 2 - 6));
        const top = s >= 0 ? base - bh : base;
        return (
          <div
            key={i}
            style={{
              display: "flex",
              position: "absolute",
              left: x + i * (bw + gap),
              top,
              width: bw,
              height: bh,
              background: color ?? c.ink,
              borderRadius: bw / 2,
              opacity: s < 0 ? 0.5 : 1,
            }}
          />
        );
      })}
    </>
  );
};

// a smooth-ish sine as a polyline of dots — used for the noise / invert panels
const wave = (n: number, amp: number, phase = 0) =>
  Array.from({ length: n }, (_, i) => Math.sin((i / (n - 1)) * Math.PI * 4 + phase) * amp);

const Drawings: Record<string, (c: Palette) => ReactNode> = {
  // over-ear headphone: two cups + band
  headphone: (c) => (
    <>
      <Ring x={200} y={120} size={500} c={c} thick={16} />
      <Bar x={140} y={370} w={104} h={200} c={c} r={38} />
      <Bar x={656} y={370} w={104} h={200} c={c} r={38} />
      <Bar x={164} y={394} w={56} h={152} c={c} fill={c.accent} r={24} />
      <Bar x={680} y={394} w={56} h={152} c={c} fill={c.accent} r={24} />
      <Bar x={140} y={690} w={620} h={8} c={c} />
    </>
  ),

  // head with headphones + incoming noise arrows
  headNoise: (c) => (
    <>
      <Ring x={300} y={230} size={280} c={c} thick={14} />
      <Ring x={238} y={305} size={74} c={c} thick={16} />
      <Ring x={568} y={305} size={74} c={c} thick={16} />
      <Bar x={224} y={325} w={102} h={38} c={c} fill={c.accent} r={16} />
      <Bar x={554} y={325} w={102} h={38} c={c} fill={c.accent} r={16} />
      {[0, 1, 2].map((i) => (
        <Line key={i} x={40 + i * 30} y={290 + i * 44} w={110 - i * 18} h={10} c={c} />
      ))}
      {[0, 1, 2].map((i) => (
        <Line key={`r${i}`} x={700 - i * 30} y={290 + i * 44} w={110 - i * 18} h={10} c={c} />
      ))}
      <Bar x={140} y={690} w={620} h={8} c={c} />
    </>
  ),

  // a baby / crying face — simple dot eyes, open mouth, sound arcs
  cry: (c) => (
    <>
      <Ring x={70} y={40} size={200} c={c} thick={12} />
      <Dot x={125} y={110} size={26} c={c} />
      <Dot x={200} y={110} size={26} c={c} />
      <Ring x={152} y={150} size={60} c={c} thick={10} />
      {[0, 1, 2].map((i) => (
        <Ring key={i} x={20 - i * 14} y={-10 - i * 14} size={300 + i * 60} c={c} thick={5} />
      ))}
    </>
  ),

  // a swing: frame + arc + seat
  swing: (c) => (
    <>
      <Line x={60} y={600} w={680} h={12} c={c} />
      <Line x={110} y={600} w={12} h={170} c={c} />
      <Line x={678} y={600} w={12} h={170} c={c} />
      <Line x={240} y={110} w={12} h={330} c={c} />
      <Line x={500} y={110} w={12} h={330} c={c} />
      <Bar x={216} y={430} w={320} h={42} c={c} fill={c.accent} r={16} />
      {/* the arc the seat travels */}
      <Line x={60} y={690} w={680} h={6} c={c} fill={c.inkDim} />
      {/* the badly-timed push */}
      <Line x={30} y={330} w={170} h={14} c={c} />
      <Dot x={10} y={312} size={50} c={c} />
    </>
  ),

  // the ear-cup cross-section: mic, chip, speaker, ear
  circuit: (c) => (
    <>
      <Bar x={120} y={220} w={840} h={520} c={c} fill="rgba(29,26,22,0.05)" r={24} />
      <Ring x={200} y={330} size={120} c={c} thick={10} />
      <Line x={260} y={390} w={180} h={6} c={c} />
      <Bar x={430} y={330} w={170} h={120} c={c} r={14} />
      <Bar x={470} y={365} w={90} h={50} c={c} fill={c.accent} r={8} />
      <Line x={600} y={390} w={140} h={6} c={c} />
      <Ring x={730} y={330} size={120} c={c} thick={10} />
      <Ring x={760} y={360} size={60} c={c} thick={8} />
      <Bar x={140} y={610} w={150} h={8} c={c} fill={c.accent} />
      <Bar x={330} y={610} w={150} h={8} c={c} fill={c.accent} />
      <Bar x={520} y={610} w={150} h={8} c={c} fill={c.accent} />
      <Bar x={710} y={610} w={150} h={8} c={c} fill={c.accent} />
    </>
  ),

  // a plane engine with roar waves
  engine: (c) => (
    <>
      <Ring x={10} y={10} size={210} c={c} thick={12} />
      <Ring x={60} y={60} size={110} c={c} thick={9} />
      <Ring x={92} y={92} size={46} c={c} thick={7} />
      {[0, 1, 2].map((i) => (
        <Line key={i} x={250 + i * 32} y={60 + i * 44} w={80 - i * 16} h={9} c={c} />
      ))}
      <Bar x={0} y={250} w={390} h={8} c={c} />
    </>
  ),

  // "second engine" — mirror image of the first
  secondEngine: (c) => (
    <>
      <Ring x={60} y={120} size={300} c={c} thick={16} />
      <Ring x={130} y={190} size={160} c={c} thick={11} />
      <Ring x={570} y={120} size={300} c={c} thick={16} />
      <Ring x={640} y={190} size={160} c={c} thick={11} />
      <Bar x={60} y={680} w={810} h={10} c={c} />
      <Dot x={445} y={255} size={70} c={c} />
    </>
  ),

  // pressure — ears feel the wave
  pressure: (c) => (
    <>
      <Ring x={330} y={280} size={360} c={c} thick={14} />
      <Ring x={400} y={350} size={220} c={c} thick={10} />
      <Ring x={450} y={400} size={120} c={c} thick={8} />
      <Dot x={490} y={440} size={40} c={c} />
      {[0, 1, 2].map((i) => (
        <Ring key={i} x={300 - i * 60} y={250 - i * 60} size={420 + i * 120} c={c} thick={5} />
      ))}
    </>
  ),
};

// ---------------------------------------------------------------- panels

const panelNo = (s: Scene) => (s.panel ? `PANEL ${s.panel}` : undefined);

const Sketch = ({ s, c }: { s: Scene; c: Palette }) => {
  const draw = Drawings[s.draw ?? "headphone"] ?? Drawings.headphone;
  return (
    <Page c={c} n={panelNo(s)}>
      <Frame c={c} top={190} height={820} />
      <div style={{ display: "flex", position: "absolute", left: M + 60, top: 260, width: PANEL - 120, height: 680, overflow: "hidden" }}>
        {draw(c)}
      </div>
      <div
        style={{
          display: "flex",
          position: "absolute",
          left: M,
          top: 1080,
          width: PANEL,
          flexDirection: "column",
          gap: 26,
        }}
      >
        <Kicker text={s.kicker} c={c} />
        <Headline text={s.text} accent={s.accent} c={c} size={82} width={PANEL} />
        <Sub text={s.sub} c={c} />
      </div>
    </Page>
  );
};

// sound-wave diagram. phase decides which waves are drawn:
//   noise   — the engine wave alone
//   invert  — engine wave above, inverted copy below
//   cancel  — both on one axis, flat result under it
//   twist   — engine wave, and a "second engine" label
const Wave = ({ s, c }: { s: Scene; c: Palette }) => {
  const n = 22;
  const engine = wave(n, 1);
  const inverted = engine.map((v) => -v);
  const phase = s.phase ?? "noise";

  return (
    <Page c={c} n={panelNo(s)}>
      <Frame c={c} top={190} height={1000} />
      <div style={{ display: "flex", position: "absolute", left: M + 70, top: 250, width: PANEL - 140, height: 880, flexDirection: "column", gap: 40 }}>
        {phase === "noise" || phase === "twist" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 20, width: PANEL - 140, height: 360 }}>
            <div style={{ display: "flex", fontSize: 30, fontWeight: 700, color: c.inkDim, letterSpacing: 3 }}>
              {phase === "twist" ? "ENGINE" : "THE NOISE"}
            </div>
            <div style={{ display: "flex", position: "relative", width: PANEL - 140, height: 280 }}>
              <WaveBars x={0} y={0} w={PANEL - 140} h={260} samples={engine} c={c} />
            </div>
          </div>
        ) : null}

        {phase === "invert" ? (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", fontSize: 30, fontWeight: 700, color: c.inkDim, letterSpacing: 3 }}>THE NOISE</div>
              <div style={{ display: "flex", position: "relative", width: PANEL - 140, height: 250 }}>
                <WaveBars x={0} y={0} w={PANEL - 140} h={240} samples={engine} c={c} />
              </div>
            </div>
            <div style={{ display: "flex", fontSize: 44, fontWeight: 800, color: c.accent }}>↓ flipped upside down</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", fontSize: 30, fontWeight: 700, color: c.inkDim, letterSpacing: 3 }}>THE OPPOSITE</div>
              <div style={{ display: "flex", position: "relative", width: PANEL - 140, height: 250 }}>
                <WaveBars x={0} y={0} w={PANEL - 140} h={240} samples={inverted} c={c} color={c.accent} />
              </div>
            </div>
          </>
        ) : null}

        {phase === "cancel" ? (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", fontSize: 30, fontWeight: 700, color: c.inkDim, letterSpacing: 3 }}>NOISE + OPPOSITE</div>
              <div style={{ display: "flex", position: "relative", width: PANEL - 140, height: 280 }}>
                <WaveBars x={0} y={0} w={PANEL - 140} h={250} samples={engine} c={c} />
                <WaveBars x={0} y={0} w={PANEL - 140} h={250} samples={inverted} c={c} color={c.accent} />
              </div>
            </div>
            <div style={{ display: "flex", fontSize: 44, fontWeight: 800, color: c.ink }}>=</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", fontSize: 30, fontWeight: 700, color: c.inkDim, letterSpacing: 3 }}>YOU HEAR</div>
              <div style={{ display: "flex", position: "relative", width: PANEL - 140, height: 120, alignItems: "center" }}>
                <Line x={0} y={58} w={PANEL - 140} h={6} c={c} />
                <div style={{ display: "flex", position: "absolute", left: 0, top: 70, fontSize: 34, fontWeight: 800, color: c.accent }}>nothing</div>
              </div>
            </div>
          </>
        ) : null}

        {phase === "twist" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex", fontSize: 30, fontWeight: 700, color: c.inkDim, letterSpacing: 3 }}>THE SECOND ENGINE</div>
            <div style={{ display: "flex", position: "relative", width: PANEL - 140, height: 280 }}>
              <WaveBars x={0} y={0} w={PANEL - 140} h={260} samples={inverted} c={c} color={c.accent} />
            </div>
          </div>
        ) : null}
      </div>
      <div style={{ display: "flex", position: "absolute", left: M, top: 1250, width: PANEL, flexDirection: "column", gap: 24 }}>
        <Kicker text={s.kicker} c={c} />
        <Headline text={s.text} accent={s.accent} c={c} size={76} width={PANEL} />
        <Sub text={s.sub} c={c} />
      </div>
    </Page>
  );
};

// two-column contrast: left ink panel, right paper panel
const Split = ({ s, c }: { s: Scene; c: Palette }) => {
  const [left, right] = (s.text ?? "").split("\n");
  const colW = PANEL / 2 - 34;
  return (
    <Page c={c} n={panelNo(s)}>
      <Frame c={c} top={240} height={1060} />
      {/* left block */}
      <div
        style={{
          display: "flex",
          position: "absolute",
          left: M + 16,
          top: 256,
          width: PANEL / 2 - 20,
          height: 1028,
          background: c.ink,
          flexDirection: "column",
          justifyContent: "center",
          paddingLeft: 40,
          paddingRight: 26,
          gap: 26,
        }}
      >
        <div style={{ display: "flex", fontSize: 30, fontWeight: 700, color: c.accentSoft, letterSpacing: 4 }}>YES</div>
        <div style={{ display: "flex", fontSize: 54, fontWeight: 800, color: c.paper, lineHeight: 1.14 }}>{left}</div>
        <div style={{ display: "flex", position: "relative", width: colW, height: 280, marginTop: 20 }}>{Drawings.engine(c)}</div>
      </div>
      {/* right block */}
      <div
        style={{
          display: "flex",
          position: "absolute",
          left: M + PANEL / 2 + 6,
          top: 256,
          width: PANEL / 2 - 22,
          height: 1028,
          flexDirection: "column",
          justifyContent: "center",
          paddingLeft: 34,
          paddingRight: 20,
          gap: 26,
        }}
      >
        <div style={{ display: "flex", fontSize: 30, fontWeight: 700, color: c.accent, letterSpacing: 4 }}>NO</div>
        <div style={{ display: "flex", fontSize: 54, fontWeight: 800, color: c.ink, lineHeight: 1.14 }}>{right}</div>
        <div style={{ display: "flex", position: "relative", width: colW, height: 280, marginTop: 20 }}>{Drawings.cry(c)}</div>
      </div>
      <div style={{ display: "flex", position: "absolute", left: M + PANEL / 2 - 3, top: 250, width: 6, height: 1040, background: c.ink }} />
      <div style={{ display: "flex", position: "absolute", left: M, top: 1370, width: PANEL, flexDirection: "column", gap: 22 }}>
        <Kicker text={s.kicker} c={c} />
        <Sub text={s.sub} c={c} />
      </div>
    </Page>
  );
};

// the swing analogy
const Swing = ({ s, c }: { s: Scene; c: Palette }) => (
  <Page c={c} n={panelNo(s)}>
    <Frame c={c} top={190} height={840} />
    <div style={{ display: "flex", position: "absolute", left: M + 50, top: 240, width: PANEL - 100, height: 740, overflow: "hidden" }}>
      {Drawings.swing(c)}
    </div>
    <div style={{ display: "flex", position: "absolute", left: M, top: 1080, width: PANEL, flexDirection: "column", gap: 24 }}>
      <Kicker text={s.kicker} c={c} />
      <Headline text={s.text} accent={s.accent} c={c} size={80} width={PANEL} />
      <Sub text={s.sub} c={c} />
    </div>
  </Page>
);

// one statement, centred
const Quote = ({ s, c }: { s: Scene; c: Palette }) => (
  <Page c={c} n={panelNo(s)}>
    <Frame c={c} top={330} height={900} />
    <div
      style={{
        display: "flex",
        position: "absolute",
        left: M + 70,
        top: 400,
        width: PANEL - 140,
        flexDirection: "column",
        gap: 40,
        alignItems: "center",
      }}
    >
      <div style={{ display: "flex", fontSize: 120, fontWeight: 800, color: c.accent, lineHeight: 1 }}>“</div>
      <Headline text={s.text} accent={s.accent} c={c} size={88} align="center" width={PANEL - 140} />
      <Sub text={s.sub} c={c} />
    </div>
  </Page>
);

export const TEMPLATES = { sketch: Sketch, wave: Wave, split: Split, swing: Swing, quote: Quote };

export function renderTemplate(s: Scene, c: Palette) {
  const T = TEMPLATES[(s.template as keyof typeof TEMPLATES) || "sketch"] || Sketch;
  return T({ s, c });
}

// ---------------------------------------------------------------- animated panels
//
// A keyframe is a full frame, not an overlay: the drawing changes AND the headline
// types on. Used by render-frames.tsx; the `animate` name selects a drawing from
// animate.tsx and `t` (0..1) is the scene's progress.

// types only; the runtime import lives at the top of the file

const LANDSCAPE_W = 1920;
const LANDSCAPE_H = 1080;

const AnimPanel = ({
  s,
  c,
  t,
  w,
  h,
}: {
  s: Scene;
  c: Palette;
  t: number;
  w: number;
  h: number;
}) => {
  const draw = ANIMATIONS[s.animate ?? "wave-in"] ?? ANIMATIONS["wave-in"];
  const landscape = w > h;

  // headline types on across the last 40% of the scene
  const typed = Math.min(1, Math.max(0, (t - 0.55) / 0.45));
  const text = s.text ?? "";
  const shown = text.slice(0, Math.round(text.length * typed));

  const drawBox = landscape
    ? { left: 120, top: 90, width: 1680, height: 560 }
    : { left: 132, top: 230, width: 816, height: 800 };

  return (
    <div
      style={{
        display: "flex",
        position: "relative",
        width: w,
        height: h,
        background: c.paper,
        fontFamily: "Poppins",
        overflow: "hidden",
      }}
    >
      {!landscape ? (
        <div
          style={{
            display: "flex",
            position: "absolute",
            left: 0,
            top: 0,
            width: w,
            height: h,
            backgroundImage:
              "linear-gradient(to right, rgba(29,26,22,0.045) 1px, transparent 1px), linear-gradient(to bottom, rgba(29,26,22,0.045) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      ) : null}

      {/* the drawing stage */}
      <div style={{ display: "flex", position: "relative", ...drawBox, overflow: "hidden" }}>
        {draw(t, c)}
      </div>

      {/* headline */}
      <div
        style={{
          display: "flex",
          position: "absolute",
          left: landscape ? 120 : 72,
          top: landscape ? 700 : 1090,
          width: landscape ? 1680 : PANEL,
          flexDirection: "column",
          gap: 22,
        }}
      >
        <Kicker text={s.kicker} c={c} />
        <div style={{ display: "flex", fontSize: landscape ? 76 : 78, fontWeight: 800, color: c.ink, lineHeight: 1.16, whiteSpace: "pre-line" }}>
          {shown}
        </div>
        {s.sub && typed >= 1 ? <Sub text={s.sub} c={c} /> : null}
      </div>
    </div>
  );
};

export function renderAnimated(s: Scene, c: Palette, t: number, w = LANDSCAPE_W, h = LANDSCAPE_H) {
  return AnimPanel({ s, c, t, w, h });
}
