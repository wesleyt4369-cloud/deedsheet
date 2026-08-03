"use client";

import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("DeedSheet error:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ position: "fixed", inset: 0, background: "#16301F", zIndex: 10001, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "Arial, sans-serif" }}>
          <div style={{ background: "#EFE7D3", border: "1px solid #C9BC9C", borderRadius: 5, maxWidth: 640, width: "100%", padding: "26px 28px" }}>
            <div style={{ fontFamily: "Georgia, serif", fontSize: 21, fontWeight: 700, color: "#1F3D2B" }}>
              Something went wrong in the presentation
            </div>
            <div style={{ fontSize: 13.5, color: "#6B6252", marginTop: 8, lineHeight: 1.6 }}>
              Your report data is safe — nothing was lost. Close this and try again, or send this message along:
            </div>
            <pre style={{ marginTop: 14, padding: "12px 14px", background: "#FBF7EC", border: "1px solid #A99C7A", borderRadius: 3, fontSize: 12, color: "#8E3B2F", whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: 220, overflow: "auto" }}>
              {String(this.state.error?.message || this.state.error)}
            </pre>
            <button
              onClick={() => { this.setState({ error: null }); this.props.onReset && this.props.onReset(); }}
              style={{ marginTop: 16, padding: "10px 20px", fontSize: 13.5, fontWeight: 700, cursor: "pointer", borderRadius: 3, border: "none", background: "#1F3D2B", color: "#EFE7D3" }}
            >
              Back to the report
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
