// scene-templates.tsx — reusable scene layouts for long-form episodes.
//
// A template is a pure function: (scene, art, palette) → JSX. Episodes pick a
// template by name in scenes.json ("template": "lower-third"), so the look stays
// consistent across episodes and one edit fixes every video.
//
// Templates:
//   title       — centered lower title over art, for cold opens and outros
//   lower-third — kicker + headline anchored bottom-left (the workhorse)
//   quote       — large centered statement, no kicker, for the turn
//   stat        — one huge number/word, everything else quiet
//   split       — art on the right, solid panel on the left holding the text

import type { ReactNode } from "react";

export type Scene = {
  template?: string;
  art?: string;
  focus?: string;
  scrim?: number;
  kicker?: string;
  title?: string;
  sub?: string;
  stat?: string;
  titleSize?: number;
};

export type Palette = {
  text: string;
  textDim: string;
  accent: string;
  ink: string;
  surface: string;
};

const W = 1920;
const H = 1080;

const focusToPosition = (focus?: string) =>
  focus === "top" ? "center 12%" :
  focus === "bottom" ? "center 85%" :
  focus === "left" ? "18% center" :
  focus === "right" ? "82% center" :
  "center center";

const Art = ({ uri, focus }: { uri: string | null; focus?: string }) =>
  uri ? (
    <img
      src={uri}
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: W,
        height: H,
        objectFit: "cover",
        objectPosition: focusToPosition(focus),
      }}
    />
  ) : null;

const Scrim = ({ amount, gradient }: { amount: number; gradient: string }) => (
  <>
    <div
      style={{
        display: "flex",
        position: "absolute",
        left: 0,
        top: 0,
        width: W,
        height: H,
        background: `rgba(8,7,6,${amount})`,
      }}
    />
    <div
      style={{
        display: "flex",
        position: "absolute",
        left: 0,
        top: 0,
        width: W,
        height: H,
        background: gradient,
      }}
    />
  </>
);

const Kicker = ({ text, c }: { text?: string; c: Palette }) =>
  text ? (
    <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 30, color: c.accent }}>
      <div style={{ display: "flex", width: 52, height: 3, background: c.accent }} />
      <div style={{ display: "flex", letterSpacing: 1 }}>{text}</div>
    </div>
  ) : null;

const Frame = ({ children }: { children: ReactNode }) => (
  <div
    style={{
      display: "flex",
      position: "relative",
      width: W,
      height: H,
      background: "#0b0a09",
      fontFamily: "Poppins",
      overflow: "hidden",
    }}
  >
    {children}
  </div>
);

// ---------------------------------------------------------------- templates

const Title = ({ s, art, c }: { s: Scene; art: string | null; c: Palette }) => (
  <Frame>
    <Art uri={art} focus={s.focus} />
    <Scrim
      amount={0.3}
      gradient="linear-gradient(to top, rgba(8,7,6,0.96) 0%, rgba(8,7,6,0.7) 32%, rgba(8,7,6,0.10) 62%, rgba(8,7,6,0.3) 100%)"
    />
    <div
      style={{
        display: "flex",
        position: "absolute",
        left: 0,
        top: 0,
        width: W,
        height: H,
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: 26,
        paddingLeft: 160,
        paddingRight: 160,
        paddingBottom: 140,
      }}
    >
      <Kicker text={s.kicker} c={c} />
      <div
        style={{
          display: "flex",
          fontSize: s.titleSize || 96,
          fontWeight: 800,
          color: c.text,
          lineHeight: 1.08,
          textAlign: "center",
        }}
      >
        {s.title}
      </div>
      {s.sub ? (
        <div style={{ display: "flex", fontSize: 42, fontWeight: 600, color: c.textDim }}>{s.sub}</div>
      ) : null}
    </div>
  </Frame>
);

