"use client";

import React, { useState } from "react";
import { TYPES, TEMPLATES, THEMES } from "../lib/presets";

const PARCH = "#EFE7D3", CARD = "#E7DDC2", GREEN = "#1F3D2B", BRASS = "#A8853C",
  RED = "#8E3B2F", INK = "#26221A", MUTE = "#6B6252", EDGE = "#C9BC9C";

export default function SetupWizard({ meta, onApply, onClose }) {
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState(meta);

  const pickType = (t) => {
    const tpl = TEMPLATES.find((x) => x.id === draft.template) || TEMPLATES[0];
    setDraft({
      ...draft,
      type: t.id,
      sections: { ...tpl.sections, ...t.overrides, intro: tpl.sections.intro },
    });
  };
  const pickTemplate = (tpl) => {
    const t = TYPES.find((x) => x.id === draft.type) || TYPES[0];
    setDraft({ ...draft, template: tpl.id, sections: { ...tpl.sections, ...t.overrides, intro: tpl.sections.intro } });
  };
  const toggleSection = (k) =>
    setDraft({ ...draft, sections: { ...draft.sections, [k]: !draft.sections[k] } });

  const row = (selected, onClick, title, desc, right) => (
    <button
      key={title}
      onClick={onClick}
      style={{
        display: "flex", alignItems: "flex-start", gap: 12, width: "100%", textAlign: "left",
        padding: "13px 15px", marginBottom: 8, borderRadius: 4, cursor: "pointer",
        border: `1px solid ${selected ? BRASS : EDGE}`,
        background: selected ? "rgba(168,133,60,0.14)" : "#FBF7EC",
        transition: "all .12s ease",
      }}
    >
      <span style={{
        marginTop: 3, width: 15, height: 15, borderRadius: "50%", flexShrink: 0,
        border: `2px solid ${selected ? BRASS : "#A99C7A"}`,
        background: selected ? BRASS : "transparent",
        boxShadow: selected ? `inset 0 0 0 2.5px ${PARCH}` : "none",
      }} />
      <span style={{ flex: 1 }}>
        <span style={{ display: "block", fontFamily: "'Fraunces', Georgia, serif", fontSize: 16, fontWeight: 600, color: INK }}>{title}</span>
        <span style={{ display: "block", fontSize: 12.5, color: MUTE, marginTop: 2, lineHeight: 1.5 }}>{desc}</span>
      </span>
      {right}
    </button>
  );

  const stepDot = (n, label) => (
    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
      <div style={{
        width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 11.5, fontWeight: 700,
        background: step >= n ? GREEN : "transparent",
        color: step >= n ? PARCH : MUTE,
        border: `1.5px solid ${step >= n ? GREEN : "#A99C7A"}`,
      }}>{n}</div>
      <span style={{ fontSize: 12.5, fontWeight: 600, color: step >= n ? INK : MUTE }}>{label}</span>
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,22,15,0.72)", zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Libre+Franklin:wght@400;500;600;700&display=swap');`}</style>
      <div style={{ background: PARCH, border: `1px solid ${EDGE}`, borderRadius: 6, width: "min(100%, 640px)", maxHeight: "90vh", display: "flex", flexDirection: "column", fontFamily: "'Libre Franklin', Arial, sans-serif", boxShadow: "0 24px 70px rgba(0,0,0,.5)" }}>
        {/* Header */}
        <div style={{ background: GREEN, padding: "16px 20px", borderRadius: "5px 5px 0 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 20, fontWeight: 700, color: PARCH }}>New presentation</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#8FAE9B", fontSize: 20, cursor: "pointer", lineHeight: 1 }}>✕</button>
        </div>

        {/* Steps */}
        <div style={{ display: "flex", gap: 20, padding: "14px 20px", borderBottom: `1px solid ${EDGE}`, flexWrap: "wrap" }}>
          {stepDot(1, "Select type")}
          {stepDot(2, "Pick template")}
          {stepDot(3, "Settings")}
        </div>

        {/* Body */}
        <div style={{ padding: "16px 20px", overflowY: "auto" }}>
          {step === 1 && (
            <>
              <div style={{ fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase", color: GREEN, fontWeight: 700, marginBottom: 12 }}>
                Presentation types
              </div>
              {TYPES.map((t) => row(draft.type === t.id, () => pickType(t), t.label, t.desc))}
            </>
          )}

          {step === 2 && (
            <>
              <div style={{ fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase", color: GREEN, fontWeight: 700, marginBottom: 12 }}>
                Templates
              </div>
              {TEMPLATES.map((tpl) => row(draft.template === tpl.id, () => pickTemplate(tpl), tpl.label, tpl.desc))}
            </>
          )}

          {step === 3 && (
            <>
              <div style={{ fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase", color: GREEN, fontWeight: 700, marginBottom: 12 }}>
                Style
              </div>
              {Object.values(THEMES).map((th) =>
                row(
                  draft.theme === th.id,
                  () => setDraft({ ...draft, theme: th.id }),
                  th.label,
                  th.desc,
                  <span style={{ display: "flex", gap: 4, flexShrink: 0, marginTop: 3 }}>
                    {th.swatch.map((c, i) => (
                      <span key={i} style={{ width: 16, height: 16, borderRadius: 3, background: c, border: "1px solid rgba(0,0,0,.18)" }} />
                    ))}
                  </span>
                )
              )}

              <div style={{ fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase", color: GREEN, fontWeight: 700, margin: "18px 0 10px" }}>
                Sections to include
              </div>
              <div style={{ background: CARD, borderRadius: 4, padding: "12px 15px" }}>
                {[
                  ["intro", "Agent introduction slide"],
                  ["position", "Price / offer range"],
                  ["map", "Comparable locations map"],
                  ["comps", "Comparable property slides"],
                  ["strategy", "Strategy narrative"],
                  ["net", "Seller net proceeds"],
                ].map(([k, label]) => (
                  <label key={k} style={{ display: "flex", alignItems: "center", gap: 9, padding: "5px 0", fontSize: 13.5, color: INK, cursor: "pointer" }}>
                    <input type="checkbox" checked={!!draft.sections[k]} onChange={() => toggleSection(k)} />
                    {label}
                  </label>
                ))}
              </div>
              <div style={{ fontSize: 11.5, color: MUTE, marginTop: 10, fontStyle: "italic" }}>
                You can still hide or add individual slides later from Edit slides.
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 20px", borderTop: `1px solid ${EDGE}`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <button
            onClick={() => (step > 1 ? setStep(step - 1) : onClose())}
            style={{ padding: "9px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", borderRadius: 3, border: `1px solid ${EDGE}`, background: "transparent", color: MUTE }}
          >
            {step > 1 ? "Back" : "Cancel"}
          </button>
          <button
            onClick={() => (step < 3 ? setStep(step + 1) : onApply(draft))}
            style={{ padding: "9px 22px", fontSize: 13, fontWeight: 700, cursor: "pointer", borderRadius: 3, border: "none", background: step < 3 ? GREEN : RED, color: PARCH }}
          >
            {step < 3 ? "Continue" : "Create presentation"}
          </button>
        </div>
      </div>
    </div>
  );
}
