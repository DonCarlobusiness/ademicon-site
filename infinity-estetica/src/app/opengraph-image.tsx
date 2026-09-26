import { ImageResponse } from "next/og";

// Uses the ImageResponse default font: Newsreader is not bundled here to
// avoid a network fetch at build time. Same curve geometry as the hero.

export const alt = "Infinity Estética — conceito não oficial por Nítido Studio";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#F7F4EE",
          color: "#25211D",
          fontFamily: "serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "72px 0 64px 80px",
            width: 640,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 22, letterSpacing: 8, fontFamily: "sans-serif", fontWeight: 700 }}>
              INFINITY
            </div>
            <div style={{ fontSize: 26, fontStyle: "italic", color: "#655C52", marginTop: 4 }}>
              Estética
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", fontSize: 68, lineHeight: 1.04 }}>
            <div>Estética avançada.</div>
            <div>Comece pela conversa.</div>
          </div>
          <div style={{ fontSize: 20, color: "#655C52", fontFamily: "sans-serif" }}>
            Luís Eduardo Magalhães · BA — conceito não oficial por Nítido Studio
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flex: 1,
            background: "linear-gradient(168deg, #EFE9DF 0%, #E9E1D5 58%, #E2D8CA 100%)",
          }}
        >
          <svg width="560" height="630" viewBox="-200 40 700 720" fill="none">
            <path
              d="M120 470 C 220 330, 380 120, 560 110 C 720 100, 770 300, 704 460 C 640 620, 430 704, 300 646 C 222 610, 168 544, 120 470 C 92 428, 62 400, 30 386"
              stroke="#987944"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <path
              d="M4 376 C -40 358, -110 368, -150 408 C -190 450, -172 520, -122 540 C -80 556, -10 536, 62 500"
              stroke="#987944"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>
    ),
    size,
  );
}
