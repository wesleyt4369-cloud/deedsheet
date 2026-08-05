import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "DeedSheet — Comparative Market Analysis";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const PARCH = "#F2ECDC", GREEN = "#1F3D2B", BRASS = "#A8853C", RED = "#8E3B2F",
  INK = "#26221A", MUTE = "#6B6252";

export default async function Image({ params }) {
  let subject = null;
  let agent = null;
  let typeLabel = "Comparative Market Analysis";

  try {
    const res = await fetch(`${SUPA_URL}/rest/v1/shares?id=eq.${params.id}&select=data`, {
      headers: { apikey: SUPA_ANON, Authorization: `Bearer ${SUPA_ANON}` },
      cache: "no-store",
    });
    if (res.ok) {
      const rows = await res.json();
      const d = rows?.[0]?.data;
      if (d) {
        subject = d.subject || null;
        agent = d.agent || null;
        const t = d.meta?.type;
        if (t === "buyer") typeLabel = "Buyer Market Analysis";
        else if (t === "buyertour") typeLabel = "Private Home Tour";
        else if (t === "nonlisting") typeLabel = "Market Update";
      }
    }
  } catch {
    /* fall through to the generic card */
  }

  const address = subject?.address || "Property Presentation";
  const city = subject?.city || "";
  const specs = [
    subject?.beds ? `${subject.beds} bed` : null,
    subject?.baths ? `${subject.baths} bath` : null,
    subject?.sqft ? `${Number(subject.sqft).toLocaleString()} sqft` : null,
    subject?.year ? `built ${subject.year}` : null,
  ].filter(Boolean).join("  ·  ");

  const agentName = agent?.name && agent.name !== "Your Name" ? agent.name : null;
  const brokerage = agent?.brokerage && agent.brokerage !== "Your Brokerage" ? agent.brokerage : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%", display: "flex", flexDirection: "column",
          background: PARCH, padding: 26,
        }}
      >
        {/* Deed frame */}
        <div
          style={{
            flex: 1, display: "flex", flexDirection: "column",
            border: `4px solid ${GREEN}`, padding: 8,
          }}
        >
          <div
            style={{
              flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between",
              border: `1px solid ${GREEN}`, padding: "44px 56px", position: "relative",
            }}
          >
            {/* Seal */}
            <div
              style={{
                position: "absolute", top: 40, right: 52, width: 104, height: 104,
                borderRadius: 52, border: `3px solid ${RED}`, display: "flex",
                alignItems: "center", justifyContent: "center", opacity: 0.55,
              }}
            >
              <div
                style={{
                  display: "flex", fontSize: 15, letterSpacing: 3, color: RED,
                  fontWeight: 700, textTransform: "uppercase",
                }}
              >
                Deed
              </div>
            </div>

            {/* Top */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  display: "flex", fontSize: 20, letterSpacing: 8, color: RED,
                  fontWeight: 700, textTransform: "uppercase",
                }}
              >
                {typeLabel}
              </div>
              <div
                style={{
                  display: "flex", fontSize: address.length > 26 ? 62 : 76, color: GREEN,
                  fontWeight: 700, marginTop: 22, lineHeight: 1.05,
                }}
              >
                {address}
              </div>
              {city ? (
                <div style={{ display: "flex", fontSize: 30, color: INK, marginTop: 14 }}>{city}</div>
              ) : null}
              {specs ? (
                <div style={{ display: "flex", fontSize: 24, color: MUTE, marginTop: 12 }}>{specs}</div>
              ) : null}
            </div>

            {/* Bottom */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", width: 120, height: 3, background: BRASS, marginBottom: 20 }} />
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {agentName ? (
                    <div style={{ display: "flex", fontSize: 30, color: INK, fontWeight: 700 }}>
                      {`Prepared by ${agentName}`}
                    </div>
                  ) : (
                    <div style={{ display: "flex", fontSize: 30, color: INK, fontWeight: 700 }}>
                      Prepared exclusively for you
                    </div>
                  )}
                  {brokerage ? (
                    <div style={{ display: "flex", fontSize: 23, color: MUTE, marginTop: 8 }}>{brokerage}</div>
                  ) : null}
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                  <div style={{ display: "flex", fontSize: 34, color: GREEN, fontWeight: 700, letterSpacing: 1 }}>
                    DeedSheet
                  </div>
                  <div style={{ display: "flex", fontSize: 16, color: MUTE, letterSpacing: 4, marginTop: 6, textTransform: "uppercase" }}>
                    Private presentation
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
