"use client";

import React, { useState, useMemo } from "react";

const fmt = (n) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const initialSubject = {
  address: "4482 Niagara Ave",
  city: "Ocean Beach, San Diego, CA 92107",
  beds: 3, baths: 2, sqft: 1450, lot: "4,800 sqft", year: 1948,
};

const initialAgent = {
  name: "Your Name",
  brokerage: "Your Brokerage",
  license: "DRE #00000000",
  phone: "(619) 555-0000",
};

const initialComps = [
  {
    id: 1,
    address: "4622 Del Monte Ave",
    dist: "0.3 mi",
    sold: "May 2026",
    beds: 3, baths: 2, sqft: 1410,
    price: 1385000,
    adjustments: [
      { label: "Remodeled kitchen (comp superior)", amount: -25000 },
      { label: "Smaller lot (comp inferior)", amount: 15000 },
    ],
  },
  {
    id: 2,
    address: "4915 Coronado Ave",
    dist: "0.5 mi",
    sold: "Apr 2026",
    beds: 3, baths: 2, sqft: 1520,
    price: 1450000,
    adjustments: [
      { label: "Extra 70 sqft (comp superior)", amount: -20000 },
      { label: "No garage (comp inferior)", amount: 30000 },
    ],
  },
  {
    id: 3,
    address: "1877 Froude St",
    dist: "0.7 mi",
    sold: "Jun 2026",
    beds: 4, baths: 2, sqft: 1600,
    price: 1525000,
    adjustments: [
      { label: "4th bedroom (comp superior)", amount: -45000 },
      { label: "Busy street location", amount: 25000 },
    ],
  },
];

const inputStyle = {
  display: "block", marginTop: 4, padding: "7px 10px", fontSize: 15,
  border: "1px solid #A99C7A", borderRadius: 3, background: "#FBF7EC",
  color: "#26221A", fontWeight: 600, boxSizing: "border-box",
};

const labelStyle = {
  fontSize: 11, color: "#6B6252", textTransform: "uppercase", letterSpacing: "0.08em",
};

