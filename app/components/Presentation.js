"use client";

// Full-screen slide presentation in the deed aesthetic.
// Used both inside the app (present + edit mode) and on public share links (/p/[id]).

import React, { useState, useEffect, useMemo, useRef } from "react";
import { THEMES, LABELS } from "../lib/presets";

const fmt = (n) =>
  (Number(n) || 0).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const shortPrice = (n) => {
  const v = Number(n) || 0;
  return v >= 1000000 ? `$${(v / 1000000).toFixed(2).replace(/0$/, "")}M` : `$${Math.round(v / 1000)}K`;
};

const photosOf = (c) => ((c.photos && c.photos.length) ? c.photos : (c.photo ? [c.photo] : []));

const lotOf = (s) => (s.lotSize ? `${Number(s.lotSize).toLocaleString()} ${s.lotUnits || "sqft"}` : (s.lot || ""));

const detailRows = (s) => {
  const money = (v) => (v ? `$${Number(v).toLocaleString()}` : "");
  return [
    ["Property type", s.propertyType],
    ["Bedrooms", s.beds],
    ["Bathrooms", s.baths],
    ["Total sqft", s.sqft ? Number(s.sqft).toLocaleString() : ""],
    ["Living area", s.livingSqft ? `${Number(s.livingSqft).toLocaleString()} sqft` : ""],
    ["Lot size", lotOf(s)],
    ["Lot dimensions", s.lotDimensions],
    ["Year built", s.year],
    ["County", s.county],
    ["Parcel #", s.parcel],
    ["Annual tax", money(s.taxAmount) + (s.taxYear ? ` (${s.taxYear})` : "")],
    ["HOA dues", s.hoaDues ? `${money(s.hoaDues)}/mo` : ""],
    ["Maintenance fee", money(s.maintenanceFee)],
  ].filter(([, v]) => v !== "" && v !== null && v !== undefined && String(v).trim() !== "");
};

const CANVAS_W = 1280, CANVAS_H = 720;

const DARK = "#132719", DARKER = "#0E1F14", SAGE = "#8FAE9B";

