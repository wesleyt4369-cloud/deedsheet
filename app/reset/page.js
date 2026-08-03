"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const PARCH = "#EFE7D3", GREEN = "#1F3D2B", RED = "#8E3B2F", MUTE = "#6B6252", EDGE = "#C9BC9C";

export default function ResetPasswordPage() {
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let settled = false;
    const check = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) { setHasSession(true); setReady(true); settled = true; }
    };
    check();
    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s) { setHasSession(true); setReady(true); settled = true; }
    });
    // Recovery links take a moment to establish a session
    const t = setTimeout(() => { if (!settled) setReady(true); }, 2500);
    return () => { listener.subscription.unsubscribe(); clearTimeout(t); };
  }, []);

  const submit = async () => {
    setError(null);
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    if (password !== confirm) return setError("Those passwords don't match.");
    setBusy(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) throw err;
      setDone(true);
    } catch (e) {
      setError(e.message || "Could not update password.");
    } finally {
      setBusy(false);
    }
  };

  const card = (children) => (
    <div style={{ background: GREEN, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "'Libre Franklin', Arial, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Libre+Franklin:wght@400;500;600&display=swap');`}</style>
      <div style={{ background: PARCH, border: `1px solid ${EDGE}`, borderRadius: 5, padding: "34px 32px", maxWidth: 400, width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 22 }}>
          <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 26, fontWeight: 700, color: GREEN }}>DeedSheet</div>
          <div style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: RED, marginTop: 4 }}>
            Set a new password
          </div>
        </div>
        {children}
      </div>
    </div>
  );

  const input = {
    display: "block", width: "100%", boxSizing: "border-box", marginTop: 5, padding: "10px 12px",
    fontSize: 15, border: "1px solid #A99C7A", borderRadius: 3, background: "#FBF7EC", color: "#26221A",
  };
  const label = { fontSize: 11, color: MUTE, textTransform: "uppercase", letterSpacing: "0.08em" };

  if (!ready) return card(<div style={{ textAlign: "center", color: MUTE, fontSize: 14 }}>One moment…</div>);

  if (done) {
    return card(
      <>
        <div style={{ fontSize: 14, color: "#3A3428", lineHeight: 1.7, textAlign: "center" }}>
          Your password has been updated. You can log in with it now.
        </div>
        <button
          onClick={() => { window.location.href = "/"; }}
          style={{ marginTop: 20, width: "100%", padding: "11px 0", fontSize: 14, fontWeight: 700, cursor: "pointer", borderRadius: 3, border: "none", background: GREEN, color: PARCH }}
        >
          Go to DeedSheet
        </button>
      </>
    );
  }

  if (!hasSession) {
    return card(
      <>
        <div style={{ fontSize: 14, color: "#3A3428", lineHeight: 1.7, textAlign: "center" }}>
          This reset link is invalid or has expired. Request a new one from the login screen.
        </div>
        <button
          onClick={() => { window.location.href = "/"; }}
          style={{ marginTop: 20, width: "100%", padding: "11px 0", fontSize: 14, fontWeight: 600, cursor: "pointer", borderRadius: 3, border: `1px solid ${EDGE}`, background: "transparent", color: MUTE }}
        >
          Back to login
        </button>
      </>
    );
  }

  return card(
    <>
      <label style={label}>
        New password
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={input} placeholder="At least 6 characters" />
      </label>
      <label style={{ ...label, display: "block", marginTop: 14 }}>
        Confirm password
        <input
          type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          style={input} placeholder="Type it again"
        />
      </label>
      {error && <div style={{ marginTop: 12, fontSize: 13, color: RED, fontWeight: 500 }}>{error}</div>}
      <button
        onClick={submit}
        disabled={busy}
        style={{ marginTop: 20, width: "100%", padding: "11px 0", fontSize: 14, fontWeight: 700, cursor: busy ? "wait" : "pointer", borderRadius: 3, border: "none", background: GREEN, color: PARCH }}
      >
        {busy ? "Updating…" : "Update password"}
      </button>
    </>
  );
}
