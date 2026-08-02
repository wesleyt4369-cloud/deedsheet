"use client";

// Full-screen slide presentation in the deed aesthetic.
// Used both inside the app (present + edit mode) and on public share links (/p/[id]).

import React, { useState, useEffect, useMemo, useRef } from "react";

const fmt = (n) =>
  (Number(n) || 0).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const GREEN = "#1F3D2B", DARK = "#132719", DARKER = "#0E1F14", PARCH = "#F2ECDC", CARD = "#E7DDC2",
  BRASS = "#A8853C", RED = "#8E3B2F", INK = "#26221A", MUTE = "#6B6252", SAGE = "#8FAE9B";

export default function Presentation({
  subject, agent, comps, mapPoints, geoKey, netSheet,
  deck, onDeckChange, editable,
  onExit, onShare, shareState, onPptx, pptxBusy,
}) {
  const [editing, setEditing] = useState(false);
  const d = deck || { hidden: {}, text: {}, custom: [] };

  const setText = (key, value) => {
    if (!onDeckChange) return;
    onDeckChange({ ...d, text: { ...(d.text || {}), [key]: value } });
  };
  const toggleHidden = (key) => {
    if (!onDeckChange) return;
    const hidden = { ...(d.hidden || {}) };
    if (hidden[key]) delete hidden[key]; else hidden[key] = true;
    onDeckChange({ ...d, hidden });
  };
  const addCustomSlide = (afterKey) => {
    if (!onDeckChange) return;
    const id = Math.random().toString(36).slice(2, 9);
    onDeckChange({
      ...d,
      custom: [...(d.custom || []), { id, after: afterKey, title: "New slide", body: "Click this text to edit it." }],
    });
  };
  const updateCustom = (id, field, value) => {
    if (!onDeckChange) return;
    onDeckChange({ ...d, custom: (d.custom || []).map((c) => (c.id === id ? { ...c, [field]: value } : c)) });
  };
  const deleteCustom = (id) => {
    if (!onDeckChange) return;
    onDeckChange({ ...d, custom: (d.custom || []).filter((c) => c.id !== id) });
  };

  // Inline editable text. Plain function (not a component) so the cursor never jumps.
  const ed = (tkey, defText, style = {}, opts = {}) => {
    const value = (d.text || {})[tkey] ?? defText;
    const Tag = opts.block ? "div" : "span";
    if (!editing) return <Tag className={opts.className} style={style}>{value}</Tag>;
    return (
      <Tag
        className={`${opts.className || ""} ds-ed`}
        style={style}
        contentEditable
        suppressContentEditableWarning
        spellCheck={false}
        onBlur={(e) => setText(tkey, e.currentTarget.textContent)}
      >
        {value}
      </Tag>
    );
  };

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

  const ns = netSheet || {};
  const netBase = Number(ns.priceOverride) || mid;
  const netLines = ns.enabled
    ? [
        [`Commission (${ns.commissionPct}%)`, Math.round((netBase * (Number(ns.commissionPct) || 0)) / 100)],
        [`Title, escrow & closing (${ns.closingPct}%)`, Math.round((netBase * (Number(ns.closingPct) || 0)) / 100)],
        [`Transfer tax (${ns.transferPct}%)`, Math.round((netBase * (Number(ns.transferPct) || 0)) / 100)],
        ["Mortgage payoff", Number(ns.payoff) || 0],
        ["Repairs / seller credits", Number(ns.credits) || 0],
      ].filter((r) => r[1] > 0)
    : [];
  const netProceeds = netBase - netLines.reduce((s, r) => s + r[1], 0);

  const strategyDefault = `${adjusted.length} recent sale${adjusted.length !== 1 ? "s" : ""} establish a clear band for this home. After adjusting each comparable for condition, size, and location factors, the indicated value range runs from ${fmt(lo)} to ${fmt(hi)}. Listing at ${fmt(mid)} positions the home to draw strong early attention while leaving room for competitive offers.`;

  const slides = useMemo(() => {
    const bs = [{ type: "cover", key: "cover" }];
    if (agent.introEnabled !== false && (agent.photo || agent.bio)) bs.push({ type: "intro", key: "intro" });
    bs.push({ type: "position", key: "position" });
    if (mapPoints && geoKey) bs.push({ type: "map", key: "map" });
    adjusted.forEach((_, i) => bs.push({ type: "comp", i, key: `comp${i}` }));
    bs.push({ type: "strategy", key: "strategy" });
    if (ns.enabled) bs.push({ type: "net", key: "net" });
    bs.push({ type: "close", key: "close" });

    const customs = d.custom || [];
    const out = [];
    bs.forEach((s) => {
      out.push(s);
      customs.filter((c) => c.after === s.key).forEach((c) => out.push({ type: "custom", id: c.id, key: `custom:${c.id}` }));
    });
    const placed = new Set(out.filter((s) => s.type === "custom").map((s) => s.id));
    const orphans = customs.filter((c) => !placed.has(c.id));
    if (orphans.length) {
      const ci = out.findIndex((s) => s.key === "close");
      out.splice(ci < 0 ? out.length : ci, 0, ...orphans.map((c) => ({ type: "custom", id: c.id, key: `custom:${c.id}` })));
    }
    return editing ? out : out.filter((s) => !(d.hidden || {})[s.key]);
  }, [adjusted, mapPoints, geoKey, ns.enabled, d, editing, agent]);

  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (idx > slides.length - 1) setIdx(Math.max(0, slides.length - 1));
  }, [slides.length, idx]);
  const next = () => setIdx((v) => Math.min(v + 1, slides.length - 1));
  const prev = () => setIdx((v) => Math.max(v - 1, 0));

  // Arrow keys only — never space, so typing in edit mode is safe
  useEffect(() => {
    const onKey = (e) => {
      const t = e.target;
      if (t && (t.isContentEditable || t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      if (e.key === "ArrowRight") { e.preventDefault(); next(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
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
      setTimeout(() => map.invalidateSize(), 120);
      mapObjRef.current = map;
    })();
    return () => {
      cancelled = true;
      if (mapObjRef.current) { mapObjRef.current.remove(); mapObjRef.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMapSlide, mapPoints, geoKey]);

  const eyebrowStyle = {
    fontSize: "clamp(9px, 1.05vw, 12px)", letterSpacing: "0.28em", textTransform: "uppercase",
    color: GREEN, fontWeight: 700, fontFamily: "'Libre Franklin', Arial, sans-serif",
  };
  const eyebrow = (text, tkey) => (
    <div style={{ display: "flex", alignItems: "center", gap: "1.4%" }}>
      {ed(tkey, text, eyebrowStyle, {})}
      <div style={{ flex: 1, height: 1, background: BRASS, opacity: 0.5 }} />
    </div>
  );

  const renderSlide = (slide) => {
    if (!slide) return null;
    switch (slide.type) {
      case "cover":
        return (
          <div style={{ height: "100%", position: "relative", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "5% 8%" }}>
            <div style={{ position: "absolute", top: "6%", right: "5%", width: "min(8.5vw, 100px)", height: "min(8.5vw, 100px)", borderRadius: "50%", border: `2px solid ${RED}`, display: "flex", alignItems: "center", justifyContent: "center", transform: "rotate(-10deg)", opacity: 0.75 }}>
              <div style={{ textAlign: "center", color: RED, fontSize: "clamp(7px, 0.75vw, 9px)", letterSpacing: "0.12em", textTransform: "uppercase", lineHeight: 1.6, fontWeight: 700, fontFamily: "'Libre Franklin', Arial, sans-serif" }}>
                Prepared<br />{new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}<br />{new Date().getFullYear()}
              </div>
            </div>

            {ed("cover.eyebrow", "Prepared exclusively for the property owner",
              { fontSize: "clamp(8px, 0.95vw, 11px)", letterSpacing: "0.34em", textTransform: "uppercase", color: RED, fontWeight: 700, fontFamily: "'Libre Franklin', Arial, sans-serif" },
              { block: true })}

            {ed("cover.title", "Comparative Market Analysis",
              { fontSize: "clamp(24px, 4.1vw, 52px)", fontWeight: 700, color: GREEN, marginTop: "1.6%", lineHeight: 1.08, letterSpacing: "-0.01em" },
              { block: true, className: "fraunces" })}

            <div className="fraunces" style={{ fontSize: "clamp(14px, 1.9vw, 23px)", color: INK, marginTop: "1.5%" }}>
              {subject.address} · {subject.city}
            </div>
            <div style={{ fontSize: "clamp(10px, 1.1vw, 13px)", color: MUTE, marginTop: "0.8%" }}>
              {subject.beds} bed · {subject.baths} bath · {(subject.sqft || 0).toLocaleString()} sqft · {subject.lot} lot · built {subject.year}
            </div>

            {subject.photo && (
              <img src={subject.photo} alt={subject.address}
                style={{ marginTop: "2.6%", width: "44%", maxHeight: "28%", objectFit: "cover", border: `1.5px solid ${BRASS}`, boxShadow: "0 6px 18px rgba(0,0,0,0.14)" }} />
            )}

            <div style={{ width: 52, height: 1.5, background: BRASS, margin: "3.2% 0 2.6%" }} />

            {agent.logo && (
              <img src={agent.logo} alt={agent.brokerage}
                style={{ maxWidth: "26%", maxHeight: "13%", objectFit: "contain", marginBottom: "2%" }} />
            )}

            <div style={{ fontSize: "clamp(10px, 1.15vw, 13px)", color: MUTE }}>
              Prepared by <span style={{ color: INK, fontWeight: 600 }}>{agent.name}</span> · {agent.brokerage}
            </div>
            <div style={{ fontSize: "clamp(9px, 1vw, 11px)", color: RED, marginTop: 5, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </div>
          </div>
        );

      case "intro":
        return (
          <div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "5% 7%" }}>
            {eyebrow("Your agent", "intro.eyebrow")}
            <div style={{ flex: 1, display: "flex", gap: "5%", alignItems: "center", marginTop: "2.5%", minHeight: 0 }}>
              {agent.photo && (
                <div style={{ flex: "0 0 33%", maxHeight: "100%" }}>
                  <img src={agent.photo} alt={agent.name}
                    style={{ width: "100%", aspectRatio: "4 / 5", objectFit: "cover", border: `1.5px solid ${BRASS}`, boxShadow: "0 8px 22px rgba(0,0,0,0.16)" }} />
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="fraunces" style={{ fontSize: "clamp(20px, 2.9vw, 38px)", fontWeight: 700, color: GREEN, letterSpacing: "-0.01em" }}>
                  {agent.name}
                </div>
                <div style={{ fontSize: "clamp(10px, 1.2vw, 14px)", color: MUTE, marginTop: 6 }}>
                  {agent.brokerage} · {agent.license}
                </div>
                <div style={{ width: 46, height: 1.5, background: BRASS, margin: "3.5% 0" }} />
                {ed("intro.body", agent.bio || "Add a short bio in Agent inputs — a couple of lines about your experience in this neighborhood.",
                  { fontSize: "clamp(11px, 1.5vw, 19px)", lineHeight: 1.75, color: INK, whiteSpace: "pre-wrap" },
                  { block: true, className: "fraunces" })}
                <div style={{ fontSize: "clamp(11px, 1.3vw, 16px)", color: INK, fontWeight: 600, marginTop: "4%" }}>
                  {agent.phone}
                </div>
              </div>
            </div>
          </div>
        );

      case "position":
        return (
          <div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "5% 8%" }}>
            {eyebrow("Suggested market position", "position.eyebrow")}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", minHeight: 0 }}>
              <div className="fraunces" style={{ textAlign: "center", fontSize: "clamp(36px, 6vw, 82px)", fontWeight: 700, color: RED, lineHeight: 1, letterSpacing: "-0.02em" }}>
                {fmt(mid)}
              </div>
              <div style={{ textAlign: "center", fontSize: "clamp(8px, 1vw, 12px)", letterSpacing: "0.3em", textTransform: "uppercase", color: MUTE, marginTop: "1.6%", fontFamily: "'Libre Franklin', Arial, sans-serif", fontWeight: 600 }}>
                Recommended list price
              </div>
              <div style={{ width: "70%", margin: "6% auto 0" }}>
                <div style={{ position: "relative", height: 8, background: "#DCD0B2", borderRadius: 5 }}>
                  <div style={{ position: "absolute", left: "7%", right: "7%", top: 0, bottom: 0, background: `linear-gradient(90deg, ${BRASS}, ${GREEN})`, borderRadius: 5 }} />
                  <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)", width: 24, height: 24, borderRadius: "50%", background: RED, border: `3.5px solid ${PARCH}`, boxShadow: "0 2px 8px rgba(0,0,0,0.28)" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "3%" }}>
                  <div>
                    <div className="fraunces" style={{ fontSize: "clamp(16px, 2.15vw, 28px)", fontWeight: 600, color: INK }}>{fmt(lo)}</div>
                    <div style={{ fontSize: "clamp(7px, 0.9vw, 10px)", letterSpacing: "0.22em", color: MUTE, fontFamily: "'Libre Franklin', Arial, sans-serif", marginTop: 3 }}>LOW</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className="fraunces" style={{ fontSize: "clamp(16px, 2.15vw, 28px)", fontWeight: 600, color: INK }}>{fmt(hi)}</div>
                    <div style={{ fontSize: "clamp(7px, 0.9vw, 10px)", letterSpacing: "0.22em", color: MUTE, fontFamily: "'Libre Franklin', Arial, sans-serif", marginTop: 3 }}>HIGH</div>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ textAlign: "center", fontSize: "clamp(10px, 1.1vw, 13px)", color: MUTE, fontStyle: "italic" }}>
              Based on {adjusted.length} adjusted comparable sale{adjusted.length !== 1 ? "s" : ""} selected by {agent.name}
            </div>
          </div>
        );

      case "map":
        return (
          <div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "4% 5.5% 3.2%" }}>
            {eyebrow("Comparable locations", "map.eyebrow")}
            <div ref={mapDivRef} style={{ flex: 1, minHeight: 0, marginTop: "1.8%", border: `1.5px solid ${BRASS}`, boxShadow: "0 4px 14px rgba(0,0,0,0.1)" }} />
            <div style={{ flexShrink: 0, fontSize: "clamp(8px, 0.95vw, 11px)", color: MUTE, fontStyle: "italic", paddingTop: 8 }}>
              S = subject property · numbered pins are comparable sales · click a pin for details · drag and zoom · switch to Overhead for satellite view
            </div>
          </div>
        );

      case "comp": {
        const c = adjusted[slide.i];
        if (!c) return null;
        return (
          <div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "4.5% 7%" }}>
            {eyebrow("Comparable sale", `comp${slide.i}.eyebrow`)}
            <div style={{ display: "flex", alignItems: "baseline", gap: "1.5%", marginTop: "2%" }}>
              <div className="fraunces" style={{ fontSize: "clamp(15px, 2vw, 26px)", fontWeight: 700, color: BRASS }}>{slide.i + 1}</div>
              <div className="fraunces" style={{ fontSize: "clamp(19px, 2.7vw, 35px)", fontWeight: 700, color: INK, letterSpacing: "-0.01em" }}>{c.address}</div>
            </div>
            <div style={{ fontSize: "clamp(10px, 1.2vw, 14px)", color: MUTE, marginTop: 6, letterSpacing: "0.02em" }}>
              {c.beds} bd / {c.baths} ba · {(c.sqft || 0).toLocaleString()} sqft · sold {c.sold}
            </div>
            <div style={{ flex: 1, display: "flex", gap: "3.5%", marginTop: "3%", minHeight: 0 }}>
              <div style={{ flex: c.photo ? 1.45 : 1, minWidth: 0 }}>
                <div style={{ background: CARD, padding: "3.5% 4%" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "clamp(12px, 1.45vw, 18px)", fontWeight: 700, color: INK, paddingBottom: 8 }}>
                    <span>Sale price</span><span>{fmt(c.price)}</span>
                  </div>
                  {(c.adjustments || []).map((a, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "clamp(10px, 1.2vw, 14px)", color: MUTE, padding: "5px 0" }}>
                      <span>{a.label}</span>
                      <span style={{ color: a.amount < 0 ? RED : GREEN, fontWeight: 600 }}>
                        {a.amount >= 0 ? "+" : "−"}{fmt(Math.abs(a.amount))}
                      </span>
                    </div>
                  ))}
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "clamp(13px, 1.6vw, 20px)", fontWeight: 700, color: GREEN, paddingTop: 10, marginTop: 8, borderTop: `1px dashed ${BRASS}` }}>
                    <span>Adjusted value</span><span>{fmt(c.adjValue)}</span>
                  </div>
                </div>
              </div>
              {c.photo && (
                <div style={{ flex: 1, minHeight: 0, minWidth: 0 }}>
                  <img src={c.photo} alt={c.address} style={{ width: "100%", height: "100%", objectFit: "cover", border: `1.5px solid ${BRASS}`, boxShadow: "0 4px 14px rgba(0,0,0,0.1)" }} />
                </div>
              )}
            </div>
          </div>
        );
      }

      case "strategy":
        return (
          <div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "5% 8%" }}>
            {eyebrow("Pricing strategy", "strategy.eyebrow")}
            <div style={{ flex: 1, display: "flex", alignItems: "center", minHeight: 0, overflow: "auto" }}>
              <div style={{ borderLeft: `4px solid ${BRASS}`, paddingLeft: "3.5%" }}>
                {ed("strategy.body", strategyDefault,
                  { fontSize: "clamp(14px, 1.95vw, 25px)", lineHeight: 1.7, color: INK, whiteSpace: "pre-wrap" },
                  { block: true, className: "fraunces" })}
              </div>
            </div>
          </div>
        );

      case "net":
        return (
          <div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "5% 10%" }}>
            {eyebrow("Estimated seller net proceeds", "net.eyebrow")}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", minHeight: 0 }}>
              <div style={{ background: CARD, padding: "3.5% 5%" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "clamp(12px, 1.5vw, 19px)", fontWeight: 700, color: INK, paddingBottom: 10 }}>
                  <span>Sale price</span><span>{fmt(netBase)}</span>
                </div>
                {netLines.map(([label, v]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: "clamp(10px, 1.25vw, 16px)", color: MUTE, padding: "6px 0 6px 4%" }}>
                    <span>{label}</span>
                    <span style={{ color: RED, fontWeight: 600 }}>−{fmt(v)}</span>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: "clamp(15px, 2.1vw, 27px)", fontWeight: 700, color: GREEN, paddingTop: 14, marginTop: 12, borderTop: `1.5px solid ${BRASS}` }}>
                  <span>Estimated net to seller</span><span>{fmt(netProceeds)}</span>
                </div>
              </div>
              <div style={{ fontSize: "clamp(8px, 0.9vw, 11px)", color: "#8A7E63", fontStyle: "italic", marginTop: "2.5%", textAlign: "center" }}>
                Estimates only — actual costs vary by transaction. Final figures come from escrow and the seller's lender.
              </div>
            </div>
          </div>
        );

      case "custom": {
        const c = (d.custom || []).find((x) => x.id === slide.id);
        if (!c) return null;
        const box = (field, value, style) =>
          editing ? (
            <div className="ds-ed" style={style} contentEditable suppressContentEditableWarning spellCheck={false}
              onBlur={(e) => updateCustom(c.id, field, e.currentTarget.textContent)}>
              {value}
            </div>
          ) : (
            <div style={style}>{value}</div>
          );
        return (
          <div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "5.5% 8%" }}>
            {box("title", c.title, { fontFamily: "'Fraunces', Georgia, serif", fontSize: "clamp(21px, 3.1vw, 40px)", fontWeight: 700, color: GREEN, letterSpacing: "-0.01em" })}
            <div style={{ width: 62, height: 1.5, background: BRASS, margin: "2.8% 0" }} />
            <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
              {box("body", c.body, { fontFamily: "'Fraunces', Georgia, serif", fontSize: "clamp(12px, 1.65vw, 21px)", lineHeight: 1.75, color: INK, whiteSpace: "pre-wrap" })}
            </div>
          </div>
        );
      }

      case "close":
        return (
          <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "6% 9%" }}>
            <div style={{ fontSize: "clamp(8px, 0.95vw, 11px)", letterSpacing: "0.32em", textTransform: "uppercase", color: RED, fontWeight: 700, fontFamily: "'Libre Franklin', Arial, sans-serif", marginBottom: "3%" }}>
              Thank you
            </div>
            {agent.logo && (
              <img src={agent.logo} alt={agent.brokerage} style={{ maxWidth: "22%", maxHeight: "16%", objectFit: "contain", marginBottom: "3%" }} />
            )}
            <div className="fraunces" style={{ fontSize: "clamp(23px, 3.3vw, 44px)", fontWeight: 700, color: GREEN, letterSpacing: "-0.01em" }}>{agent.name}</div>
            <div style={{ width: 46, height: 1.5, background: BRASS, margin: "3% 0" }} />
            <div style={{ fontSize: "clamp(11px, 1.35vw, 17px)", color: MUTE }}>{agent.brokerage} · {agent.license}</div>
            <div style={{ fontSize: "clamp(11px, 1.35vw, 17px)", color: INK, marginTop: 6, fontWeight: 600 }}>{agent.phone}</div>
            <p style={{ fontSize: "clamp(7px, 0.85vw, 10px)", color: "#8A7E63", lineHeight: 1.7, marginTop: "auto", fontStyle: "italic", maxWidth: "78%" }}>
              This comparative market analysis reflects the professional opinion of the preparing agent based on comparable sales they selected. It is not an appraisal and was not prepared by a licensed appraiser. Value conclusions are the agent's own.
            </p>
          </div>
        );
      default:
        return null;
    }
  };

  const slideLabel = (s) =>
    s.type === "cover" ? "Cover"
    : s.type === "intro" ? "Intro"
    : s.type === "position" ? "Price"
    : s.type === "map" ? "Map"
    : s.type === "comp" ? `Comp ${s.i + 1}`
    : s.type === "strategy" ? "Strategy"
    : s.type === "net" ? "Net sheet"
    : s.type === "close" ? "Contact"
    : ((d.custom || []).find((c) => c.id === s.id)?.title || "Custom").slice(0, 18);

  return (
    <div style={{ position: "fixed", inset: 0, background: DARK, zIndex: 9999, display: "flex", flexDirection: "column", fontFamily: "'Libre Franklin', Arial, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Libre+Franklin:wght@400;500;600;700&display=swap');
        .fraunces { font-family: 'Fraunces', Georgia, serif; }
        .ds-btn { padding: 8px 15px; font-size: 12.5px; font-weight: 600; border-radius: 4px; cursor: pointer;
          border: 1px solid #2E5540; background: transparent; color: ${SAGE}; transition: all .15s ease; white-space: nowrap; }
        .ds-btn:hover:not(:disabled) { border-color: ${BRASS}; color: ${PARCH}; background: rgba(168,133,60,.1); }
        .ds-btn:disabled { opacity: .55; cursor: default; }
        .ds-btn-solid { background: ${BRASS}; border-color: ${BRASS}; color: ${DARKER}; }
        .ds-btn-solid:hover:not(:disabled) { background: #b8934a; color: ${DARKER}; }
        .ds-nav { position: absolute; top: 50%; transform: translateY(-50%); width: 44px; height: 44px; border-radius: 50%;
          border: 1px solid #2E5540; background: rgba(0,0,0,.3); color: ${BRASS}; font-size: 22px; line-height: 1;
          cursor: pointer; transition: all .15s ease; display: flex; align-items: center; justify-content: center; }
        .ds-nav:hover:not(:disabled) { background: ${BRASS}; color: ${DARKER}; border-color: ${BRASS}; }
        .ds-nav:disabled { opacity: .2; cursor: default; }
        .ds-slide { animation: dsIn .28s ease; }
        @keyframes dsIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        .ds-ed { border-radius: 3px; transition: background .12s ease, box-shadow .12s ease; cursor: text; outline: none; }
        .ds-ed:hover { background: rgba(168,133,60,.14); box-shadow: 0 0 0 3px rgba(168,133,60,.14); }
        .ds-ed:focus { background: rgba(168,133,60,.1); box-shadow: 0 0 0 2px ${BRASS}; }
        .ds-chip { display: flex; align-items: center; gap: 7px; padding: 7px 10px; border-radius: 5px; flex-shrink: 0;
          border: 1px solid #2E5540; background: rgba(255,255,255,.02); transition: all .15s ease; }
        .ds-chip:hover { border-color: ${BRASS}; }
        .ds-chip-on { border-color: ${BRASS}; background: rgba(168,133,60,.16); }
        .ds-chip button { background: none; border: none; padding: 0; cursor: pointer; font-family: inherit; }
        .ds-mini { font-size: 10.5px; color: ${SAGE}; opacity: .75; transition: opacity .15s, color .15s; }
        .ds-mini:hover { opacity: 1; color: ${PARCH}; }
        .ds-del:hover { color: #ff9d8a !important; }
        .ds-dot { width: 6px; height: 6px; border-radius: 50%; background: #2E5540; transition: all .2s ease; cursor: pointer; border: none; padding: 0; }
        .ds-dot-on { background: ${BRASS}; width: 18px; border-radius: 3px; }
        .leaflet-container { font-family: 'Libre Franklin', Arial, sans-serif; }
      `}</style>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />

      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 18px", borderBottom: "1px solid rgba(255,255,255,.06)", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          <div className="fraunces" style={{ color: PARCH, fontSize: 17, fontWeight: 700, letterSpacing: "0.01em" }}>DeedSheet</div>
          <div style={{ width: 1, height: 16, background: "#2E5540" }} />
          <div style={{ color: SAGE, fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{subject.address}</div>
          {editing && (
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: DARKER, background: BRASS, padding: "3px 8px", borderRadius: 3 }}>
              Editing
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {editable && (
            <button className={`ds-btn ${editing ? "ds-btn-solid" : ""}`} onClick={() => setEditing(!editing)}>
              {editing ? "Done editing" : "Edit slides"}
            </button>
          )}
          {onShare && (
            <button className={`ds-btn ${shareState?.copied ? "" : "ds-btn-solid"}`} onClick={onShare} disabled={shareState?.busy}>
              {shareState?.busy ? "Creating link…" : shareState?.copied ? "✓ Link copied" : "Share link"}
            </button>
          )}
          {onPptx && <button className="ds-btn" onClick={onPptx} disabled={pptxBusy}>{pptxBusy ? "Building…" : "Download PPTX"}</button>}
          {onExit && <button className="ds-btn" onClick={onExit}>Exit</button>}
        </div>
      </div>

      {shareState?.url && (
        <div style={{ margin: "10px 18px 0", padding: "10px 14px", background: "rgba(168,133,60,.1)", border: `1px solid ${BRASS}`, borderRadius: 5, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: BRASS, fontWeight: 700 }}>Share link</span>
          <span style={{ fontSize: 12.5, color: PARCH, wordBreak: "break-all", flex: 1, minWidth: 200 }}>{shareState.url}</span>
          <span style={{ fontSize: 11.5, color: SAGE }}>Copied to clipboard · anyone with this link can view</span>
        </div>
      )}
      {shareState?.error && (
        <div style={{ margin: "10px 18px 0", padding: "10px 14px", background: "rgba(142,59,47,.18)", border: "1px solid #8E3B2F", borderRadius: 5, fontSize: 12.5, color: "#F0B5AB" }}>
          Share failed: {shareState.error}
        </div>
      )}

      {/* Stage */}
      <div style={{ flex: 1, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", padding: "18px 66px", minHeight: 0 }}>
        <div className="ds-slide" key={slides[idx]?.key || idx}
          style={{ aspectRatio: "16 / 9", width: "min(100%, 168vh)", maxHeight: "100%", background: PARCH, boxShadow: "0 20px 60px rgba(0,0,0,.5)", position: "relative", opacity: (d.hidden || {})[slides[idx]?.key] ? 0.55 : 1 }}>
          <div style={{ position: "absolute", inset: 9, border: `2.5px double ${GREEN}`, overflow: "hidden" }}>
            {renderSlide(slides[idx])}
          </div>
          {editing && (d.hidden || {})[slides[idx]?.key] && (
            <div style={{ position: "absolute", top: 14, left: 14, background: RED, color: PARCH, fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", padding: "4px 9px", borderRadius: 3 }}>
              Hidden from presentation
            </div>
          )}
        </div>
        <button className="ds-nav" style={{ left: 12 }} onClick={prev} disabled={idx === 0} aria-label="Previous slide">‹</button>
        <button className="ds-nav" style={{ right: 12 }} onClick={next} disabled={idx === slides.length - 1} aria-label="Next slide">›</button>
      </div>

      {/* Editor filmstrip */}
      {editing && (
        <div style={{ borderTop: "1px solid rgba(255,255,255,.07)", padding: "11px 16px", display: "flex", gap: 8, alignItems: "center", overflowX: "auto" }}>
          {slides.map((s, i) => {
            const isHidden = !!(d.hidden || {})[s.key];
            return (
              <div key={s.key} className={`ds-chip ${i === idx ? "ds-chip-on" : ""}`} style={{ opacity: isHidden ? 0.5 : 1 }}>
                <button onClick={() => setIdx(i)}
                  style={{ color: PARCH, fontSize: 12, textDecoration: isHidden ? "line-through" : "none", display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ color: BRASS, fontWeight: 700, fontSize: 10.5 }}>{i + 1}</span>
                  {slideLabel(s)}
                </button>
                <button className="ds-mini" onClick={() => toggleHidden(s.key)} title={isHidden ? "Show in presentation" : "Hide from presentation"}>
                  {isHidden ? "show" : "hide"}
                </button>
                {s.type === "custom" && (
                  <button className="ds-mini ds-del" onClick={() => deleteCustom(s.id)} title="Delete this slide" style={{ color: "#E08A7A" }}>✕</button>
                )}
              </div>
            );
          })}
          <button className="ds-btn" style={{ borderStyle: "dashed", borderColor: BRASS, color: "#D9C48F" }}
            onClick={() => addCustomSlide(slides[idx]?.key)}>
            + Add slide here
          </button>
        </div>
      )}

      {/* Footer */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, padding: "10px 0 14px" }}>
        {slides.length <= 14 && (
          <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
            {slides.map((s, i) => (
              <button key={s.key} className={`ds-dot ${i === idx ? "ds-dot-on" : ""}`} onClick={() => setIdx(i)} aria-label={`Go to slide ${i + 1}`} />
            ))}
          </div>
        )}
        <div style={{ color: SAGE, fontSize: 11.5, opacity: .8 }}>
          {idx + 1} / {slides.length} · ← → to navigate{editing ? " · click any text on the slide to edit" : ""}
        </div>
      </div>
    </div>
  );
}
