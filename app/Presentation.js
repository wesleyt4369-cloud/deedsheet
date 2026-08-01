"use client";

// Full-screen slide presentation in the deed aesthetic.
// Used both inside the app (present mode) and on public share links (/p/[id]).

import React, { useState, useEffect, useMemo, useRef } from "react";

const fmt = (n) =>
  (Number(n) || 0).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const GREEN = "#1F3D2B", DARK = "#16301F", PARCH = "#F2ECDC", CARD = "#E7DDC2",
  BRASS = "#A8853C", RED = "#8E3B2F", INK = "#26221A", MUTE = "#6B6252";

export default function Presentation({
  subject, agent, comps, mapPoints, geoKey,
  onExit, onShare, shareState, onPptx, pptxBusy,
}) {
  const adjusted = useMemo(
    () =>
      (comps || []).map((c) => ({
        ...c,
        adjValue: (Number(c.price) || 0) + (c.adjustments || []).reduce((s, a) => s + (Number(a.amount) || 0), 0),
      })),
    [comps]
  );
  const lo = adjusted.length ? Math.min(...adjusted.map((c) => c.adjValue)) : 0;
  const hi = adjusted.length ? Math.max(...adjusted.map((c) => c.adjValue)) : 0;
  const mid = adjusted.length
    ? Math.round(adjusted.reduce((s, c) => s + c.adjValue, 0) / adjusted.length / 5000) * 5000
    : 0;

  const slides = useMemo(() => {
    const arr = [{ type: "cover" }, { type: "position" }];
    if (mapPoints && geoKey) arr.push({ type: "map" });
    adjusted.forEach((_, i) => arr.push({ type: "comp", i }));
    arr.push({ type: "strategy" }, { type: "close" });
    return arr;
  }, [adjusted, mapPoints, geoKey]);

  const [idx, setIdx] = useState(0);
  const next = () => setIdx((v) => Math.min(v + 1, slides.length - 1));
  const prev = () => setIdx((v) => Math.max(v - 1, 0));

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowRight" || e.key === " ") next();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "Escape" && onExit) onExit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slides.length, onExit]);

  // Interactive map on the map slide
  const mapDivRef = useRef(null);
  const mapObjRef = useRef(null);
  const isMapSlide = slides[idx]?.type === "map";
  useEffect(() => {
    if (!isMapSlide || !mapPoints || !geoKey) return;
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !mapDivRef.current) return;
      if (mapObjRef.current) { mapObjRef.current.remove(); mapObjRef.current = null; }
      const map = L.map(mapDivRef.current, { scrollWheelZoom: true });
      const streets = L.tileLayer(
        `https://maps.geoapify.com/v1/tile/osm-bright/{z}/{x}/{y}.png?apiKey=${geoKey}`,
        { attribution: "© Geoapify · © OpenStreetMap contributors", maxZoom: 20 }
      );
      const satellite = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        { attribution: "Imagery © Esri", maxZoom: 19 }
      );
      streets.addTo(map);
      L.control.layers({ "Streets": streets, "Overhead (Satellite)": satellite }, null, { collapsed: false }).addTo(map);
      const pinHtml = (bg, label) =>
        `<div style="width:32px;height:32px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${bg};border:2.5px solid #f2ecdc;box-shadow:0 2px 6px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;"><span style="transform:rotate(45deg);color:#f2ecdc;font-weight:700;font-family:Arial,sans-serif;font-size:13px;">${label}</span></div>`;
      const addPin = (lnglat, bg, label, popupHtml, z) => {
        L.marker([lnglat[1], lnglat[0]], {
          icon: L.divIcon({ className: "", html: pinHtml(bg, label), iconSize: [32, 32], iconAnchor: [16, 30], popupAnchor: [0, -28] }),
          zIndexOffset: z,
        }).addTo(map).bindPopup(popupHtml);
      };
      addPin(
        mapPoints.subj, "#8e3b2f", "S",
        `<div style="font-family:Georgia,serif;min-width:190px;"><b style="font-size:14px;">${subject.address}</b><br/><span style="color:#555;">${subject.beds} bd / ${subject.baths} ba · ${(subject.sqft || 0).toLocaleString()} sqft</span><br/><span style="color:#8e3b2f;font-weight:700;">Recommended list: ${fmt(mid)}</span></div>`,
        1000
      );
      (mapPoints.comps || []).forEach((coord, i) => {
        if (!coord || !adjusted[i]) return;
        const c = adjusted[i];
        addPin(
          coord, "#1f3d2b", String(i + 1),
          `<div style="font-family:Georgia,serif;min-width:190px;"><b style="font-size:14px;">${i + 1}. ${c.address}</b><br/><span style="color:#555;">${c.beds} bd / ${c.baths} ba · ${(c.sqft || 0).toLocaleString()} sqft · sold ${c.sold}</span><br/>Sold: <b>${fmt(c.price)}</b><br/>Adjusted: <b style="color:#1f3d2b;">${fmt(c.adjValue)}</b></div>`,
          0
        );
      });
      const pts = [mapPoints.subj, ...(mapPoints.comps || []).filter(Boolean)].map((p) => [p[1], p[0]]);
      map.fitBounds(L.latLngBounds(pts), { padding: [45, 45] });
      mapObjRef.current = map;
    })();
    return () => {
      cancelled = true;
      if (mapObjRef.current) { mapObjRef.current.remove(); mapObjRef.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMapSlide, mapPoints, geoKey]);

  const eyebrow = (text) => (
    <div style={{ fontSize: "clamp(9px, 1.1vw, 13px)", letterSpacing: "0.3em", textTransform: "uppercase", color: GREEN, fontWeight: 700, fontFamily: "'Libre Franklin', Arial, sans-serif" }}>
      {text}
    </div>
  );

  const renderSlide = (slide) => {
    switch (slide.type) {
      case "cover":
        return (
          <div style={{ height: "100%", position: "relative", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "3% 7%" }}>
            <div style={{ position: "absolute", top: "5%", right: "4%", width: "min(9vw, 108px)", height: "min(9vw, 108px)", borderRadius: "50%", border: `2px solid ${RED}`, display: "flex", alignItems: "center", justifyContent: "center", transform: "rotate(-10deg)", opacity: 0.8 }}>
              <div style={{ textAlign: "center", color: RED, fontSize: "clamp(7px, 0.8vw, 10px)", letterSpacing: "0.12em", textTransform: "uppercase", lineHeight: 1.5, fontWeight: 700, fontFamily: "'Libre Franklin', Arial, sans-serif" }}>
                Prepared<br />{new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}<br />{new Date().getFullYear()}
              </div>
            </div>
            <div style={{ fontSize: "clamp(9px, 1vw, 12px)", letterSpacing: "0.35em", textTransform: "uppercase", color: RED, fontWeight: 700, fontFamily: "'Libre Franklin', Arial, sans-serif" }}>
              Prepared exclusively for the property owner
            </div>
            <h1 className="fraunces" style={{ fontSize: "clamp(26px, 4.4vw, 54px)", fontWeight: 700, color: GREEN, margin: "1.5% 0 0" }}>
              Comparative Market Analysis
            </h1>
            <div className="fraunces" style={{ fontSize: "clamp(15px, 2vw, 25px)", color: INK, marginTop: "1.2%" }}>
              {subject.address} · {subject.city}
            </div>
            <div style={{ fontSize: "clamp(11px, 1.2vw, 14px)", color: MUTE, marginTop: "0.8%" }}>
              {subject.beds} bed · {subject.baths} bath · {(subject.sqft || 0).toLocaleString()} sqft · {subject.lot} lot · built {subject.year}
            </div>
            {subject.photo ? (
              <img src={subject.photo} alt={subject.address} style={{ marginTop: "2.5%", width: "50%", maxHeight: "34%", objectFit: "cover", border: `1.5px solid ${BRASS}` }} />
            ) : (
              <div className="fraunces" style={{ marginTop: "3.5%", fontSize: "clamp(34px, 5vw, 64px)", color: BRASS, opacity: 0.55, lineHeight: 1 }}>
                ⌂
              </div>
            )}
            <div style={{ width: "26%", height: 1.5, background: BRASS, margin: "3% 0 2%" }} />
            <div style={{ fontSize: "clamp(11px, 1.2vw, 14px)", color: MUTE }}>
              Prepared by <span style={{ color: INK, fontWeight: 600 }}>{agent.name}</span> · {agent.brokerage}
            </div>
            <div style={{ fontSize: "clamp(10px, 1.05vw, 12px)", color: RED, marginTop: "0.6%", letterSpacing: "0.08em" }}>
              {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </div>
          </div>
        );
      case "position":
        return (
          <div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "4.5% 8%" }}>
            {eyebrow("Suggested market position")}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div className="fraunces" style={{ textAlign: "center", fontSize: "clamp(38px, 6.2vw, 84px)", fontWeight: 700, color: RED, lineHeight: 1 }}>
                {fmt(mid)}
              </div>
              <div style={{ textAlign: "center", fontSize: "clamp(9px, 1.05vw, 13px)", letterSpacing: "0.25em", textTransform: "uppercase", color: MUTE, marginTop: "1.2%", fontFamily: "'Libre Franklin', Arial, sans-serif", fontWeight: 600 }}>
                Recommended list price
              </div>

              {/* Gauge */}
              <div style={{ width: "72%", margin: "5% auto 0", position: "relative" }}>
                <div style={{ position: "relative", height: 9, background: "#D8CCAC", borderRadius: 5 }}>
                  <div style={{ position: "absolute", left: "6%", right: "6%", top: 0, bottom: 0, background: `linear-gradient(90deg, ${BRASS}, ${GREEN})`, borderRadius: 5 }} />
                  <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)", width: 26, height: 26, borderRadius: "50%", background: RED, border: `3.5px solid ${PARCH}`, boxShadow: "0 2px 6px rgba(0,0,0,0.3)" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "2.5%" }}>
                  <div>
                    <div className="fraunces" style={{ fontSize: "clamp(17px, 2.3vw, 30px)", fontWeight: 600, color: INK }}>{fmt(lo)}</div>
                    <div style={{ fontSize: "clamp(8px, 0.95vw, 11px)", letterSpacing: "0.18em", color: MUTE, fontFamily: "'Libre Franklin', Arial, sans-serif" }}>LOW</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className="fraunces" style={{ fontSize: "clamp(17px, 2.3vw, 30px)", fontWeight: 600, color: INK }}>{fmt(hi)}</div>
                    <div style={{ fontSize: "clamp(8px, 0.95vw, 11px)", letterSpacing: "0.18em", color: MUTE, fontFamily: "'Libre Franklin', Arial, sans-serif" }}>HIGH</div>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ textAlign: "center", fontSize: "clamp(11px, 1.15vw, 14px)", color: MUTE, fontStyle: "italic", borderTop: `1px solid ${BRASS}`, paddingTop: "1.8%" }}>
              Based on {adjusted.length} adjusted comparable sale{adjusted.length !== 1 ? "s" : ""} selected by {agent.name}
            </div>
          </div>
        );
      case "map":
        return (
          <div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "3.5% 5% 3%" }}>
            {eyebrow("Comparable locations")}
            <div ref={mapDivRef} style={{ flex: 1, minHeight: 0, marginTop: "1.2%", border: `1.5px solid ${BRASS}` }} />
            <div style={{ flexShrink: 0, fontSize: "clamp(9px, 1vw, 12px)", color: MUTE, fontStyle: "italic", paddingTop: 6 }}>
              S = subject property · numbered pins are comparable sales · click a pin for details · drag and zoom · switch to Overhead for satellite view
            </div>
          </div>
        );
      case "comp": {
        const c = adjusted[slide.i];
        if (!c) return null;
        return (
          <div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "4% 6%" }}>
            {eyebrow("Comparable sale")}
            <div className="fraunces" style={{ fontSize: "clamp(20px, 2.8vw, 36px)", fontWeight: 700, color: INK, marginTop: "1%" }}>
              {slide.i + 1}. {c.address}
            </div>
            <div style={{ fontSize: "clamp(11px, 1.3vw, 15px)", color: MUTE, marginTop: 4 }}>
              {c.beds} bd / {c.baths} ba · {(c.sqft || 0).toLocaleString()} sqft · sold {c.sold}
            </div>
            <div style={{ flex: 1, display: "flex", gap: "4%", marginTop: "2.5%", minHeight: 0 }}>
              <div style={{ flex: c.photo ? 1.4 : 1, background: CARD, padding: "2.5% 3.5%", alignSelf: "flex-start", width: "100%" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "clamp(13px, 1.5vw, 18px)", fontWeight: 700, color: INK, padding: "6px 0" }}>
                  <span>Sale price</span><span>{fmt(c.price)}</span>
                </div>
                {(c.adjustments || []).map((a, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "clamp(11px, 1.25vw, 15px)", color: MUTE, padding: "4px 0" }}>
                    <span>{a.label}</span>
                    <span style={{ color: a.amount < 0 ? RED : GREEN, fontWeight: 600 }}>
                      {a.amount >= 0 ? "+" : "−"}{fmt(Math.abs(a.amount))}
                    </span>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "clamp(13px, 1.6vw, 19px)", fontWeight: 700, color: GREEN, padding: "8px 0 2px", borderTop: `1px dashed ${BRASS}`, marginTop: 6 }}>
                  <span>Adjusted value</span><span>{fmt(c.adjValue)}</span>
                </div>
              </div>
              {c.photo && (
                <div style={{ flex: 1, minHeight: 0 }}>
                  <img src={c.photo} alt={c.address} style={{ width: "100%", height: "100%", objectFit: "cover", border: `1.5px solid ${BRASS}` }} />
                </div>
              )}
            </div>
          </div>
        );
      }
      case "strategy":
        return (
          <div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "5% 7%" }}>
            {eyebrow("Pricing strategy")}
            <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
              <div style={{ borderLeft: `4px solid ${BRASS}`, paddingLeft: "3%" }}>
                <p className="fraunces" style={{ fontSize: "clamp(15px, 2vw, 25px)", lineHeight: 1.65, color: INK, margin: 0 }}>
                  {adjusted.length} recent sale{adjusted.length !== 1 ? "s" : ""} establish a clear band for this home. After adjusting each comparable for condition, size, and location factors, the indicated value range runs from {fmt(lo)} to {fmt(hi)}. Listing at {fmt(mid)} positions the home to draw strong early attention while leaving room for competitive offers.
                </p>
              </div>
            </div>
          </div>
        );
      case "close":
        return (
          <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "5% 8%" }}>
            <div className="fraunces" style={{ fontSize: "clamp(24px, 3.4vw, 44px)", fontWeight: 700, color: GREEN }}>{agent.name}</div>
            <div style={{ fontSize: "clamp(12px, 1.4vw, 17px)", color: MUTE, marginTop: 8 }}>{agent.brokerage} · {agent.license}</div>
            <div style={{ fontSize: "clamp(12px, 1.4vw, 17px)", color: MUTE, marginTop: 4 }}>{agent.phone}</div>
            <p style={{ fontSize: "clamp(8px, 0.9vw, 11px)", color: "#8A7E63", lineHeight: 1.6, marginTop: "6%", fontStyle: "italic", maxWidth: "80%" }}>
              This comparative market analysis reflects the professional opinion of the preparing agent based on comparable sales they selected. It is not an appraisal and was not prepared by a licensed appraiser. Value conclusions are the agent's own.
            </p>
          </div>
        );
      default:
        return null;
    }
  };

  const barBtn = (label, onClick, opts = {}) => (
    <button
      onClick={onClick}
      disabled={opts.disabled}
      style={{
        padding: "7px 14px", fontSize: 12, fontWeight: 600, cursor: opts.disabled ? "wait" : "pointer",
        borderRadius: 3, border: `1px solid ${opts.solid ? BRASS : "#2E5540"}`,
        background: opts.solid ? BRASS : "transparent",
        color: opts.solid ? DARK : "#8FAE9B", whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: DARK, zIndex: 9999, display: "flex", flexDirection: "column", fontFamily: "'Libre Franklin', Arial, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Libre+Franklin:wght@400;500;600&display=swap');
        .fraunces { font-family: 'Fraunces', Georgia, serif; }
      `}</style>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />

      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "10px 16px", flexWrap: "wrap" }}>
        <div className="fraunces" style={{ color: PARCH, fontSize: 16, fontWeight: 700 }}>
          DeedSheet <span style={{ color: "#8FAE9B", fontWeight: 400, fontSize: 12 }}>· {subject.address}</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {onShare && barBtn(
            shareState?.busy ? "Creating link…" : shareState?.copied ? "Link copied!" : "Share link",
            onShare,
            { solid: true, disabled: shareState?.busy }
          )}
          {onPptx && barBtn(pptxBusy ? "Building…" : "Download PPTX", onPptx, { disabled: pptxBusy })}
          {onExit && barBtn("Exit", onExit)}
        </div>
      </div>
      {shareState?.url && (
        <div style={{ padding: "0 16px 8px", fontSize: 12, color: "#D9C48F", wordBreak: "break-all" }}>
          Share link (copied to clipboard): {shareState.url}
        </div>
      )}
      {shareState?.error && (
        <div style={{ padding: "0 16px 8px", fontSize: 12, color: "#E08A7A" }}>
          Share failed: {shareState.error}
        </div>
      )}

      {/* Slide */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 60px 10px", minHeight: 0 }}>
        <div style={{ width: "min(100%, 170vh)", height: "100%", maxHeight: "min(100%, 56vw)", background: PARCH, position: "relative" }}>
          <div style={{ position: "absolute", inset: 8, border: `2.5px double ${GREEN}`, overflow: "hidden" }}>
            {renderSlide(slides[idx])}
          </div>
        </div>
      </div>

      {/* Nav */}
      <button onClick={prev} disabled={idx === 0} aria-label="Previous slide"
        style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 42, height: 42, borderRadius: "50%", border: "1px solid #2E5540", background: "rgba(0,0,0,0.25)", color: idx === 0 ? "#3E5A4A" : "#D9C48F", fontSize: 20, cursor: idx === 0 ? "default" : "pointer" }}>
        ‹
      </button>
      <button onClick={next} disabled={idx === slides.length - 1} aria-label="Next slide"
        style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", width: 42, height: 42, borderRadius: "50%", border: "1px solid #2E5540", background: "rgba(0,0,0,0.25)", color: idx === slides.length - 1 ? "#3E5A4A" : "#D9C48F", fontSize: 20, cursor: idx === slides.length - 1 ? "default" : "pointer" }}>
        ›
      </button>
      <div style={{ textAlign: "center", padding: "6px 0 12px", color: "#8FAE9B", fontSize: 12 }}>
        {idx + 1} / {slides.length} · use ← → keys
      </div>
    </div>
  );
}
