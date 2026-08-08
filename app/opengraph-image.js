import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "DeedSheet — CMA reports and listing presentations in minutes";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const PARCH = "#F2ECDC", GREEN = "#1F3D2B", BRASS = "#A8853C", RED = "#8E3B2F", MUTE = "#6B6252";

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: PARCH, padding: 26 }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", border: `4px solid ${GREEN}`, padding: 8 }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", border: `1px solid ${GREEN}`, padding: "50px 64px", textAlign: "center" }}>
            <div style={{ display: "flex", fontSize: 19, letterSpacing: 9, color: RED, fontWeight: 700, textTransform: "uppercase" }}>
              For real estate agents
            </div>
            <div style={{ display: "flex", fontSize: 66, color: GREEN, fontWeight: 700, marginTop: 26, lineHeight: 1.1, textAlign: "center" }}>
              CMA reports in minutes
            </div>
            <div style={{ display: "flex", fontSize: 27, color: MUTE, marginTop: 22, textAlign: "center" }}>
              Branded reports · interactive presentations · links your seller opens
            </div>
            <div style={{ display: "flex", width: 130, height: 3, background: BRASS, marginTop: 34 }} />
            <div style={{ display: "flex", fontSize: 34, color: GREEN, fontWeight: 700, marginTop: 26, letterSpacing: 1 }}>
              DeedSheet
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