export default function DeedSheet() {
  const [accessCode, setAccessCode] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [codeInput, setCodeInput] = useState("");

  React.useEffect(() => {
    const saved = window.localStorage.getItem("deedsheet_code");
    if (saved) {
      setAccessCode(saved);
      setUnlocked(true);
    }
  }, []);

  const unlock = () => {
    const code = codeInput.trim();
    if (!code) return;
    setAccessCode(code);
    window.localStorage.setItem("deedsheet_code", code);
    setUnlocked(true);
  };

  const [view, setView] = useState("inputs");
  const [subject, setSubject] = useState(initialSubject);
  const [agent, setAgent] = useState(initialAgent);
  const [comps, setComps] = useState(initialComps);
  const [highlights, setHighlights] = useState(
    "Remodeled kitchen with quartz counters, original hardwood floors, private fenced backyard, detached garage, five blocks to the beach"
  );
  const [tone, setTone] = useState("Classic");
  const [copyOut, setCopyOut] = useState(null);
  const [copyLoading, setCopyLoading] = useState(false);
  const [copyError, setCopyError] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);

  const adjusted = useMemo(
    () =>
      comps.map((c) => ({
        ...c,
        adjValue: c.price + c.adjustments.reduce((s, a) => s + a.amount, 0),
      })),
    [comps]
  );

  const lo = Math.min(...adjusted.map((c) => c.adjValue));
  const hi = Math.max(...adjusted.map((c) => c.adjValue));
  const mid =
    Math.round(adjusted.reduce((s, c) => s + c.adjValue, 0) / adjusted.length / 5000) * 5000;

  const updateAdj = (compId, idx, field, val) => {
    setComps((prev) =>
      prev.map((c) =>
        c.id === compId
          ? { ...c, adjustments: c.adjustments.map((a, i) => (i === idx ? { ...a, [field]: val } : a)) }
          : c
      )
    );
  };

  const updateComp = (compId, field, val) => {
    setComps((prev) => prev.map((c) => (c.id === compId ? { ...c, [field]: val } : c)));
  };

  const addAdjustment = (compId) => {
    setComps((prev) =>
      prev.map((c) =>
        c.id === compId
          ? { ...c, adjustments: [...c.adjustments, { label: "New adjustment", amount: 0 }] }
          : c
      )
    );
  };

  const removeAdjustment = (compId, idx) => {
    setComps((prev) =>
      prev.map((c) =>
        c.id === compId ? { ...c, adjustments: c.adjustments.filter((_, i) => i !== idx) } : c
      )
    );
  };

  const addComp = () => {
    setComps((prev) => [
      ...prev,
      {
        id: Date.now(),
        address: "New comp address",
        dist: "0.0 mi",
        sold: "Month Year",
        beds: 3, baths: 2, sqft: 1400,
        price: 1000000,
        adjustments: [],
      },
    ]);
  };

  const removeComp = (compId) => {
    setComps((prev) => (prev.length > 1 ? prev.filter((c) => c.id !== compId) : prev));
  };

  const generateCopy = async () => {
    setCopyLoading(true);
    setCopyError(null);
    try {
      const res = await fetch("/api/generate-copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, highlights, tone, listPrice: fmt(mid), accessCode }),
      });
      const data = await res.json();
      if (res.status === 401) {
        window.localStorage.removeItem("deedsheet_code");
        setUnlocked(false);
        throw new Error("That access code isn't valid. Enter the correct code to continue.");
      }
      if (!res.ok) throw new Error(data.error || "Generation failed");
      setCopyOut(data);
    } catch (err) {
      setCopyError(err.message || "Generation hit a snag. Try again in a moment.");
    } finally {
      setCopyLoading(false);
    }
  };

  const copyToClipboard = (key, text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1500);
    });
  };

  const tabBtn = (id, label) => (
    <button
      onClick={() => setView(id)}
      style={{
        padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", borderRadius: 3,
        border: "1px solid #A8853C",
        background: view === id ? "#A8853C" : "transparent",
        color: view === id ? "#16301F" : "#D9C48F",
      }}
    >
      {label}
    </button>
  );

  if (!unlocked) {
    return (
      <div style={{ background: "#1F3D2B", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Libre Franklin', sans-serif", padding: 20 }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Libre+Franklin:wght@400;500;600&display=swap');
          .fraunces { font-family: 'Fraunces', serif; }
          input:focus { outline: 2px solid #A8853C; outline-offset: 1px; }
        `}</style>
        <div style={{ background: "#EFE7D3", border: "1px solid #C9BC9C", borderRadius: 4, padding: "36px 34px", maxWidth: 380, width: "100%", textAlign: "center" }}>
          <div className="fraunces" style={{ fontSize: 26, fontWeight: 700, color: "#1F3D2B" }}>DeedSheet</div>
          <div style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "#8E3B2F", marginTop: 4, marginBottom: 24 }}>
            Client access
          </div>
          <input
            type="password"
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") unlock(); }}
            placeholder="Enter your access code"
            style={{ width: "100%", boxSizing: "border-box", padding: "11px 12px", fontSize: 15, border: "1px solid #A99C7A", borderRadius: 3, background: "#FBF7EC", color: "#26221A", textAlign: "center" }}
          />
          <button
            onClick={unlock}
            style={{ marginTop: 14, width: "100%", padding: "11px 0", fontSize: 14, fontWeight: 600, cursor: "pointer", borderRadius: 3, border: "none", background: "#1F3D2B", color: "#EFE7D3" }}
          >
            Enter
          </button>
          <div style={{ fontSize: 11, color: "#8A7E63", marginTop: 16, lineHeight: 1.5 }}>
            Don't have a code? Contact your DeedSheet provider.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: "#1F3D2B", minHeight: "100vh", fontFamily: "'Libre Franklin', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Libre+Franklin:wght@400;500;600&display=swap');
        .fraunces { font-family: 'Fraunces', serif; }
        input:focus, textarea:focus, select:focus { outline: 2px solid #A8853C; outline-offset: 1px; }
        @media print {
          .chrome { display: none !important; }
          .report-wrap { margin: 0 !important; box-shadow: none !important; border: none !important; }
          body { background: #EFE7D3 !important; }
        }
      `}</style>

      {/* Tool chrome */}
      <div className="chrome" style={{ background: "#16301F", borderBottom: "1px solid #2E5540" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div className="fraunces" style={{ color: "#EFE7D3", fontSize: 20, fontWeight: 700, letterSpacing: "0.02em" }}>
              DeedSheet
            </div>
            <div style={{ color: "#8FAE9B", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase" }}>
              CMA reports in two minutes
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {tabBtn("inputs", "Agent inputs")}
            {tabBtn("report", "Report preview")}
            {tabBtn("copy", "Listing copy")}
            <button
              onClick={() => { setView("report"); setTimeout(() => window.print(), 300); }}
              style={{ padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", borderRadius: 3, border: "1px solid #2E5540", background: "transparent", color: "#8FAE9B" }}
            >
              Print / PDF
            </button>
          </div>
        </div>
      </div>

      {view === "inputs" && (
        <div className="chrome" style={{ maxWidth: 760, margin: "28px auto", padding: "0 20px 60px" }}>
          <div style={{ color: "#D9C48F", fontSize: 13, marginBottom: 18, lineHeight: 1.6 }}>
            Fill in the subject property, your details, and your comps. Everything updates the report live.
          </div>

          {/* Agent details */}
          <div style={{ background: "#EFE7D3", borderRadius: 4, padding: 18, marginBottom: 14, border: "1px solid #C9BC9C" }}>
            <div className="fraunces" style={{ fontSize: 17, fontWeight: 600, color: "#26221A", marginBottom: 12 }}>
              Your details (appears on the report)
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
              {[
                ["name", "Name"],
                ["brokerage", "Brokerage"],
                ["license", "DRE #"],
                ["phone", "Phone"],
              ].map(([field, label]) => (
                <label key={field} style={labelStyle}>
                  {label}
                  <input
                    type="text"
                    value={agent[field]}
                    onChange={(e) => setAgent({ ...agent, [field]: e.target.value })}
                    style={{ ...inputStyle, width: 180 }}
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Subject property */}
          <div style={{ background: "#EFE7D3", borderRadius: 4, padding: 18, marginBottom: 14, border: "1px solid #C9BC9C" }}>
            <div className="fraunces" style={{ fontSize: 17, fontWeight: 600, color: "#26221A", marginBottom: 12 }}>
              Subject property
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
              <label style={labelStyle}>
                Street address
                <input type="text" value={subject.address} onChange={(e) => setSubject({ ...subject, address: e.target.value })} style={{ ...inputStyle, width: 220 }} />
              </label>
              <label style={labelStyle}>
                City / area / zip
                <input type="text" value={subject.city} onChange={(e) => setSubject({ ...subject, city: e.target.value })} style={{ ...inputStyle, width: 260 }} />
              </label>
              <label style={labelStyle}>
                Beds
                <input type="number" value={subject.beds} onChange={(e) => setSubject({ ...subject, beds: Number(e.target.value) || 0 })} style={{ ...inputStyle, width: 70 }} />
              </label>
              <label style={labelStyle}>
                Baths
                <input type="number" value={subject.baths} onChange={(e) => setSubject({ ...subject, baths: Number(e.target.value) || 0 })} style={{ ...inputStyle, width: 70 }} />
              </label>
              <label style={labelStyle}>
                Sqft
                <input type="number" value={subject.sqft} onChange={(e) => setSubject({ ...subject, sqft: Number(e.target.value) || 0 })} style={{ ...inputStyle, width: 100 }} />
              </label>
              <label style={labelStyle}>
                Lot
                <input type="text" value={subject.lot} onChange={(e) => setSubject({ ...subject, lot: e.target.value })} style={{ ...inputStyle, width: 110 }} />
              </label>
              <label style={labelStyle}>
                Year built
                <input type="number" value={subject.year} onChange={(e) => setSubject({ ...subject, year: Number(e.target.value) || 0 })} style={{ ...inputStyle, width: 90 }} />
              </label>
            </div>
          </div>

          {/* Comps */}
          {comps.map((c) => (
            <div key={c.id} style={{ background: "#EFE7D3", borderRadius: 4, padding: 18, marginBottom: 14, border: "1px solid #C9BC9C" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div className="fraunces" style={{ fontSize: 17, fontWeight: 600, color: "#26221A" }}>Comparable sale</div>
                <button onClick={() => removeComp(c.id)} style={{ padding: "4px 10px", fontSize: 12, cursor: "pointer", borderRadius: 3, border: "1px solid #A99C7A", background: "transparent", color: "#8E3B2F", fontWeight: 600 }}>
                  Remove
                </button>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginBottom: 12 }}>
                <label style={labelStyle}>
                  Address
                  <input type="text" value={c.address} onChange={(e) => updateComp(c.id, "address", e.target.value)} style={{ ...inputStyle, width: 200 }} />
                </label>
                <label style={labelStyle}>
                  Sold (month/yr)
                  <input type="text" value={c.sold} onChange={(e) => updateComp(c.id, "sold", e.target.value)} style={{ ...inputStyle, width: 110 }} />
                </label>
                <label style={labelStyle}>
                  Beds
                  <input type="number" value={c.beds} onChange={(e) => updateComp(c.id, "beds", Number(e.target.value) || 0)} style={{ ...inputStyle, width: 70 }} />
                </label>
                <label style={labelStyle}>
                  Baths
                  <input type="number" value={c.baths} onChange={(e) => updateComp(c.id, "baths", Number(e.target.value) || 0)} style={{ ...inputStyle, width: 70 }} />
                </label>
                <label style={labelStyle}>
                  Sqft
                  <input type="number" value={c.sqft} onChange={(e) => updateComp(c.id, "sqft", Number(e.target.value) || 0)} style={{ ...inputStyle, width: 100 }} />
                </label>
                <label style={labelStyle}>
                  Sale price
                  <input type="number" step="5000" value={c.price} onChange={(e) => updateComp(c.id, "price", Number(e.target.value) || 0)} style={{ ...inputStyle, width: 140 }} />
                </label>
              </div>
              {c.adjustments.map((a, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-end", marginBottom: 8, flexWrap: "wrap" }}>
                  <label style={labelStyle}>
                    Adjustment
                    <input type="text" value={a.label} onChange={(e) => updateAdj(c.id, i, "label", e.target.value)} style={{ ...inputStyle, width: 260, fontWeight: 400 }} />
                  </label>
                  <label style={labelStyle}>
                    Amount (+/−)
                    <input
                      type="number" step="5000" value={a.amount}
                      onChange={(e) => updateAdj(c.id, i, "amount", Number(e.target.value) || 0)}
                      style={{ ...inputStyle, width: 120, color: a.amount < 0 ? "#8E3B2F" : "#1F3D2B" }}
                    />
                  </label>
                  <button onClick={() => removeAdjustment(c.id, i)} style={{ padding: "7px 10px", fontSize: 12, cursor: "pointer", borderRadius: 3, border: "1px solid #A99C7A", background: "transparent", color: "#8E3B2F" }}>
                    ✕
                  </button>
                </div>
              ))}
              <button onClick={() => addAdjustment(c.id)} style={{ marginTop: 4, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", borderRadius: 3, border: "1px dashed #A99C7A", background: "transparent", color: "#1F3D2B" }}>
                + Add adjustment
              </button>
            </div>
          ))}
          <button onClick={addComp} style={{ padding: "10px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer", borderRadius: 3, border: "1px dashed #A8853C", background: "transparent", color: "#D9C48F" }}>
            + Add comparable sale
          </button>
        </div>
      )}

      {view === "copy" && (
        <div className="chrome" style={{ maxWidth: 760, margin: "28px auto", padding: "0 20px 60px" }}>
          <div style={{ color: "#D9C48F", fontSize: 13, marginBottom: 18, lineHeight: 1.6 }}>
            One click writes the MLS description, Instagram announcement, and email blast for {subject.address}. Add the highlights only you would know, pick a tone, and generate.
          </div>

          <div style={{ background: "#EFE7D3", borderRadius: 4, padding: 18, marginBottom: 14, border: "1px solid #C9BC9C" }}>
            <label style={{ ...labelStyle, display: "block" }}>
              Property highlights (your notes)
              <textarea
                value={highlights}
                onChange={(e) => setHighlights(e.target.value)}
                rows={3}
                style={{ ...inputStyle, width: "100%", fontWeight: 400, fontFamily: "'Libre Franklin', sans-serif", resize: "vertical", marginTop: 6, padding: "10px 12px", fontSize: 14 }}
              />
            </label>
            <div style={{ display: "flex", gap: 14, alignItems: "flex-end", marginTop: 14, flexWrap: "wrap" }}>
              <label style={labelStyle}>
                Tone
                <select value={tone} onChange={(e) => setTone(e.target.value)} style={{ ...inputStyle, width: 160, fontWeight: 400, padding: "8px 10px", fontSize: 14 }}>
                  <option>Classic</option>
                  <option>Luxury</option>
                  <option>Casual coastal</option>
                </select>
              </label>
              <button
                onClick={generateCopy}
                disabled={copyLoading}
                style={{ padding: "10px 22px", fontSize: 14, fontWeight: 600, cursor: copyLoading ? "wait" : "pointer", borderRadius: 3, border: "none", background: copyLoading ? "#8A7E63" : "#8E3B2F", color: "#EFE7D3" }}
              >
                {copyLoading ? "Writing…" : copyOut ? "Regenerate" : "Generate listing copy"}
              </button>
            </div>
            {copyError && (
              <div style={{ marginTop: 12, fontSize: 13, color: "#8E3B2F", fontWeight: 500 }}>{copyError}</div>
            )}
          </div>

          {copyOut && (
            <>
              {[
                { key: "mls", label: "MLS description", body: copyOut.mls, meta: `${(copyOut.mls || "").length} characters` },
                { key: "instagram", label: "Instagram caption", body: copyOut.instagram, meta: null },
                { key: "email", label: "Email blast", body: `Subject: ${copyOut.emailSubject}\n\n${copyOut.emailBody}`, meta: null },
              ].map((card) => (
                <div key={card.key} style={{ background: "#EFE7D3", borderRadius: 4, padding: 18, marginBottom: 14, border: "1px solid #C9BC9C", borderLeft: "3px solid #A8853C" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div>
                      <span className="fraunces" style={{ fontSize: 16, fontWeight: 600, color: "#1F3D2B" }}>{card.label}</span>
                      {card.meta && <span style={{ fontSize: 11, color: "#8A7E63", marginLeft: 10 }}>{card.meta}</span>}
                    </div>
                    <button
                      onClick={() => copyToClipboard(card.key, card.body)}
                      style={{ padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", borderRadius: 3, border: "1px solid #A99C7A", background: copiedKey === card.key ? "#1F3D2B" : "transparent", color: copiedKey === card.key ? "#EFE7D3" : "#6B6252" }}
                    >
                      {copiedKey === card.key ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <div style={{ fontSize: 14, lineHeight: 1.7, color: "#3A3428", whiteSpace: "pre-wrap" }}>{card.body}</div>
                </div>
              ))}
              <div style={{ fontSize: 11, color: "#8FAE9B", fontStyle: "italic" }}>
                Draft copy — review for accuracy and fair-housing compliance before publishing.
              </div>
            </>
          )}
        </div>
      )}

      {view === "report" && (
        <div className="report-wrap" style={{ maxWidth: 820, margin: "32px auto 60px", background: "#EFE7D3", boxShadow: "0 12px 40px rgba(0,0,0,0.45)", border: "1px solid #C9BC9C" }}>
          <div style={{ margin: 10, border: "3px double #1F3D2B", padding: "38px 40px 34px" }}>
            <div style={{ textAlign: "center", borderBottom: "1px solid #A99C7A", paddingBottom: 22, marginBottom: 26 }}>
              <div style={{ fontSize: 10, letterSpacing: "0.35em", color: "#8E3B2F", textTransform: "uppercase", marginBottom: 10 }}>
                Prepared exclusively for the property owner
              </div>
              <h1 className="fraunces" style={{ fontSize: 34, fontWeight: 700, color: "#1F3D2B", margin: 0, letterSpacing: "0.01em" }}>
                Comparative Market Analysis
              </h1>
              <div className="fraunces" style={{ fontSize: 18, color: "#26221A", marginTop: 8 }}>
                {subject.address} · {subject.city}
              </div>
              <div style={{ fontSize: 12, color: "#6B6252", marginTop: 6 }}>
                {subject.beds} bed · {subject.baths} bath · {subject.sqft.toLocaleString()} sqft · {subject.lot} lot · built {subject.year}
              </div>
            </div>

            <div style={{ marginBottom: 30 }}>
              <div style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: "#1F3D2B", fontWeight: 600, marginBottom: 14 }}>
                Suggested market position
              </div>
              <div style={{ position: "relative", height: 8, background: "#D8CCAC", borderRadius: 4, margin: "26px 8px 8px" }}>
                <div style={{ position: "absolute", left: "8%", right: "8%", top: 0, bottom: 0, background: "linear-gradient(90deg, #A8853C, #1F3D2B)", borderRadius: 4 }} />
                <div style={{ position: "absolute", left: "50%", top: -9, transform: "translateX(-50%)", width: 26, height: 26, borderRadius: "50%", background: "#8E3B2F", border: "3px solid #EFE7D3", boxShadow: "0 2px 6px rgba(0,0,0,0.3)" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "0 8px", marginTop: 10 }}>
                <div>
                  <div className="fraunces" style={{ fontSize: 19, fontWeight: 600, color: "#26221A" }}>{fmt(lo)}</div>
                  <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "#6B6252" }}>Low</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div className="fraunces" style={{ fontSize: 27, fontWeight: 700, color: "#8E3B2F" }}>{fmt(mid)}</div>
                  <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "#6B6252" }}>Recommended list</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="fraunces" style={{ fontSize: 19, fontWeight: 600, color: "#26221A" }}>{fmt(hi)}</div>
                  <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "#6B6252" }}>High</div>
                </div>
              </div>
            </div>

            <div style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: "#1F3D2B", fontWeight: 600, marginBottom: 12 }}>
              Comparable sales ledger
            </div>
            {adjusted.map((c) => (
              <div key={c.id} style={{ borderTop: "1px solid #C9BC9C", padding: "14px 4px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
                  <div>
                    <span className="fraunces" style={{ fontSize: 16, fontWeight: 600, color: "#26221A" }}>{c.address}</span>
                    <span style={{ fontSize: 12, color: "#6B6252", marginLeft: 10 }}>
                      {c.beds}bd/{c.baths}ba · {c.sqft.toLocaleString()} sqft · sold {c.sold}
                    </span>
                  </div>
                  <div style={{ fontSize: 14, color: "#26221A", fontWeight: 600 }}>{fmt(c.price)}</div>
                </div>
                {c.adjustments.map((a, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#6B6252", padding: "3px 0 0 16px" }}>
                    <span>{a.label}</span>
                    <span style={{ color: a.amount < 0 ? "#8E3B2F" : "#1F3D2B", fontWeight: 500 }}>
                      {a.amount >= 0 ? "+" : "−"}{fmt(Math.abs(a.amount))}
                    </span>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 600, color: "#1F3D2B", paddingTop: 6, marginTop: 6, borderTop: "1px dashed #C9BC9C" }}>
                  <span style={{ paddingLeft: 16 }}>Adjusted value</span>
                  <span>{fmt(c.adjValue)}</span>
                </div>
              </div>
            ))}

            <div style={{ marginTop: 30, background: "#E7DDC2", padding: "20px 22px", borderLeft: "3px solid #A8853C" }}>
              <div style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: "#1F3D2B", fontWeight: 600, marginBottom: 10 }}>
                Pricing strategy
              </div>
              <p style={{ fontSize: 14, lineHeight: 1.7, color: "#3A3428", margin: 0 }}>
                {adjusted.length} recent sale{adjusted.length !== 1 ? "s" : ""} establish a clear band for this home. After adjusting each comparable for condition, size, and location factors, the indicated value range runs from {fmt(lo)} to {fmt(hi)}. Listing at {fmt(mid)} positions the home to draw strong early attention while leaving room for competitive offers.
              </p>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 34, paddingTop: 20, borderTop: "1px solid #A99C7A", flexWrap: "wrap", gap: 14 }}>
              <div>
                <div className="fraunces" style={{ fontSize: 17, fontWeight: 600, color: "#1F3D2B" }}>{agent.name}</div>
                <div style={{ fontSize: 12, color: "#6B6252" }}>{agent.brokerage} · {agent.license}</div>
                <div style={{ fontSize: 12, color: "#6B6252" }}>{agent.phone}</div>
              </div>
              <div style={{ width: 92, height: 92, borderRadius: "50%", border: "2px solid #8E3B2F", display: "flex", alignItems: "center", justifyContent: "center", transform: "rotate(-8deg)", opacity: 0.85 }}>
                <div style={{ textAlign: "center", color: "#8E3B2F", fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", lineHeight: 1.5, fontWeight: 600 }}>
                  Prepared<br />
                  {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}<br />
                  {new Date().getFullYear()}
                </div>
              </div>
            </div>
            <p style={{ fontSize: 9.5, color: "#8A7E63", lineHeight: 1.6, marginTop: 18, marginBottom: 0 }}>
              This comparative market analysis reflects the professional opinion of the preparing agent based on comparable sales they selected. It is not an appraisal and was not prepared by a licensed appraiser. Value conclusions are the agent's own.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
