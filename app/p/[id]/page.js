"use client";

// Public, read-only presentation viewer: deedsheet.com/p/SHARECODE
// No login required — anyone with the link can view (but not edit).

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import Presentation from "../../components/Presentation";

export default function SharePage() {
  const params = useParams();
  const [state, setState] = useState({ loading: true, data: null, error: null });

  useEffect(() => {
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from("shares")
          .select("data")
          .eq("id", params.id)
          .single();
        if (error || !data) throw new Error("not found");
        setState({ loading: false, data: data.data, error: null });
      } catch {
        setState({ loading: false, data: null, error: "This presentation link is invalid or has been removed." });
      }
    };
    if (params?.id) load();
  }, [params]);

  if (state.loading) {
    return (
      <div style={{ position: "fixed", inset: 0, background: "#16301F", display: "flex", alignItems: "center", justifyContent: "center", color: "#D9C48F", fontFamily: "Georgia, serif", fontSize: 18 }}>
        Opening presentation…
      </div>
    );
  }

  if (state.error) {
    return (
      <div style={{ position: "fixed", inset: 0, background: "#16301F", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#EFE7D3", fontFamily: "Georgia, serif", gap: 10, padding: 20, textAlign: "center" }}>
        <div style={{ fontSize: 26, fontWeight: 700 }}>DeedSheet</div>
        <div style={{ color: "#D9C48F", fontSize: 15 }}>{state.error}</div>
      </div>
    );
  }

  const d = state.data || {};
  return (
    <Presentation
      subject={d.subject || {}}
      agent={d.agent || {}}
      comps={d.comps || []}
      mapPoints={d.mapPoints || null}
      netSheet={d.netSheet || null}
      deck={d.deck || null}
      meta={d.meta || null}
      geoKey={process.env.NEXT_PUBLIC_GEOAPIFY_KEY}
    />
  );
}
