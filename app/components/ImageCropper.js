"use client";

import { useEffect, useRef, useState } from "react";

const PARCH = "#EFE7D3", GREEN = "#1F3D2B", BRASS = "#A8853C", MUTE = "#6B6252", EDGE = "#C9BC9C";

// Drag to move, pinch or slide to zoom, then Apply. Output keeps transparency for PNGs.
export default function ImageCropper({ src, aspect = 16 / 9, label = "Adjust photo", keepAlpha = false, onCancel, onApply }) {
  const boxRef = useRef(null);
  const imgRef = useRef(null);
  const [nat, setNat] = useState({ w: 0, h: 0 });
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const drag = useRef(null);
  const pinch = useRef(null);

  // measure the crop frame
  useEffect(() => {
    const measure = () => {
      const el = boxRef.current;
      if (!el) return;
      const w = el.clientWidth;
      setBox({ w, h: w / aspect });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [aspect]);

  // the scale at which the image exactly covers the frame
  const cover = nat.w && box.w ? Math.max(box.w / nat.w, box.h / nat.h) : 1;
  const scale = cover * zoom;
  const drawW = nat.w * scale;
  const drawH = nat.h * scale;

  const clamp = (p, w = drawW, h = drawH) => {
    const maxX = Math.max(0, (w - box.w) / 2);
    const maxY = Math.max(0, (h - box.h) / 2);
    return {
      x: Math.min(maxX, Math.max(-maxX, p.x)),
      y: Math.min(maxY, Math.max(-maxY, p.y)),
    };
  };

  useEffect(() => { setPos((p) => clamp(p)); /* eslint-disable-next-line */ }, [zoom, box.w, nat.w]);

  const onDown = (e) => {
    const t = e.touches ? e.touches[0] : e;
    drag.current = { x: t.clientX - pos.x, y: t.clientY - pos.y };
  };
  const onMove = (e) => {
    if (e.touches && e.touches.length === 2) {
      const [a, b] = e.touches;
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      if (pinch.current) setZoom((z) => Math.min(5, Math.max(1, z * (dist / pinch.current))));
      pinch.current = dist;
      return;
    }
    if (!drag.current) return;
    const t = e.touches ? e.touches[0] : e;
    setPos(clamp({ x: t.clientX - drag.current.x, y: t.clientY - drag.current.y }));
  };
  const onUp = () => { drag.current = null; pinch.current = null; };

  const apply = () => {
    const img = imgRef.current;
    if (!img) return;
    const outW = keepAlpha ? 900 : 1400;
    const outH = Math.round(outW / aspect);
    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    const k = outW / box.w;                 // frame pixels -> output pixels
    const w = drawW * k, h = drawH * k;
    const x = (outW - w) / 2 + pos.x * k;
    const y = (outH - h) / 2 + pos.y * k;
    ctx.drawImage(img, x, y, w, h);
    onApply(keepAlpha ? canvas.toDataURL("image/png") : canvas.toDataURL("image/jpeg", 0.85));
  };

  const useOriginal = () => {
    const img = imgRef.current;
    if (!img) return onApply(src);
    const max = keepAlpha ? 900 : 1400;
    const s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * s);
    canvas.height = Math.round(img.naturalHeight * s);
    canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
    onApply(keepAlpha ? canvas.toDataURL("image/png") : canvas.toDataURL("image/jpeg", 0.85));
  };

  const btn = (bg, color, extra = {}) => ({
    padding: "10px 18px", fontSize: 13.5, fontWeight: 700, cursor: "pointer",
    borderRadius: 5, border: "none", background: bg, color, fontFamily: "inherit", ...extra,
  });

  return (
    <div
      onClick={onCancel}
      style={{ position: "fixed", inset: 0, background: "rgba(10,22,15,.78)", zIndex: 10070, display: "flex", alignItems: "center", justifyContent: "center", padding: 18, fontFamily: "'Libre Franklin', Arial, sans-serif" }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ background: PARCH, borderRadius: 8, border: `1px solid ${EDGE}`, width: "min(100%, 560px)", padding: "20px 20px 18px", maxHeight: "92vh", overflowY: "auto" }}>
        <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 19, fontWeight: 700, color: GREEN }}>{label}</div>
        <div style={{ fontSize: 12.5, color: MUTE, marginTop: 4, marginBottom: 14 }}>
          Drag the image to reposition. Pinch or use the slider to zoom.
        </div>

        <div
          ref={boxRef}
          onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
          onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp}
          style={{
            position: "relative", width: "100%", height: box.h || 200, overflow: "hidden",
            background: "repeating-conic-gradient(#DCD3BC 0% 25%, #E9E1CB 0% 50%) 50% / 18px 18px",
            border: `1.5px solid ${BRASS}`, borderRadius: 4, cursor: "grab", touchAction: "none", userSelect: "none",
          }}
        >
          <img
            ref={imgRef}
            src={src}
            alt=""
            draggable={false}
            onLoad={(e) => setNat({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
            style={{
              position: "absolute", left: "50%", top: "50%",
              width: drawW || "auto", height: drawH || "auto",
              transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))`,
              maxWidth: "none", pointerEvents: "none",
            }}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14 }}>
          <span style={{ fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: MUTE }}>Zoom</span>
          <input
            type="range" min="1" max="4" step="0.01" value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            style={{ flex: 1, accentColor: BRASS }}
          />
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
          <button onClick={useOriginal} style={btn("transparent", MUTE, { border: `1px solid ${EDGE}`, fontWeight: 600 })}>
            Use full image
          </button>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onCancel} style={btn("transparent", MUTE, { border: `1px solid ${EDGE}`, fontWeight: 600 })}>Cancel</button>
            <button onClick={apply} style={btn(GREEN, PARCH)}>Apply</button>
          </div>
        </div>
      </div>
    </div>
  );
}