export default function Presentation({
  subject, agent, comps, mapPoints, geoKey, netSheet,
  deck, onDeckChange, editable, meta,
  onExit, onShare, shareState, onPptx, pptxBusy,
}) {
  const TH = THEMES[meta?.theme] || THEMES.classic;
  const GREEN = TH.primary, PARCH = TH.bg, CARD = TH.card, BRASS = TH.accent,
    RED = TH.alert, INK = TH.ink, MUTE = TH.mute;
  const TYPE = meta?.type || "seller";
  const L = LABELS[TYPE] || LABELS.seller;
  const SEC = meta?.sections || { intro: true, position: true, map: true, comps: true, strategy: true, net: true };

  // Google-Slides style canvas: on small screens the whole slide scales as one unit
  const [isSmall, setIsSmall] = useState(false);
  const [scale, setScale] = useState(1);
  const [focusMode, setFocusMode] = useState(false);
  const [isLandscapePhone, setIsLandscapePhone] = useState(false);
  const [chromeVisible, setChromeVisible] = useState(true);
  const stageRef = useRef(null);
  const measureRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 900px)");
    const sync = () => setIsSmall(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 1000px) and (orientation: landscape)");
    const sync = () => {
      setIsLandscapePhone(mq.matches);
      // sideways on a phone means presenting — give the slide everything
      setChromeVisible(!mq.matches);
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth, h = el.clientHeight;
      if (!w || !h) return;
      const s = Math.min(w / CANVAS_W, h / CANVAS_H);
      if (!isFinite(s) || s <= 0) return;
      setScale(Math.max(0.1, s));
    };
    const remeasureSoon = () => {
      measure();
      // iOS reports stale sizes mid-rotation, so check again once it settles
      setTimeout(measure, 120);
      setTimeout(measure, 400);
    };
    remeasureSoon();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("orientationchange", remeasureSoon);
    window.addEventListener("resize", measure);
    if (window.visualViewport) window.visualViewport.addEventListener("resize", measure);
    measureRef.current = remeasureSoon;
    return () => {
      ro.disconnect();
      window.removeEventListener("orientationchange", remeasureSoon);
      window.removeEventListener("resize", measure);
      if (window.visualViewport) window.visualViewport.removeEventListener("resize", measure);
    };
  }, [isSmall]);

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
  const addCustomSlide = (afterKey, afterIndex) => {
    if (!onDeckChange) return;
    const id = Math.random().toString(36).slice(2, 9);
    const siblings = (d.custom || []).filter((c) => c.after === afterKey).length;
    onDeckChange({
      ...d,
      custom: [...(d.custom || []), { id, after: afterKey, title: "New slide", body: "Click this text to edit it." }],
    });
    if (typeof afterIndex === "number") setTimeout(() => setIdx(afterIndex + 1 + siblings), 0);
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
    if (SEC.intro && agent.introEnabled !== false && (agent.photo || agent.bio)) bs.push({ type: "intro", key: "intro" });
    if (SEC.details && detailRows(subject).length) bs.push({ type: "details", key: "details" });
    if (SEC.position && adjusted.length) bs.push({ type: "position", key: "position" });
    if (SEC.map && mapPoints && geoKey) bs.push({ type: "map", key: "map" });
    if (SEC.comps) adjusted.forEach((_, i) => bs.push({ type: "comp", i, key: `comp${i}` }));
    if (SEC.strategy && adjusted.length) bs.push({ type: "strategy", key: "strategy" });
    if (SEC.net && ns.enabled) bs.push({ type: "net", key: "net" });
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
  }, [adjusted, mapPoints, geoKey, ns.enabled, d, editing, agent, SEC]);

  const [idx, setIdx] = useState(0);
  const [focusIdx, setFocusIdx] = useState(-1);
  const [detailIdx, setDetailIdx] = useState(null);   // 0 = subject, 1+ = comps
  const [photoIdx, setPhotoIdx] = useState(0);
  useEffect(() => {
    if (idx > slides.length - 1) setIdx(Math.max(0, slides.length - 1));
  }, [slides.length, idx]);
  const next = () => setIdx((v) => Math.min(v + 1, slides.length - 1));
  const prev = () => setIdx((v) => Math.max(v - 1, 0));

  // Chrome appearing/disappearing changes the available space — re-fit the slide
  useEffect(() => {
    const t = setTimeout(() => measureRef.current && measureRef.current(), 60);
    return () => clearTimeout(t);
  }, [chromeVisible, isLandscapePhone, idx, editing]);

  // Swipe to change slides (tablets and phones)
  const touchRef = useRef(null);
  const onTouchStart = (e) => {
    if (detailIdx !== null || editing) return;
    const t = e.touches[0];
    touchRef.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e) => {
    if (!touchRef.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchRef.current.x;
    const dy = t.clientY - touchRef.current.y;
    touchRef.current = null;
    if (Math.abs(dx) < 55 || Math.abs(dy) > Math.abs(dx)) return;
    if (dx < 0) next(); else prev();
  };

  const [isFull, setIsFull] = useState(false);
  const [fsSupported, setFsSupported] = useState(false);
  useEffect(() => {
    setFsSupported(typeof document !== "undefined" && !!document.documentElement?.requestFullscreen);
  }, []);
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFull(true);
      } else {
        await document.exitFullscreen();
        setIsFull(false);
      }
    } catch { /* not supported — ignore */ }
  };
  useEffect(() => {
    const onFs = () => setIsFull(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  // Arrow keys only — never space, so typing in edit mode is safe
  useEffect(() => {
    const onKey = (e) => {
      const t = e.target;
      if (t && (t.isContentEditable || t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      if (detailIdx !== null) {
        if (e.key === "Escape") { e.preventDefault(); setDetailIdx(null); }
        else if (e.key === "ArrowRight") { e.preventDefault(); setPhotoIdx((v) => v + 1); }
        else if (e.key === "ArrowLeft") { e.preventDefault(); setPhotoIdx((v) => Math.max(0, v - 1)); }
        return;
      }
      if (e.key === "ArrowRight") { e.preventDefault(); next(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
      else if (e.key === "Escape" && onExit) onExit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slides.length, onExit, detailIdx]);

  // Interactive map on the map slide
  const mapDivRef = useRef(null);
  const mapObjRef = useRef(null);
  const markersRef = useRef([]);
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
      const smallScreen = typeof window !== "undefined" && window.innerWidth < 760;
      L.control.layers(
        { "Streets": streets, "Overhead (Satellite)": satellite },
        null,
        { collapsed: smallScreen, position: "bottomleft" }
      ).addTo(map);
      const chipHtml = (bg, fg, label, sub) =>
        `<div style="display:flex;flex-direction:column;align-items:center;transform:translateY(-4px);">
           <div style="background:${bg};color:${fg};font-family:Arial,sans-serif;font-weight:700;font-size:12px;
             padding:4px 9px;border-radius:4px;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,.35);
             border:1.5px solid rgba(255,255,255,.85);">${label}</div>
           <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;
             border-top:7px solid ${bg};margin-top:-1px;"></div>
           ${sub ? `<div style="background:rgba(255,255,255,.9);color:#26221A;font-family:Arial,sans-serif;font-weight:700;
             font-size:10px;width:17px;height:17px;border-radius:50%;display:flex;align-items:center;justify-content:center;
             margin-top:2px;box-shadow:0 1px 4px rgba(0,0,0,.3);">${sub}</div>` : ""}
         </div>`;

      const addChip = (lnglat, bg, fg, label, sub, idx, z) => {
        const m = L.marker([lnglat[1], lnglat[0]], {
          icon: L.divIcon({ className: "", html: chipHtml(bg, fg, label, sub), iconSize: [1, 1], iconAnchor: [0, 26] }),
          zIndexOffset: z,
        }).addTo(map);
        m.on("click", () => { setFocusIdx(idx); setPhotoIdx(0); setDetailIdx(idx); });
        return m;
      };

      const markers = [];
      markers.push(addChip(mapPoints.subj, RED, "#FFFFFF", "SUBJECT", "S", 0, 1000));
      (mapPoints.comps || []).forEach((coord, i) => {
        if (!coord || !adjusted[i]) { markers.push(null); return; }
        const c = adjusted[i];
        markers.push(addChip(coord, "#2B2B2B", "#FFFFFF", shortPrice(c.price), String(i + 1), i + 1, 0));
      });
      markersRef.current = markers;

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

  const focusPin = (i) => {
    const map = mapObjRef.current;
    const m = markersRef.current[i];
    if (!map || !m) return;
    setFocusIdx(i);
    setPhotoIdx(0);
    setDetailIdx(i);
    map.flyTo(m.getLatLng(), Math.max(map.getZoom(), 17), { duration: 0.7 });
  };

  const eyebrowStyle = {
    fontSize: "clamp(9px, 1.05cqw, 12px)", letterSpacing: "0.28em", textTransform: "uppercase",
    color: GREEN, fontWeight: 700, fontFamily: "'Libre Franklin', Arial, sans-serif",
  };
  const eyebrow = (text, tkey) => (
    <div style={{ display: "flex", alignItems: "center", gap: "1.4%" }}>
      {ed(tkey, text, eyebrowStyle, {})}
      <div style={{ flex: 1, height: 1, background: BRASS, opacity: 0.5 }} />
    </div>
  );

  const renderDetailPanel = () => {
    const isSubject = detailIdx === 0;
    const c = isSubject ? subject : adjusted[detailIdx - 1];
    if (!c) return null;
    const pics = photosOf(c);
    const pi = pics.length ? ((photoIdx % pics.length) + pics.length) % pics.length : 0;
    const statusColor = (c.status || "Sold") === "Active" ? "#2E7D52" : (c.status || "Sold") === "Pending" ? "#B07A1E" : "#4A4A4A";

    const stat = (label, value) => (
      <div key={label} style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "clamp(7px, 0.8cqw, 9.5px)", letterSpacing: "0.18em", textTransform: "uppercase", color: `${PARCH}88` }}>{label}</div>
        <div style={{ fontSize: "clamp(11px, 1.3cqw, 16px)", fontWeight: 700, color: PARCH, marginTop: 2, overflowWrap: "anywhere" }}>{value || "—"}</div>
      </div>
    );

    const rows = isSubject
      ? detailRows(subject)
      : [
          ["Status", c.status || "Sold"],
          ["Sold", c.sold],
          ["Sale price", fmt(c.price)],
          ["Adjusted value", fmt(c.adjValue)],
          ["Days on market", c.dom],
          ["Lot size", c.lotSize],
          ["Year built", c.year],
          ["Price / sqft", c.sqft ? fmt(Math.round(c.price / c.sqft)) : ""],
        ].filter(([, v]) => v !== "" && v !== null && v !== undefined && String(v).trim() !== "");

    return (
      <div
        onClick={() => setDetailIdx(null)}
        style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.4)", display: "flex", justifyContent: "flex-end", zIndex: 500 }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{ width: "min(54%, 620px)", height: "100%", background: GREEN, overflowY: "auto", overflowX: "hidden", overscrollBehavior: "contain", paddingBottom: 26, boxSizing: "border-box", boxShadow: "-10px 0 30px rgba(0,0,0,.35)" }}
        >
          {/* Header */}
          <div style={{ padding: "16px 18px 14px", borderBottom: `1px solid ${BRASS}55`, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="ds-head" style={{ fontSize: "clamp(13px, 1.65cqw, 21px)", fontWeight: 700, color: PARCH, textTransform: "uppercase", letterSpacing: "0.02em", overflowWrap: "anywhere" }}>
                {c.address}
              </div>
              <div style={{ fontSize: "clamp(9px, 1.05cqw, 12.5px)", color: `${PARCH}99`, marginTop: 3 }}>
                {isSubject ? subject.city : (subject.city || "")}
              </div>
              <div className="ds-head" style={{ fontSize: "clamp(14px, 1.9cqw, 25px)", fontWeight: 700, color: BRASS, marginTop: 8 }}>
                {isSubject ? fmt(mid) : fmt(c.price)}
                {isSubject && <span style={{ fontSize: "clamp(8px, 0.9cqw, 11px)", color: `${PARCH}99`, fontWeight: 400, marginLeft: 8 }}>{L.positionLead}</span>}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              <span style={{ background: isSubject ? RED : statusColor, color: "#fff", fontSize: "clamp(8px, 0.85cqw, 10.5px)", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", padding: "4px 9px", borderRadius: 3 }}>
                {isSubject ? "Subject" : (c.status || "Sold")}
              </span>
              <button onClick={() => setDetailIdx(null)} title="Close"
                style={{ background: "none", border: `1px solid ${PARCH}44`, color: PARCH, width: 26, height: 26, borderRadius: 3, cursor: "pointer", fontSize: 13, lineHeight: 1 }}>
                ✕
              </button>
            </div>
          </div>

          {/* Photo carousel */}
          {pics.length > 0 ? (
            <div style={{ position: "relative", background: "#000" }}>
              <img src={pics[pi]} alt="" style={{ width: "100%", aspectRatio: "16 / 9", objectFit: "cover", display: "block" }} />
              {pics.length > 1 && (
                <>
                  <button onClick={() => setPhotoIdx(pi - 1)} className="ds-car" style={{ left: 8 }}>‹</button>
                  <button onClick={() => setPhotoIdx(pi + 1)} className="ds-car" style={{ right: 8 }}>›</button>
                  <div style={{ position: "absolute", bottom: 8, right: 10, background: "rgba(0,0,0,.6)", color: "#fff", fontSize: 11, padding: "2px 8px", borderRadius: 3 }}>
                    {pi + 1} / {pics.length}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div style={{ padding: "26px 18px", textAlign: "center", color: `${PARCH}77`, fontSize: "clamp(9px, 1.05cqw, 12.5px)", fontStyle: "italic" }}>
              No photos added for this property yet.
            </div>
          )}
          {pics.length > 1 && (
            <div style={{ display: "flex", gap: 5, padding: "8px 18px 0", overflowX: "auto" }}>
              {pics.map((p, i2) => (
                <button key={i2} onClick={() => setPhotoIdx(i2)}
                  style={{ flex: "0 0 auto", padding: 0, border: `1.5px solid ${i2 === pi ? BRASS : "transparent"}`, borderRadius: 2, cursor: "pointer", background: "none", lineHeight: 0 }}>
                  <img src={p} alt="" style={{ width: 54, height: 40, objectFit: "cover", display: "block", opacity: i2 === pi ? 1 : 0.6 }} />
                </button>
              ))}
            </div>
          )}

          {/* Stats */}
          <div style={{ display: "flex", gap: 14, padding: "14px 18px", borderBottom: `1px solid ${BRASS}33` }}>
            {stat("Bed", c.beds)}
            {stat("Bath", c.baths)}
            {stat("Sqft", c.sqft ? Number(c.sqft).toLocaleString() : "")}
            {stat("Lot size", isSubject ? lotOf(subject) : c.lotSize)}
          </div>

          {/* Remarks */}
          {(isSubject ? subject.features : c.remarks) && (
            <div style={{ padding: "14px 18px", borderBottom: `1px solid ${BRASS}33` }}>
              <div style={{ fontSize: "clamp(8px, 0.9cqw, 11px)", letterSpacing: "0.22em", textTransform: "uppercase", color: BRASS, fontWeight: 700, marginBottom: 10 }}>
                {isSubject ? "Features" : "Agent remarks"}
              </div>
              <div style={{ fontSize: "clamp(9.5px, 1.1cqw, 13.5px)", lineHeight: 1.75, color: `${PARCH}DD`, whiteSpace: "pre-wrap", overflowWrap: "anywhere", wordBreak: "break-word" }}>
                {isSubject ? subject.features : c.remarks}
              </div>
            </div>
          )}

          {/* Detail rows */}
          {rows.length > 0 && (
            <div style={{ padding: "14px 18px 8px" }}>
              <div style={{ fontSize: "clamp(8px, 0.9cqw, 11px)", letterSpacing: "0.22em", textTransform: "uppercase", color: BRASS, fontWeight: 700, marginBottom: 10 }}>
                Listing details
              </div>
              {rows.map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "7px 0", borderBottom: `1px solid ${PARCH}18`, fontSize: "clamp(9px, 1.05cqw, 13px)" }}>
                  <span style={{ color: `${PARCH}99`, flexShrink: 0 }}>{k}</span>
                  <span style={{ color: PARCH, fontWeight: 600, textAlign: "right", overflowWrap: "anywhere", minWidth: 0 }}>{v}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderSlide = (slide) => {
    if (!slide) return null;
    switch (slide.type) {
      case "cover":
        return (
          <div style={{ height: "100%", position: "relative", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "5% 8%" }}>
            <div style={{ position: "absolute", top: "6%", right: "5%", width: "min(8.5cqw, 100px)", height: "min(8.5cqw, 100px)", borderRadius: "50%", border: `2px solid ${RED}`, display: "flex", alignItems: "center", justifyContent: "center", transform: "rotate(-10deg)", opacity: 0.75 }}>
              <div style={{ textAlign: "center", color: RED, fontSize: "clamp(7px, 0.75cqw, 9px)", letterSpacing: "0.12em", textTransform: "uppercase", lineHeight: 1.6, fontWeight: 700, fontFamily: "'Libre Franklin', Arial, sans-serif" }}>
                Prepared<br />{new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}<br />{new Date().getFullYear()}
              </div>
            </div>

            {ed("cover.eyebrow", L.coverEyebrow,
              { fontSize: "clamp(8px, 0.95cqw, 11px)", letterSpacing: "0.34em", textTransform: "uppercase", color: RED, fontWeight: 700, fontFamily: "'Libre Franklin', Arial, sans-serif" },
              { block: true })}

            {ed("cover.title", L.coverTitle,
              { fontSize: "clamp(24px, 4.1cqw, 52px)", fontWeight: 700, color: GREEN, marginTop: "1.6%", lineHeight: 1.08, letterSpacing: "-0.01em" },
              { block: true, className: "ds-head" })}

            <div className="ds-head" style={{ fontSize: "clamp(14px, 1.9cqw, 23px)", color: INK, marginTop: "1.5%" }}>
              {subject.address} · {subject.city}
            </div>
            <div style={{ fontSize: "clamp(10px, 1.1cqw, 13px)", color: MUTE, marginTop: "0.8%" }}>
              {subject.beds} bed · {subject.baths} bath · {(subject.sqft || 0).toLocaleString()} sqft · {lotOf(subject)} lot · built {subject.year}
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

            <div style={{ fontSize: "clamp(10px, 1.15cqw, 13px)", color: MUTE }}>
              Prepared by <span style={{ color: INK, fontWeight: 600 }}>{agent.name}</span> · {agent.brokerage}
            </div>
            <div style={{ fontSize: "clamp(9px, 1cqw, 11px)", color: RED, marginTop: 5, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </div>
          </div>
        );

      case "intro":
        return (
          <div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "5% 7%" }}>
            {eyebrow("Your agent", "intro.eyebrow")}
            <div className="ds-comprow" style={{ flex: 1, display: "flex", gap: "5%", alignItems: "stretch", marginTop: "2.5%", minHeight: 0 }}>
              {agent.photo && (
                <div style={{ flex: "0 0 32%", minHeight: 0, display: "flex", alignItems: "center" }}>
                  <img src={agent.photo} alt={agent.name}
                    style={{ width: "100%", height: "100%", maxHeight: "100%", objectFit: "cover", border: `1.5px solid ${BRASS}`, boxShadow: "0 8px 22px rgba(0,0,0,0.16)" }} />
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <div className="ds-head" style={{ fontSize: "clamp(20px, 2.9cqw, 38px)", fontWeight: 700, color: GREEN, letterSpacing: "-0.01em" }}>
                  {agent.name}
                </div>
                <div style={{ fontSize: "clamp(10px, 1.2cqw, 14px)", color: MUTE, marginTop: 6 }}>
                  {agent.brokerage} · {agent.license}
                </div>
                <div style={{ width: 46, height: 1.5, background: BRASS, margin: "3.5% 0" }} />
                {ed("intro.body", agent.bio || "Add a short bio in Agent inputs — a couple of lines about your experience in this neighborhood.",
                  { fontSize: "clamp(11px, 1.5cqw, 19px)", lineHeight: 1.75, color: INK, whiteSpace: "pre-wrap", overflowWrap: "anywhere" },
                  { block: true, className: "ds-head" })}
                <div style={{ fontSize: "clamp(11px, 1.3cqw, 16px)", color: INK, fontWeight: 600, marginTop: "4%" }}>
                  {agent.phone}
                </div>
              </div>
            </div>
          </div>
        );

      case "details": {
        const rows = detailRows(subject);
        const feats = (subject.features || "")
          .split(/\n|,/).map((f) => f.trim()).filter(Boolean);
        const half = Math.ceil(rows.length / 2);
        const col = (list) => (
          <div style={{ flex: 1, minWidth: 0 }}>
            {list.map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "1.5% 0", borderBottom: `1px solid ${BRASS}22`, fontSize: "clamp(9px, 1.15cqw, 14px)" }}>
                <span style={{ color: MUTE }}>{k}</span>
                <span style={{ color: INK, fontWeight: 600, textAlign: "right" }}>{v}</span>
              </div>
            ))}
          </div>
        );
        return (
          <div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "4.5% 7%" }}>
            {eyebrow(L.details || "Property details", "details.eyebrow")}
            <div className="ds-head" style={{ fontSize: "clamp(16px, 2.2cqw, 28px)", fontWeight: 700, color: INK, marginTop: "1.5%" }}>
              {subject.address}
            </div>
            <div style={{ flex: 1, display: "flex", gap: "5%", marginTop: "2.5%", minHeight: 0, overflow: "auto" }}>
              {col(rows.slice(0, half))}
              {rows.length > half && col(rows.slice(half))}
            </div>
            {feats.length > 0 && (
              <div style={{ flexShrink: 0, marginTop: "2%", paddingTop: "2%", borderTop: `1.5px solid ${BRASS}` }}>
                <div style={{ ...eyebrowStyle, marginBottom: "1.2%" }}>Features</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "1.5%", rowGap: 8 }}>
                  {feats.slice(0, 10).map((f, i) => (
                    <span key={i} style={{ background: CARD, color: INK, fontSize: "clamp(9px, 1.1cqw, 13px)", padding: "5px 11px", borderRadius: 3, overflowWrap: "anywhere", maxWidth: "100%" }}>{f}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      }

      case "position":
        return (
          <div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "5% 8%" }}>
            {eyebrow(L.position, "position.eyebrow")}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", minHeight: 0 }}>
              <div className="ds-head" style={{ textAlign: "center", fontSize: "clamp(36px, 6cqw, 82px)", fontWeight: 700, color: RED, lineHeight: 1, letterSpacing: "-0.02em" }}>
                {fmt(mid)}
              </div>
              <div style={{ textAlign: "center", fontSize: "clamp(8px, 1cqw, 12px)", letterSpacing: "0.3em", textTransform: "uppercase", color: MUTE, marginTop: "1.6%", fontFamily: "'Libre Franklin', Arial, sans-serif", fontWeight: 600 }}>
                {L.positionLead}
              </div>
              <div style={{ width: "70%", margin: "6% auto 0" }}>
                <div style={{ position: "relative", height: 8, background: "#DCD0B2", borderRadius: 5 }}>
                  <div style={{ position: "absolute", left: "7%", right: "7%", top: 0, bottom: 0, background: `linear-gradient(90deg, ${BRASS}, ${GREEN})`, borderRadius: 5 }} />
                  <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)", width: 24, height: 24, borderRadius: "50%", background: RED, border: `3.5px solid ${PARCH}`, boxShadow: "0 2px 8px rgba(0,0,0,0.28)" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "3%" }}>
                  <div>
                    <div className="ds-head" style={{ fontSize: "clamp(16px, 2.15cqw, 28px)", fontWeight: 600, color: INK }}>{fmt(lo)}</div>
                    <div style={{ fontSize: "clamp(7px, 0.9cqw, 10px)", letterSpacing: "0.22em", color: MUTE, fontFamily: "'Libre Franklin', Arial, sans-serif", marginTop: 3 }}>LOW</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className="ds-head" style={{ fontSize: "clamp(16px, 2.15cqw, 28px)", fontWeight: 600, color: INK }}>{fmt(hi)}</div>
                    <div style={{ fontSize: "clamp(7px, 0.9cqw, 10px)", letterSpacing: "0.22em", color: MUTE, fontFamily: "'Libre Franklin', Arial, sans-serif", marginTop: 3 }}>HIGH</div>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ textAlign: "center", fontSize: "clamp(10px, 1.1cqw, 13px)", color: MUTE, fontStyle: "italic" }}>
              Based on {adjusted.length} adjusted comparable sale{adjusted.length !== 1 ? "s" : ""} selected by {agent.name}
            </div>
          </div>
        );

      case "map": {
        const strip = [
          { photo: subject.photo, label: "S", addr: subject.address, price: null, isSubject: true },
          ...adjusted.map((c, i) => ({ photo: c.photo, label: String(i + 1), addr: c.address, price: c.price, isSubject: false })),
        ];
        return (
          <div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "2.6% 3.6% 2.2%" }}>
            {eyebrow(L.map, "map.eyebrow")}

            {/* Comp filmstrip */}
            <div className="ds-strip" style={{ display: "flex", gap: 6, overflowX: "auto", flexShrink: 0, margin: "1.1% 0 1%", paddingBottom: 4 }}>
              {strip.map((it, i) => (
                <button
                  key={i}
                  onClick={() => focusPin(i)}
                  title={`Show ${it.addr} on the map`}
                  style={{
                    flex: "0 0 auto", width: "clamp(80px, 10%, 132px)", padding: 0, cursor: "pointer", textAlign: "left",
                    border: `1.5px solid ${focusIdx === i ? BRASS : `${BRASS}44`}`,
                    background: CARD, borderRadius: 3, overflow: "hidden",
                    boxShadow: focusIdx === i ? `0 0 0 2px ${BRASS}55` : "none", transition: "all .15s ease",
                  }}
                >
                  <div style={{ position: "relative", width: "100%", aspectRatio: "4 / 3", background: it.isSubject ? RED : `${GREEN}22`, overflow: "hidden" }}>
                    {it.photo && <img src={it.photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                    <span style={{
                      position: "absolute", top: 4, left: 4, minWidth: 16, height: 16, padding: "0 4px", borderRadius: 3,
                      background: it.isSubject ? RED : "#2B2B2B", color: "#fff", fontSize: 10, fontWeight: 700,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>{it.label}</span>
                    {it.price ? (
                      <span style={{
                        position: "absolute", bottom: 4, right: 4, background: "rgba(0,0,0,.72)", color: "#fff",
                        fontSize: 10, fontWeight: 700, padding: "2px 5px", borderRadius: 3,
                      }}>{shortPrice(it.price)}</span>
                    ) : null}
                  </div>
                  <div style={{ padding: "4px 6px", fontSize: "clamp(7px, 0.78cqw, 9.5px)", color: INK, fontWeight: 600, lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {it.addr}
                  </div>
                </button>
              ))}
            </div>

            <div className="ds-mapbox" style={{ flex: 1, minHeight: 0, position: "relative" }}>
              <div ref={mapDivRef} style={{ position: "absolute", inset: 0, border: `1.5px solid ${BRASS}`, boxShadow: "0 4px 14px rgba(0,0,0,0.1)" }} />
              {detailIdx !== null && renderDetailPanel()}
            </div>
            <div className="ds-mapcap" style={{ flexShrink: 0, fontSize: "clamp(8px, 0.9cqw, 11px)", color: MUTE, fontStyle: "italic", paddingTop: 7 }}>
              Click a photo or a price pin to open full property details · drag and zoom the map · switch to Overhead for satellite view
            </div>
          </div>
        );
      }

      case "comp": {
        const c = adjusted[slide.i];
        if (!c) return null;
        return (
          <div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "4.5% 7%" }}>
            {eyebrow(`${L.comp}${TYPE === "buyertour" ? ` ${slide.i + 1}` : ""}`, `comp${slide.i}.eyebrow`)}
            <div style={{ display: "flex", alignItems: "baseline", gap: "1.5%", marginTop: "2%" }}>
              <div className="ds-head" style={{ fontSize: "clamp(15px, 2cqw, 26px)", fontWeight: 700, color: BRASS }}>{slide.i + 1}</div>
              <div className="ds-head" style={{ fontSize: "clamp(19px, 2.7cqw, 35px)", fontWeight: 700, color: INK, letterSpacing: "-0.01em" }}>{c.address}</div>
            </div>
            <div style={{ fontSize: "clamp(10px, 1.2cqw, 14px)", color: MUTE, marginTop: 6, letterSpacing: "0.02em" }}>
              {c.beds} bd / {c.baths} ba · {(c.sqft || 0).toLocaleString()} sqft · sold {c.sold}
            </div>
            <div className="ds-comprow" style={{ flex: 1, display: "flex", gap: "3.5%", marginTop: "3%", minHeight: 0 }}>
              <div style={{ flex: c.photo ? 1.45 : 1, minWidth: 0 }}>
                <div style={{ background: CARD, padding: "3.5% 4%" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "clamp(12px, 1.45cqw, 18px)", fontWeight: 700, color: INK, paddingBottom: 8 }}>
                    <span>Sale price</span><span>{fmt(c.price)}</span>
                  </div>
                  {(c.adjustments || []).map((a, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "clamp(10px, 1.2cqw, 14px)", color: MUTE, padding: "5px 0" }}>
                      <span>{a.label}</span>
                      <span style={{ color: a.amount < 0 ? RED : GREEN, fontWeight: 600 }}>
                        {a.amount >= 0 ? "+" : "−"}{fmt(Math.abs(a.amount))}
                      </span>
                    </div>
                  ))}
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "clamp(13px, 1.6cqw, 20px)", fontWeight: 700, color: GREEN, paddingTop: 10, marginTop: 8, borderTop: `1px dashed ${BRASS}` }}>
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
            {eyebrow(L.strategy, "strategy.eyebrow")}
            <div style={{ flex: 1, display: "flex", alignItems: "center", minHeight: 0, overflow: "auto" }}>
              <div style={{ borderLeft: `4px solid ${BRASS}`, paddingLeft: "3.5%" }}>
                {ed("strategy.body", strategyDefault,
                  { fontSize: "clamp(14px, 1.95cqw, 25px)", lineHeight: 1.7, color: INK, whiteSpace: "pre-wrap", overflowWrap: "anywhere" },
                  { block: true, className: "ds-head" })}
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
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "clamp(12px, 1.5cqw, 19px)", fontWeight: 700, color: INK, paddingBottom: 10 }}>
                  <span>Sale price</span><span>{fmt(netBase)}</span>
                </div>
                {netLines.map(([label, v]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: "clamp(10px, 1.25cqw, 16px)", color: MUTE, padding: "6px 0 6px 4%" }}>
                    <span>{label}</span>
                    <span style={{ color: RED, fontWeight: 600 }}>−{fmt(v)}</span>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: "clamp(15px, 2.1cqw, 27px)", fontWeight: 700, color: GREEN, paddingTop: 14, marginTop: 12, borderTop: `1.5px solid ${BRASS}` }}>
                  <span>Estimated net to seller</span><span>{fmt(netProceeds)}</span>
                </div>
              </div>
              <div style={{ fontSize: "clamp(8px, 0.9cqw, 11px)", color: "#8A7E63", fontStyle: "italic", marginTop: "2.5%", textAlign: "center" }}>
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
            {box("title", c.title, { fontFamily: "'Fraunces', Georgia, serif", fontSize: "clamp(21px, 3.1cqw, 40px)", fontWeight: 700, color: GREEN, letterSpacing: "-0.01em" })}
            <div style={{ width: 62, height: 1.5, background: BRASS, margin: "2.8% 0" }} />
            <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
              {box("body", c.body, { fontFamily: "'Fraunces', Georgia, serif", fontSize: "clamp(12px, 1.65cqw, 21px)", lineHeight: 1.75, color: INK, whiteSpace: "pre-wrap", overflowWrap: "anywhere" })}
            </div>
          </div>
        );
      }

      case "close":
        return (
          <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "6% 9%" }}>
            <div style={{ fontSize: "clamp(8px, 0.95cqw, 11px)", letterSpacing: "0.32em", textTransform: "uppercase", color: RED, fontWeight: 700, fontFamily: "'Libre Franklin', Arial, sans-serif", marginBottom: "3%" }}>
              Thank you
            </div>
            {agent.logo && (
              <img src={agent.logo} alt={agent.brokerage} style={{ maxWidth: "22%", maxHeight: "16%", objectFit: "contain", marginBottom: "3%" }} />
            )}
            <div className="ds-head" style={{ fontSize: "clamp(23px, 3.3cqw, 44px)", fontWeight: 700, color: GREEN, letterSpacing: "-0.01em" }}>{agent.name}</div>
            <div style={{ width: 46, height: 1.5, background: BRASS, margin: "3% 0" }} />
            <div style={{ fontSize: "clamp(11px, 1.35cqw, 17px)", color: MUTE }}>{agent.brokerage} · {agent.license}</div>
            <div style={{ fontSize: "clamp(11px, 1.35cqw, 17px)", color: INK, marginTop: 6, fontWeight: 600 }}>{agent.phone}</div>
            <p style={{ fontSize: "clamp(7px, 0.85cqw, 10px)", color: "#8A7E63", lineHeight: 1.7, marginTop: "auto", fontStyle: "italic", maxWidth: "78%" }}>
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
    : s.type === "details" ? "Details"
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
        .fraunces, .ds-head { font-family: ${TH.head}; letter-spacing: ${TH.tracking}; }
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
        @keyframes dsIn { from { opacity: 0; } to { opacity: 1; } }
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
        .ds-plus { width: 23px; height: 23px; border-radius: 50%; flex-shrink: 0; padding: 0; cursor: pointer;
          border: 1px dashed #2E5540; background: transparent; color: ${SAGE}; font-size: 15px; line-height: 1;
          display: flex; align-items: center; justify-content: center; opacity: .4; transition: all .15s ease; }
        .ds-plus:hover { opacity: 1; border: 1px solid ${BRASS}; background: ${BRASS}; color: ${DARKER}; transform: scale(1.12); }
        .ds-plus-on { opacity: 1; border: 1px solid ${BRASS}; color: ${BRASS}; }
        .ds-car { position: absolute; top: 50%; transform: translateY(-50%); width: 30px; height: 30px; border-radius: 50%;
          border: none; background: rgba(0,0,0,.55); color: #fff; font-size: 17px; line-height: 1; cursor: pointer;
          display: flex; align-items: center; justify-content: center; transition: background .15s ease; }
        .ds-car:hover { background: rgba(0,0,0,.85); }
        .ds-dot { width: 6px; height: 6px; border-radius: 50%; background: #2E5540; transition: all .2s ease; cursor: pointer; border: none; padding: 0; }
        .ds-dot-on { background: ${BRASS}; width: 18px; border-radius: 3px; }
        .leaflet-container { font-family: 'Libre Franklin', Arial, sans-serif; }
        @media (max-width: 900px) {
          .ds-slidebox .leaflet-control-layers, .ds-slidebox .leaflet-control-zoom { transform: scale(.62); transform-origin: top left; }
          .ds-slidebox .leaflet-control-attribution { font-size: 7px !important; }
        }
        @media (max-width: 950px) and (orientation: landscape) {
          .ds-slidebox { height: 100% !important; width: auto !important; max-width: 100% !important; }
          .ds-topbarP { padding: 6px 10px !important; }
          .ds-rotate { display: none !important; }
          .ds-stage { padding: 6px 44px !important; }
        }
        /* the slide is the sizing container for all of its type */
        .ds-slidebox { container-type: inline-size; }
        @media (orientation: landscape) and (max-height: 560px) {
          /* phone held sideways: give the slide the whole screen, hide the chrome extras */
          .ds-stage { padding: 4px 34px !important; }
          .ds-rotate { display: none !important; }
          .ds-slidebox { width: auto !important; height: 100% !important; max-height: 100% !important; }
          .ds-strip { display: none !important; }
        }
        @media (max-width: 900px) {
          .ds-stage { padding: 8px 6px !important; align-items: center !important; overflow: hidden !important; }
          .ds-nav { width: 32px; height: 32px; font-size: 16px; opacity: .75; }
        }
        @media (max-width: 1000px) and (orientation: landscape) {
          .ds-topbarP { padding: 5px 10px !important; }
          .ds-btn { padding: 5px 9px !important; font-size: 11px !important; }
          .ds-footer { padding: 2px 0 4px !important; }
          .ds-footer .ds-dot { display: none; }
          .ds-stage { padding: 2px !important; }
          .ds-rotate { display: none !important; }
          .ds-nav { width: 30px; height: 30px; font-size: 15px; opacity: .55; }
        }
        @media (max-width: 760px) {
          .ds-nav { width: 34px; height: 34px; font-size: 17px; }
          .ds-nav { width: 36px; height: 36px; font-size: 18px; opacity: .8; }
          .ds-hide-sm { display: none; }
          .ds-btn { padding: 7px 11px; font-size: 11.5px; }
          .ds-mapcap { display: none !important; }
          .ds-strip { gap: 4px !important; margin: 6px 0 5px !important; }
          .leaflet-control-attribution { font-size: 8px !important; }
        }
        @media (hover: none) {
          .ds-nav { opacity: .55; }
        }
      `}</style>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />

      {/* Top bar */}
      {!chromeVisible && (
        <button
          onClick={() => { setFocusMode(false); setChromeVisible(true); if (isFull) toggleFullscreen(); }}
          style={{ position: "absolute", top: 10, right: 10, zIndex: 40, width: 34, height: 34, borderRadius: "50%", border: "1px solid #2E5540", background: "rgba(0,0,0,.45)", color: "#D9C48F", fontSize: 15, cursor: "pointer", lineHeight: 1 }}
          title="Exit full screen"
        >
          ✕
        </button>
      )}

      <div className="ds-topbarP" style={{ display: chromeVisible ? "flex" : "none", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 18px", borderBottom: "1px solid rgba(255,255,255,.06)", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          <div className="ds-head" style={{ color: PARCH, fontSize: 17, fontWeight: 700, letterSpacing: "0.01em" }}>DeedSheet</div>
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
          <button
            className="ds-btn"
            onClick={() => { if (fsSupported) toggleFullscreen(); setFocusMode(true); setChromeVisible(false); }}
            title="Fill the screen with the slide"
          >
            Full screen
          </button>
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
      <div
        ref={stageRef}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className="ds-stage"
        style={{ flex: 1, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", padding: "18px 66px", minHeight: 0 }}
      >
        {isSmall ? (
          <div style={{ width: Math.round(CANVAS_W * scale), height: Math.round(CANVAS_H * scale), position: "relative", flexShrink: 0 }}>
            <div className="ds-slide ds-slidebox" key={slides[idx]?.key || idx}
              style={{
                containerType: "inline-size", width: CANVAS_W, height: CANVAS_H,
                transform: `scale(${scale})`, transformOrigin: "top left",
                position: "absolute", top: 0, left: 0,
                background: PARCH, boxShadow: "0 14px 40px rgba(0,0,0,.5)",
                opacity: (d.hidden || {})[slides[idx]?.key] ? 0.55 : 1,
              }}>
              <div style={{ position: "absolute", inset: 9, border: TH.frame, overflow: "hidden" }}>
                {renderSlide(slides[idx])}
              </div>
              {editing && (d.hidden || {})[slides[idx]?.key] && (
                <div style={{ position: "absolute", top: 14, left: 14, background: RED, color: PARCH, fontSize: 18, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", padding: "6px 14px", borderRadius: 4 }}>
                  Hidden from presentation
                </div>
              )}
            </div>
          </div>
        ) : (
        <div className="ds-slide ds-slidebox" key={slides[idx]?.key || idx}
          style={{ containerType: "inline-size", aspectRatio: "16 / 9", width: "min(100%, 168vh)", maxHeight: "100%", background: PARCH, boxShadow: "0 20px 60px rgba(0,0,0,.5)", position: "relative", opacity: (d.hidden || {})[slides[idx]?.key] ? 0.55 : 1 }}>
          <div style={{ position: "absolute", inset: 9, border: TH.frame, overflow: "hidden", maxWidth: "100%" }}>
            {renderSlide(slides[idx])}
          </div>
          {editing && (d.hidden || {})[slides[idx]?.key] && (
            <div style={{ position: "absolute", top: 14, left: 14, background: RED, color: PARCH, fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", padding: "4px 9px", borderRadius: 3 }}>
              Hidden from presentation
            </div>
          )}
        </div>
        )}
        <button className="ds-nav" style={{ left: 12 }} onClick={prev} disabled={idx === 0} aria-label="Previous slide">‹</button>
        <button className="ds-nav" style={{ right: 12 }} onClick={next} disabled={idx === slides.length - 1} aria-label="Next slide">›</button>
      </div>

      {/* Editor filmstrip */}
      {editing && (
        <div style={{ borderTop: "1px solid rgba(255,255,255,.07)", padding: "11px 16px", display: "flex", gap: 8, alignItems: "center", overflowX: "auto" }}>
          {slides.map((s, i) => {
            const isHidden = !!(d.hidden || {})[s.key];
            return (
              <React.Fragment key={s.key}>
                <div className={`ds-chip ${i === idx ? "ds-chip-on" : ""}`} style={{ opacity: isHidden ? 0.5 : 1 }}>
                  <button onClick={() => setIdx(i)}
                    style={{ color: PARCH === "#FFFFFF" ? "#EFE7D3" : "#EFE7D3", fontSize: 12, textDecoration: isHidden ? "line-through" : "none", display: "flex", alignItems: "center", gap: 6 }}>
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
                <button
                  className={`ds-plus ${i === idx ? "ds-plus-on" : ""}`}
                  onClick={() => addCustomSlide(s.key, i)}
                  title={i === idx ? "Add a slide right after this one" : `Add a slide after ${slideLabel(s)}`}
                >
                  +
                </button>
              </React.Fragment>
            );
          })}
        </div>
      )}

      <div className="ds-rotate" style={{ display: "none", alignItems: "center", justifyContent: "center", gap: 8, padding: "6px 14px 0", color: SAGE, fontSize: 11.5 }}>
        <span>Rotate your phone for a wider view</span>
      </div>

      {/* Footer */}
      <div className="ds-footer" style={{ display: chromeVisible ? "flex" : "none", alignItems: "center", justifyContent: "center", gap: 14, padding: "10px 0 14px" }}>
        {slides.length <= 14 && (
          <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
            {slides.map((s, i) => (
              <button key={s.key} className={`ds-dot ${i === idx ? "ds-dot-on" : ""}`} onClick={() => setIdx(i)} aria-label={`Go to slide ${i + 1}`} />
            ))}
          </div>
        )}
        <div style={{ color: SAGE, fontSize: 11.5, opacity: .8 }}>
          {idx + 1} / {slides.length} · ← → or swipe{editing ? " · click any text to edit · + adds a slide at that spot" : ""}
        </div>
      </div>
    </div>
  );
}