const LowerThird = ({ s, art, c }: { s: Scene; art: string | null; c: Palette }) => (
  <Frame>
    <Art uri={art} focus={s.focus} />
    <Scrim
      amount={s.scrim ?? 0.28}
      gradient="linear-gradient(to top, rgba(8,7,6,0.97) 0%, rgba(8,7,6,0.82) 26%, rgba(8,7,6,0.18) 58%, rgba(8,7,6,0.32) 100%)"
    />
    <div
      style={{
        display: "flex",
        position: "absolute",
        left: 0,
        top: 0,
        width: W,
        height: H,
        flexDirection: "column",
        justifyContent: "flex-end",
        alignItems: "flex-start",
        gap: 20,
        paddingLeft: 130,
        paddingRight: 300,
        paddingBottom: 130,
      }}
    >
      <Kicker text={s.kicker} c={c} />
      <div
        style={{
          display: "flex",
          fontSize: s.titleSize || 88,
          fontWeight: 800,
          color: c.text,
          lineHeight: 1.1,
          maxWidth: 1450,
        }}
      >
        {s.title}
      </div>
      {s.sub ? (
        <div style={{ display: "flex", fontSize: 40, fontWeight: 600, color: c.textDim }}>{s.sub}</div>
      ) : null}
    </div>
  </Frame>
);

const Quote = ({ s, art, c }: { s: Scene; art: string | null; c: Palette }) => (
  <Frame>
    <Art uri={art} focus={s.focus} />
    <Scrim amount={s.scrim ?? 0.45} gradient="radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 25%, rgba(0,0,0,0.45) 100%)" />
    <div
      style={{
        display: "flex",
        position: "absolute",
        left: 0,
        top: 0,
        width: W,
        height: H,
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 34,
        paddingLeft: 220,
        paddingRight: 220,
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: s.titleSize || 78,
          fontWeight: 700,
          color: c.text,
          lineHeight: 1.24,
          textAlign: "center",
        }}
      >
        {s.title}
      </div>
      {s.sub ? (
        <div style={{ display: "flex", fontSize: 38, fontWeight: 600, color: c.accent }}>{s.sub}</div>
      ) : null}
    </div>
  </Frame>
);

const Stat = ({ s, art, c }: { s: Scene; art: string | null; c: Palette }) => (
  <Frame>
    <Art uri={art} focus={s.focus} />
    <Scrim amount={s.scrim ?? 0.55} gradient="linear-gradient(to bottom, rgba(8,7,6,0.25), rgba(8,7,6,0.8))" />
    <div
      style={{
        display: "flex",
        position: "absolute",
        left: 0,
        top: 0,
        width: W,
        height: H,
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 18,
      }}
    >
      <div style={{ display: "flex", fontSize: 250, fontWeight: 800, color: c.accent, lineHeight: 1 }}>
        {s.stat}
      </div>
      <div style={{ display: "flex", fontSize: 56, fontWeight: 700, color: c.text, textAlign: "center", maxWidth: 1200 }}>
        {s.title}
      </div>
      {s.sub ? (
        <div style={{ display: "flex", fontSize: 34, fontWeight: 600, color: c.textDim }}>{s.sub}</div>
      ) : null}
    </div>
  </Frame>
);

const Split = ({ s, art, c }: { s: Scene; art: string | null; c: Palette }) => (
  <Frame>
    <div style={{ display: "flex", position: "absolute", left: 0, top: 0, width: 960, height: H, background: c.ink }} />
    <div
      style={{
        display: "flex",
        position: "absolute",
        left: 960,
        top: 0,
        width: 960,
        height: H,
        overflow: "hidden",
      }}
    >
      <Art uri={art} focus={s.focus} />
    </div>
    {/* fade art into the panel */}
    <div
      style={{
        display: "flex",
        position: "absolute",
        left: 860,
        top: 0,
        width: 320,
        height: H,
        background: "linear-gradient(to right, #0b0a09 0%, rgba(11,10,9,0) 100%)",
      }}
    />
    <div
      style={{
        display: "flex",
        position: "absolute",
        left: 0,
        top: 0,
        width: 900,
        height: H,
        flexDirection: "column",
        justifyContent: "center",
        gap: 22,
        paddingLeft: 110,
        paddingRight: 20,
      }}
    >
      <Kicker text={s.kicker} c={c} />
      <div style={{ display: "flex", fontSize: s.titleSize || 68, fontWeight: 800, color: c.text, lineHeight: 1.14 }}>
        {s.title}
      </div>
      {s.sub ? (
        <div style={{ display: "flex", fontSize: 38, fontWeight: 600, color: c.textDim }}>{s.sub}</div>
      ) : null}
    </div>
  </Frame>
);

export const TEMPLATES = { title: Title, "lower-third": LowerThird, quote: Quote, stat: Stat, split: Split };

export function renderTemplate(s: Scene, art: string | null, c: Palette) {
  const T = TEMPLATES[(s.template as keyof typeof TEMPLATES) || "lower-third"] || LowerThird;
  return T({ s, art, c });
}
