"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import Presentation from "../components/Presentation";
import SetupWizard from "../components/SetupWizard";
import ErrorBoundary from "../components/ErrorBoundary";
import { DEFAULT_META, THEMES } from "../lib/presets";

const fmt = (n) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const initialSubject = {
  address: "4482 Niagara Ave",
  city: "Ocean Beach, San Diego, CA 92107",
  propertyType: "Single-Family Home",
  beds: 3, baths: 2, sqft: 1450, livingSqft: "", lot: "4,800 sqft", year: 1948,
  lotSize: "4800", lotUnits: "sqft", lotDimensions: "",
  taxAmount: "", taxYear: "", parcel: "", county: "San Diego County",
  hoaDues: "", maintenanceFee: "", features: "",
  photo: null,
};

const PROPERTY_TYPES = [
  "Single-Family Home", "Condominium", "Townhouse", "Multi-Family",
  "Manufactured Home", "Land / Lot", "Commercial",
];

const lotDisplay = (s) =>
  s.lotSize ? `${Number(s.lotSize).toLocaleString()} ${s.lotUnits || "sqft"}` : (s.lot || "");

// Resizes an uploaded image in the browser to keep reports and drafts light
const fileToResizedDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = () => { img.src = reader.result; };
    reader.onerror = reject;
    img.onload = () => {
      const max = 1200;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.8));
    };
    img.onerror = reject;
    reader.readAsDataURL(file);
  });

const initialAgent = {
  name: "Your Name",
  brokerage: "Your Brokerage",
  license: "DRE #00000000",
  phone: "(619) 555-0000",
  logo: null,
  photo: null,
  bio: "",
  introEnabled: true,
};

const initialComps = [
  {
    id: 1,
    address: "4622 Del Monte Ave",
    dist: "0.3 mi",
    sold: "May 2026",
    beds: 3, baths: 2, sqft: 1410,
    price: 1385000,
    photos: [], status: "Sold", dom: "", lotSize: "", year: "", remarks: "",
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
    photos: [], status: "Sold", dom: "", lotSize: "", year: "", remarks: "",
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
    photos: [], status: "Sold", dom: "", lotSize: "", year: "", remarks: "",
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

const cardStyle = {
  background: "#EFE7D3", borderRadius: 4, padding: 18, marginBottom: 14, border: "1px solid #C9BC9C",
};

export default function DeedSheet() {
  // ---------- auth ----------
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [authMode, setAuthMode] = useState("login"); // login | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState(null);
  const [authBusy, setAuthBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const handleAuth = async () => {
    setAuthBusy(true);
    setAuthError(null);
    try {
      const fn =
        authMode === "signup"
          ? supabase.auth.signUp({ email, password })
          : supabase.auth.signInWithPassword({ email, password });
      const { error } = await fn;
      if (error) throw error;
    } catch (err) {
      setAuthError(err.message || "Something went wrong. Try again.");
    } finally {
      setAuthBusy(false);
    }
  };

  const [resetBusy, setResetBusy] = useState(false);
  const [resetMsg, setResetMsg] = useState(null);

  const sendReset = async () => {
    setAuthError(null);
    setResetMsg(null);
    if (!email) {
      setAuthError("Type your email above first, then click reset.");
      return;
    }
    setResetBusy(true);
    try {
      const site = (process.env.NEXT_PUBLIC_SITE_URL || window.location.origin).replace(/\/$/, "");
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${site}/reset` });
      if (error) throw error;
      setResetMsg("Check your email for a reset link. It expires in an hour.");
    } catch (e) {
      setAuthError(e.message || "Could not send the reset email.");
    } finally {
      setResetBusy(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setView("inputs");
  };

  // ---------- subscription ----------
  const [sub, setSub] = useState({ loading: true, billingEnabled: false, owner: false, active: false, status: null, hasBilling: false });
  const [billingBusy, setBillingBusy] = useState(false);
  const [billingError, setBillingError] = useState(null);

  const loadSubscription = async (token) => {
    const access = token || session?.access_token;
    if (!access) return;
    try {
      const res = await fetch("/api/billing-status", {
        method: "POST",
        headers: { Authorization: `Bearer ${access}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "status check failed");
      setSub({
        loading: false,
        billingEnabled: !!data.billingEnabled,
        owner: !!data.owner,
        active: !!data.active,
        status: data.status,
        hasBilling: !!data.hasBilling,
        periodEnd: data.periodEnd,
      });
    } catch (e) {
      // Never lock someone out because of a network blip
      setSub({ loading: false, billingEnabled: false, owner: false, active: true, status: null, hasBilling: false });
    }
  };

  useEffect(() => {
    if (!session) {
      setSub({ loading: true, active: false, status: null, hasBilling: false });
      return;
    }
    loadSubscription(session.access_token);
    // After returning from Stripe the webhook may take a moment — re-check briefly
    if (typeof window !== "undefined" && window.location.search.includes("billing=success")) {
      const t1 = setTimeout(() => loadSubscription(session.access_token), 2500);
      const t2 = setTimeout(() => loadSubscription(session.access_token), 6000);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const startCheckout = async () => {
    setBillingBusy(true);
    setBillingError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Checkout failed");
      window.location.href = data.url;
    } catch (e) {
      setBillingError(e.message);
      setBillingBusy(false);
    }
  };

  const openBillingPortal = async () => {
    setBillingBusy(true);
    setBillingError(null);
    try {
      const res = await fetch("/api/portal", {
        method: "POST",
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not open billing");
      window.location.href = data.url;
    } catch (e) {
      setBillingError(e.message);
      setBillingBusy(false);
    }
  };

  const inEditorRef = useRef(false);

  // ---------- toasts & confirmations ----------
  const [toasts, setToasts] = useState([]);
  const toast = (message, tone = "ok") => {
    const id = Math.random().toString(36).slice(2, 8);
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  };
  const [confirmState, setConfirmState] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const askConfirm = (opts) => setConfirmState(opts);

  // ---------- agent profile (saved branding) ----------
  const [savedProfile, setSavedProfile] = useState(null);
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileMsg, setProfileMsg] = useState(null);

  const loadProfile = async () => {
    if (!session) return;
    const { data } = await supabase
      .from("profiles")
      .select("data")
      .eq("user_id", session.user.id)
      .maybeSingle();
    if (data?.data) {
      setSavedProfile(data.data);
      // Apply to the current blank report so they never retype their branding
      setAgent((prev) =>
        prev.name === initialAgent.name ? { ...initialAgent, ...data.data } : prev
      );
    }
  };

  useEffect(() => {
    if (session) loadProfile();
    else setSavedProfile(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const [profileDraft, setProfileDraft] = useState(initialAgent);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileReturnTo, setProfileReturnTo] = useState(null);

  useEffect(() => {
    if (savedProfile) setProfileDraft({ ...initialAgent, ...savedProfile });
  }, [savedProfile]);

  const setProfileImage = async (field, file) => {
    if (!file) return;
    try {
      const dataUrl = await fileToResizedDataUrl(file);
      setProfileDraft((prev) => ({ ...prev, [field]: dataUrl }));
    } catch { /* ignore bad files */ }
  };

  const saveProfilePage = async () => {
    setProfileBusy(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .upsert({ user_id: session.user.id, data: profileDraft, updated_at: new Date().toISOString() });
      if (error) throw error;
      setSavedProfile(profileDraft);
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2500);

      if (profileReturnTo) {
        // they came here mid-report — put them back where they left off
        const hasNoBranding = agent.name === initialAgent.name;
        if (hasNoBranding) setAgent({ ...initialAgent, ...profileDraft });
        setStep(profileReturnTo.step || 3);
        setView(profileReturnTo.view || "inputs");
        setProfileReturnTo(null);
        window.scrollTo(0, 0);
        toast(hasNoBranding ? "Profile saved and applied to this report." : "Profile saved.");
      } else {
        toast("Profile saved.");
      }
    } catch (e) {
      toast("Could not save profile: " + (e.message || "unknown error"), "bad");
    } finally {
      setProfileBusy(false);
    }
  };

  const saveProfile = async () => {
    setProfileBusy(true);
    setProfileMsg(null);
    try {
      const { error } = await supabase
        .from("profiles")
        .upsert({ user_id: session.user.id, data: agent, updated_at: new Date().toISOString() });
      if (error) throw error;
      setSavedProfile(agent);
      toast("Profile saved — new reports start with this branding.");
    } catch (e) {
      toast("Could not save profile: " + (e.message || "unknown error"), "bad");
    } finally {
      setProfileBusy(false);
    }
  };

  const applyProfile = () => {
    if (!savedProfile) return;
    setAgent({ ...initialAgent, ...savedProfile });
    toast("Branding restored from your profile.");
  };

  // ---------- report state ----------
  const [view, setView] = useState("home");
  const [subject, setSubject] = useState(initialSubject);
  const [agent, setAgent] = useState(initialAgent);
  const [comps, setComps] = useState(initialComps);
  const [highlights, setHighlights] = useState(
    "Remodeled kitchen with quartz counters, original hardwood floors, private fenced backyard, detached garage, five blocks to the beach"
  );
  const [tone, setTone] = useState("Classic");
  const [step, setStep] = useState(1);
  const [search, setSearch] = useState("");
  const [deck, setDeck] = useState({ hidden: {}, text: {}, custom: [] });
  const [meta, setMeta] = useState(DEFAULT_META);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [netSheet, setNetSheet] = useState({
    enabled: true,
    priceOverride: "",   // blank = use recommended list price
    commissionPct: 5,    // total commission, both sides
    closingPct: 1.5,     // title, escrow & closing costs
    transferPct: 0.11,   // CA documentary transfer tax ($1.10 per $1,000)
    payoff: 0,           // remaining mortgage payoff
    credits: 0,          // repairs / seller credits
  });
  const [copyOut, setCopyOut] = useState(null);
  const [copyLoading, setCopyLoading] = useState(false);
  const [copyError, setCopyError] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);

  // ---------- drafts ----------
  const [drafts, setDrafts] = useState([]);
  const [draftsLoading, setDraftsLoading] = useState(true);
  const [draftName, setDraftName] = useState("");
  const [currentDraftId, setCurrentDraftId] = useState(null);
  const [draftMsg, setDraftMsg] = useState(null);
  const [draftBusy, setDraftBusy] = useState(false);

  const loadDrafts = async () => {
    setDraftsLoading(true);
    const { data, error } = await supabase
      .from("drafts")
      .select("id, name, updated_at, address:data->subject->>address, city:data->subject->>city")
      .order("updated_at", { ascending: false });
    if (!error) setDrafts(data || []);
    setDraftsLoading(false);
  };

  useEffect(() => {
    if (session) loadDrafts();
    else {
      setDrafts([]);
      setCurrentDraftId(null);
    }
  }, [session]);

  const [saveState, setSaveState] = useState({ status: "idle", at: null });
  const dirtyRef = useRef(false);
  const snapshotRef = useRef(null);
  const saveTimerRef = useRef(null);

  const autoSave = async () => {
    if (!session) return;
    const name = draftName.trim() || subject.address || "Untitled report";
    setSaveState({ status: "saving", at: null });
    const payload = { subject, agent, comps, highlights, tone, netSheet, deck, meta };
    try {
      if (currentDraftId) {
        const { error } = await supabase.from("drafts")
          .update({ name, data: payload, updated_at: new Date().toISOString() })
          .eq("id", currentDraftId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("drafts")
          .insert({ name, data: payload, user_id: session.user.id })
          .select("id").single();
        if (error) throw error;
        setCurrentDraftId(data.id);
        if (!draftName) setDraftName(name);
      }
      setSaveState({ status: "saved", at: new Date() });
      loadDrafts();
    } catch (e) {
      setSaveState({ status: "error", at: null });
      toast("Couldn't save: " + (e.message || "unknown error"), "bad");
    }
  };

  // Watch the report for changes and save quietly a moment later
  useEffect(() => {
    if (!inEditorRef.current || !session) return;
    const snap = JSON.stringify({ subject, agent, comps, highlights, tone, netSheet, deck, meta });
    if (snapshotRef.current === null) { snapshotRef.current = snap; return; }
    if (snap === snapshotRef.current) return;
    snapshotRef.current = snap;
    dirtyRef.current = true;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => { autoSave(); dirtyRef.current = false; }, 1400);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject, agent, comps, highlights, tone, netSheet, deck, meta]);

  const saveDraft = async () => {
    const name = draftName.trim() || subject.address || "Untitled report";
    setDraftBusy(true);
    setDraftMsg(null);
    const payload = { subject, agent, comps, highlights, tone, netSheet, deck, meta };
    try {
      if (currentDraftId) {
        const { error } = await supabase
          .from("drafts")
          .update({ name, data: payload, updated_at: new Date().toISOString() })
          .eq("id", currentDraftId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("drafts")
          .insert({ name, data: payload, user_id: session.user.id })
          .select("id")
          .single();
        if (error) throw error;
        setCurrentDraftId(data.id);
      }
      setDraftMsg("Saved.");
      await loadDrafts();
    } catch (err) {
      setDraftMsg("Save failed: " + (err.message || "unknown error"));
    } finally {
      setDraftBusy(false);
      setTimeout(() => setDraftMsg(null), 2500);
    }
  };

  const openDraft = async (id) => {
    setDraftBusy(true);
    const { data, error } = await supabase
      .from("drafts")
      .select("id, name, data")
      .eq("id", id)
      .single();
    setDraftBusy(false);
    if (error || !data) return;
    const d = data.data || {};
    if (d.subject) setSubject(d.subject);
    if (d.agent) setAgent(d.agent);
    if (d.comps) setComps(d.comps);
    if (d.highlights) setHighlights(d.highlights);
    if (d.tone) setTone(d.tone);
    if (d.netSheet) setNetSheet(d.netSheet);
    if (d.deck) setDeck(d.deck);
    if (d.meta) setMeta(d.meta);
    setCurrentDraftId(data.id);
    setDraftName(data.name);
    setCopyOut(null);
    snapshotRef.current = null;
    setSaveState({ status: "idle", at: null });
    setStep(1);
    setView("inputs");
    window.scrollTo(0, 0);
  };

  const deleteDraft = async (id) => {
    await supabase.from("drafts").delete().eq("id", id);
    if (id === currentDraftId) {
      setCurrentDraftId(null);
      setDraftName("");
    }
    await loadDrafts();
  };

  const newReport = () => {
    setSubject(initialSubject);
    setAgent(savedProfile ? { ...initialAgent, ...savedProfile } : agent);
    setComps(initialComps);
    setCopyOut(null);
    setCurrentDraftId(null);
    setDraftName("");
    setDeck({ hidden: {}, text: {}, custom: [] });
    setMeta(DEFAULT_META);
    snapshotRef.current = null;
    setSaveState({ status: "idle", at: null });
    setStep(1);
    setView("inputs");
    setWizardOpen(true);
    setDraftName("");
  };

  // ---------- calculations ----------
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

  const netBase = Number(netSheet.priceOverride) || mid;
  const netLines = {
    commission: Math.round((netBase * (Number(netSheet.commissionPct) || 0)) / 100),
    closing: Math.round((netBase * (Number(netSheet.closingPct) || 0)) / 100),
    transfer: Math.round((netBase * (Number(netSheet.transferPct) || 0)) / 100),
    payoff: Number(netSheet.payoff) || 0,
    credits: Number(netSheet.credits) || 0,
  };
  const netProceeds =
    netBase - netLines.commission - netLines.closing - netLines.transfer - netLines.payoff - netLines.credits;

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
        photo: null, photos: [], status: "Sold", dom: "", lotSize: "", year: "", remarks: "",
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
      const token = session?.access_token;
      const res = await fetch("/api/generate-copy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ subject, highlights, tone, listPrice: fmt(mid) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      setCopyOut(data);
    } catch (err) {
      setCopyError(err.message || "Generation hit a snag. Try again in a moment.");
    } finally {
      setCopyLoading(false);
    }
  };

  const [slidesBusy, setSlidesBusy] = useState(false);

  // ---------- MLS paste import ----------
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importBusy, setImportBusy] = useState(false);
  const [importError, setImportError] = useState(null);
  const [importMsg, setImportMsg] = useState(null);

  const importComps = async () => {
    setImportBusy(true);
    setImportError(null);
    setImportMsg(null);
    try {
      const token = session?.access_token;
      const res = await fetch("/api/parse-comps", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ pasted: importText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");

      const imported = data.comps.map((c, i) => ({
        id: Date.now() + i,
        address: c.address || "Unknown address",
        dist: "",
        sold: c.sold || "Recent",
        beds: Number(c.beds) || 0,
        baths: Number(c.baths) || 0,
        sqft: Number(c.sqft) || 0,
        price: Number(c.price) || 0,
        photo: null,
        photos: [],
        status: c.status || "Sold",
        dom: c.dom || "",
        lotSize: c.lotSize || "",
        year: c.year || "",
        remarks: c.remarks || "",
        adjustments: [],
      }));
      setComps(imported);
      if (data.subject && data.subject.address) {
        setSubject((prev) => ({
          ...prev,
          address: data.subject.address,
          city: data.subject.city || prev.city,
          beds: Number(data.subject.beds) || prev.beds,
          baths: Number(data.subject.baths) || prev.baths,
          sqft: Number(data.subject.sqft) || prev.sqft,
        }));
      }
      toast(`Imported ${imported.length} comp${imported.length !== 1 ? "s" : ""} — add your adjustments.`);
      setImportText("");
      setImportOpen(false);
    } catch (err) {
      setImportError(err.message || "Import failed. Try pasting again.");
    } finally {
      setImportBusy(false);
    }
  };

  const exportSlides = async () => {
    setSlidesBusy(true);
    try {
      const PptxGenJS = (await import("pptxgenjs")).default;
      const pptx = new PptxGenJS();
      pptx.defineLayout({ name: "WIDE", width: 13.33, height: 7.5 });
      pptx.layout = "WIDE";

      const TH = THEMES[meta?.theme] || THEMES.classic;
      const hex = (c) => c.replace("#", "");
      const GREEN = hex(TH.primary), PARCH = hex(TH.bg), CARD = hex(TH.card),
        BRASS = hex(TH.accent), RED = hex(TH.alert), INK = hex(TH.ink), MUTE = hex(TH.mute);
      const SERIF = "Georgia";
      const SANS = "Arial";

      const base = (slide) => {
        slide.background = { color: PARCH };
        slide.addShape(pptx.ShapeType.rect, {
          x: 0.3, y: 0.3, w: 12.73, h: 6.9,
          fill: { color: PARCH }, line: { color: GREEN, width: 2.5 },
        });
      };

      const hid = (k) => !!(deck?.hidden || {})[k];
      const txt = (k, fallback) => (deck?.text || {})[k] ?? fallback;
      const addCustomAfter = (key) => {
        (deck?.custom || []).filter((c) => c.after === key).forEach((c) => {
          const cs = pptx.addSlide();
          base(cs);
          cs.addText(c.title || "", {
            x: 1.0, y: 0.9, w: 11.3, h: 0.9, fontFace: SERIF, fontSize: 32, color: GREEN, bold: true,
          });
          cs.addShape(pptx.ShapeType.rect, { x: 1.0, y: 1.95, w: 2.2, h: 0.04, fill: { color: BRASS } });
          cs.addText(c.body || "", {
            x: 1.0, y: 2.3, w: 11.3, h: 4.0, fontFace: SERIF, fontSize: 18, color: INK, lineSpacing: 30, valign: "top",
          });
        });
      };

      // ---- Slide 1: Cover ----
      let s = pptx.addSlide();
      base(s);
      const hasHero = !!subject.photo;
      s.addText(txt("cover.eyebrow", "Prepared exclusively for the property owner").toUpperCase(), {
        x: 0.6, y: hasHero ? 0.75 : 1.3, w: 12.1, h: 0.4, align: "center",
        fontFace: SANS, fontSize: 11, color: RED, charSpacing: 6, bold: true,
      });
      s.addText(txt("cover.title", "Comparative Market Analysis"), {
        x: 0.6, y: hasHero ? 1.2 : 1.9, w: 12.1, h: 1.0, align: "center",
        fontFace: SERIF, fontSize: hasHero ? 38 : 44, color: GREEN, bold: true,
      });
      s.addText(`${subject.address} · ${subject.city}`, {
        x: 0.6, y: hasHero ? 2.25 : 3.1, w: 12.1, h: 0.55, align: "center",
        fontFace: SERIF, fontSize: 20, color: INK,
      });
      s.addText(
        `${subject.beds} bed · ${subject.baths} bath · ${subject.sqft.toLocaleString()} sqft · ${subject.lot} lot · built ${subject.year}`,
        { x: 0.6, y: hasHero ? 2.8 : 3.7, w: 12.1, h: 0.4, align: "center", fontFace: SANS, fontSize: 12, color: MUTE }
      );
      if (hasHero) {
        s.addImage({
          data: subject.photo,
          x: 3.47, y: 3.35, w: 6.4, h: 2.9,
          sizing: { type: "cover", w: 6.4, h: 2.9 },
        });
        s.addText(`Prepared by ${agent.name} · ${agent.brokerage} · ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`, {
          x: 0.6, y: 6.5, w: 12.1, h: 0.4, align: "center", fontFace: SANS, fontSize: 12, color: MUTE,
        });
      } else {
        s.addShape(pptx.ShapeType.line, { x: 4.5, y: 4.5, w: 4.3, h: 0, line: { color: BRASS, width: 1.5 } });
        s.addText(`Prepared by ${agent.name} · ${agent.brokerage}`, {
          x: 0.6, y: 4.8, w: 12.1, h: 0.4, align: "center", fontFace: SANS, fontSize: 13, color: MUTE,
        });
        s.addText(
          new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
          { x: 0.6, y: 5.2, w: 12.1, h: 0.4, align: "center", fontFace: SANS, fontSize: 12, color: RED }
        );
      }

      if (agent.logo) {
        try {
          s.addImage({ data: agent.logo, x: 5.67, y: hasHero ? 6.55 : 5.75, w: 2.0, h: 0.62, sizing: { type: "contain", w: 2.0, h: 0.62 } });
        } catch (e) { console.error("Logo skipped:", e); }
      }

      addCustomAfter("cover");

      // ---- Introduction slide ----
      if (agent.introEnabled !== false && (agent.photo || agent.bio) && !hid("intro")) {
        const is = pptx.addSlide();
        base(is);
        is.addText(txt("intro.eyebrow", "Your agent").toUpperCase(), {
          x: 0.8, y: 0.7, w: 11.7, h: 0.4, fontFace: SANS, fontSize: 13, color: GREEN, charSpacing: 5, bold: true,
        });
        const hasHeadshot = !!agent.photo;
        if (hasHeadshot) {
          try {
            is.addImage({ data: agent.photo, x: 0.9, y: 1.5, w: 3.6, h: 4.5, sizing: { type: "cover", w: 3.6, h: 4.5 } });
            is.addShape(pptx.ShapeType.rect, { x: 0.9, y: 1.5, w: 3.6, h: 4.5, fill: { type: "none" }, line: { color: BRASS, width: 1.5 } });
          } catch (e) { console.error("Headshot skipped:", e); }
        }
        const tx = hasHeadshot ? 5.0 : 0.9;
        const tw = hasHeadshot ? 7.4 : 11.5;
        is.addText(agent.name, { x: tx, y: 1.6, w: tw, h: 0.8, fontFace: SERIF, fontSize: 32, color: GREEN, bold: true });
        is.addText(`${agent.brokerage} · ${agent.license}`, { x: tx, y: 2.35, w: tw, h: 0.4, fontFace: SANS, fontSize: 14, color: MUTE });
        is.addShape(pptx.ShapeType.rect, { x: tx, y: 2.95, w: 1.4, h: 0.04, fill: { color: BRASS } });
        is.addText(txt("intro.body", agent.bio || ""), {
          x: tx, y: 3.25, w: tw, h: 2.3, fontFace: SERIF, fontSize: 17, color: INK, lineSpacing: 28, valign: "top",
        });
        is.addText(agent.phone, { x: tx, y: 5.7, w: tw, h: 0.4, fontFace: SANS, fontSize: 15, color: INK, bold: true });
        addCustomAfter("intro");
      }

      // ---- Property details ----
      const detailPairs = [
        ["Property type", subject.propertyType],
        ["Bedrooms", subject.beds],
        ["Bathrooms", subject.baths],
        ["Total sqft", subject.sqft ? Number(subject.sqft).toLocaleString() : ""],
        ["Living area", subject.livingSqft ? `${Number(subject.livingSqft).toLocaleString()} sqft` : ""],
        ["Lot size", lotDisplay(subject)],
        ["Lot dimensions", subject.lotDimensions],
        ["Year built", subject.year],
        ["County", subject.county],
        ["Parcel #", subject.parcel],
        ["Annual tax", subject.taxAmount ? `$${Number(subject.taxAmount).toLocaleString()}${subject.taxYear ? ` (${subject.taxYear})` : ""}` : ""],
        ["HOA dues", subject.hoaDues ? `$${Number(subject.hoaDues).toLocaleString()}/mo` : ""],
      ].filter((r) => r[1] !== "" && r[1] !== null && r[1] !== undefined && String(r[1]).trim() !== "");

      if (meta?.sections?.details !== false && detailPairs.length && !hid("details")) {
        const ds = pptx.addSlide();
        base(ds);
        ds.addText(txt("details.eyebrow", "Property details").toUpperCase(), {
          x: 0.8, y: 0.7, w: 11.7, h: 0.4, fontFace: SANS, fontSize: 13, color: GREEN, charSpacing: 5, bold: true,
        });
        ds.addText(subject.address, {
          x: 0.8, y: 1.15, w: 11.7, h: 0.6, fontFace: SERIF, fontSize: 26, color: INK, bold: true,
        });
        const half = Math.ceil(detailPairs.length / 2);
        const mkRows = (arr) => arr.map((r) => [
          { text: String(r[0]), options: { fontFace: SANS, fontSize: 12, color: MUTE } },
          { text: String(r[1]), options: { fontFace: SANS, fontSize: 12, color: INK, bold: true, align: "right" } },
        ]);
        ds.addTable(mkRows(detailPairs.slice(0, half)), {
          x: 0.8, y: 2.0, w: 5.6, colW: [3.2, 2.4], border: { type: "none" }, fill: { color: CARD }, rowH: 0.38, margin: 0.07,
        });
        if (detailPairs.length > half) {
          ds.addTable(mkRows(detailPairs.slice(half)), {
            x: 6.9, y: 2.0, w: 5.6, colW: [3.2, 2.4], border: { type: "none" }, fill: { color: CARD }, rowH: 0.38, margin: 0.07,
          });
        }
        const feats = (subject.features || "").split(/\n|,/).map((f) => f.trim()).filter(Boolean);
        if (feats.length) {
          ds.addText("FEATURES", { x: 0.8, y: 5.6, w: 11.7, h: 0.3, fontFace: SANS, fontSize: 11, color: GREEN, charSpacing: 4, bold: true });
          ds.addText(feats.slice(0, 8).join("  ·  "), {
            x: 0.8, y: 5.95, w: 11.7, h: 0.7, fontFace: SANS, fontSize: 12, color: INK, valign: "top",
          });
        }
        addCustomAfter("details");
      }

      // ---- Slide 2: Market position ----
      s = pptx.addSlide();
      base(s);
      s.addText("SUGGESTED MARKET POSITION", {
        x: 0.8, y: 0.8, w: 11.7, h: 0.4, fontFace: SANS, fontSize: 13, color: GREEN, charSpacing: 5, bold: true,
      });
      const cols = [
        { label: "LOW", val: fmt(lo), color: INK, size: 30 },
        { label: "RECOMMENDED LIST", val: fmt(mid), color: RED, size: 44 },
        { label: "HIGH", val: fmt(hi), color: INK, size: 30 },
      ];
      cols.forEach((c, i) => {
        s.addText(c.val, {
          x: 0.8 + i * 3.9, y: 2.6, w: 3.9, h: 1.0, align: "center",
          fontFace: SERIF, fontSize: c.size, color: c.color, bold: true,
        });
        s.addText(c.label, {
          x: 0.8 + i * 3.9, y: 3.7, w: 3.9, h: 0.4, align: "center",
          fontFace: SANS, fontSize: 11, color: MUTE, charSpacing: 3,
        });
      });
      s.addText(
        `Based on ${adjusted.length} adjusted comparable sale${adjusted.length !== 1 ? "s" : ""} selected by the agent`,
        { x: 0.8, y: 5.4, w: 11.7, h: 0.4, align: "center", fontFace: SANS, fontSize: 12, color: MUTE, italic: true }
      );

      addCustomAfter("position");

      // ---- Map slide (if a comp map was built) ----
      if (mapUrl && !hid("map")) {
        try {
          const mapRes = await fetch(mapUrl);
          if (mapRes.ok) {
            const blob = await mapRes.blob();
            const mapData = await new Promise((resolve, reject) => {
              const r = new FileReader();
              r.onload = () => resolve(r.result);
              r.onerror = reject;
              r.readAsDataURL(blob);
            });
            const ms = pptx.addSlide();
            base(ms);
            ms.addText("COMPARABLE LOCATIONS", {
              x: 0.8, y: 0.7, w: 11.7, h: 0.4, fontFace: SANS, fontSize: 13, color: GREEN, charSpacing: 5, bold: true,
            });
            ms.addImage({
              data: mapData,
              x: 1.4, y: 1.3, w: 10.5, h: 5.0,
              sizing: { type: "cover", w: 10.5, h: 5.0 },
            });
            ms.addShape(pptx.ShapeType.rect, {
              x: 1.4, y: 1.3, w: 10.5, h: 5.0,
              fill: { type: "none" }, line: { color: BRASS, width: 1.5 },
            });
            ms.addText("S = subject property · numbered pins are comparable sales in ledger order", {
              x: 1.4, y: 6.45, w: 10.5, h: 0.35, fontFace: SANS, fontSize: 11, color: MUTE, italic: true, align: "center",
            });
          }
        } catch (mapErr) {
          console.error("Map slide skipped:", mapErr);
        }
      }

      addCustomAfter("map");

      // ---- One slide per comp ----
      adjusted.forEach((c, ci) => {
        if (hid(`comp${ci}`)) return;
        const cs = pptx.addSlide();
        base(cs);
        cs.addText("COMPARABLE SALE", {
          x: 0.8, y: 0.7, w: 11.7, h: 0.35, fontFace: SANS, fontSize: 12, color: GREEN, charSpacing: 5, bold: true,
        });
        cs.addText(c.address, {
          x: 0.8, y: 1.15, w: 11.7, h: 0.7, fontFace: SERIF, fontSize: 30, color: INK, bold: true,
        });
        cs.addText(
          `${c.beds} bd / ${c.baths} ba · ${c.sqft.toLocaleString()} sqft · sold ${c.sold}`,
          { x: 0.8, y: 1.85, w: 11.7, h: 0.4, fontFace: SANS, fontSize: 14, color: MUTE }
        );
        if (c.photo) {
          cs.addImage({
            data: c.photo,
            x: 8.9, y: 2.6, w: 3.5, h: 3.6,
            sizing: { type: "cover", w: 3.5, h: 3.6 },
          });
          cs.addShape(pptx.ShapeType.rect, {
            x: 8.9, y: 2.6, w: 3.5, h: 3.6,
            fill: { type: "none" }, line: { color: BRASS, width: 1.5 },
          });
        }
        const tableW = c.photo ? 7.7 : 11.7;
        const colWs = c.photo ? [5.3, 2.4] : [8.2, 3.5];
        const rows = [
          [
            { text: "Sale price", options: { fontFace: SANS, fontSize: 15, color: INK, bold: true } },
            { text: fmt(c.price), options: { fontFace: SANS, fontSize: 15, color: INK, bold: true, align: "right" } },
          ],
          ...c.adjustments.map((a) => [
            { text: a.label, options: { fontFace: SANS, fontSize: 13, color: MUTE } },
            {
              text: `${a.amount >= 0 ? "+" : "−"}${fmt(Math.abs(a.amount))}`,
              options: { fontFace: SANS, fontSize: 13, color: a.amount < 0 ? RED : GREEN, align: "right" },
            },
          ]),
          [
            { text: "Adjusted value", options: { fontFace: SANS, fontSize: 16, color: GREEN, bold: true } },
            { text: fmt(c.adjValue), options: { fontFace: SANS, fontSize: 16, color: GREEN, bold: true, align: "right" } },
          ],
        ];
        cs.addTable(rows, {
          x: 0.8, y: 2.6, w: tableW, colW: colWs,
          border: { type: "none" }, fill: { color: CARD },
          rowH: 0.45, margin: 0.08,
        });
        addCustomAfter(`comp${ci}`);
      });

      // ---- Pricing strategy ----
      if (!hid("strategy")) {
      s = pptx.addSlide();
      base(s);
      s.addText(txt("strategy.eyebrow", "Pricing strategy").toUpperCase(), {
        x: 0.8, y: 0.8, w: 11.7, h: 0.4, fontFace: SANS, fontSize: 13, color: GREEN, charSpacing: 5, bold: true,
      });
      s.addShape(pptx.ShapeType.rect, { x: 0.8, y: 1.5, w: 0.08, h: 3.2, fill: { color: BRASS } });
      s.addText(
        txt("strategy.body", `${adjusted.length} recent sale${adjusted.length !== 1 ? "s" : ""} establish a clear band for this home. After adjusting each comparable for condition, size, and location factors, the indicated value range runs from ${fmt(lo)} to ${fmt(hi)}. Listing at ${fmt(mid)} positions the home to draw strong early attention while leaving room for competitive offers.`),
        {
          x: 1.15, y: 1.5, w: 10.9, h: 3.2, fontFace: SERIF, fontSize: 19,
          color: INK, lineSpacing: 32, valign: "top",
        }
      );
      }
      addCustomAfter("strategy");

      // ---- Net proceeds slide ----
      if (netSheet.enabled && !hid("net")) {
        s = pptx.addSlide();
        base(s);
        s.addText("ESTIMATED SELLER NET PROCEEDS", {
          x: 0.8, y: 0.7, w: 11.7, h: 0.4, fontFace: SANS, fontSize: 13, color: GREEN, charSpacing: 5, bold: true,
        });
        const netRows = [
          [
            { text: "Sale price", options: { fontFace: SANS, fontSize: 15, color: INK, bold: true } },
            { text: fmt(netBase), options: { fontFace: SANS, fontSize: 15, color: INK, bold: true, align: "right" } },
          ],
          ...[
            ["Commission (" + netSheet.commissionPct + "%)", netLines.commission],
            ["Title, escrow & closing (" + netSheet.closingPct + "%)", netLines.closing],
            ["Transfer tax (" + netSheet.transferPct + "%)", netLines.transfer],
            ["Mortgage payoff", netLines.payoff],
            ["Repairs / seller credits", netLines.credits],
          ].filter((r) => r[1] > 0).map((r) => [
            { text: r[0], options: { fontFace: SANS, fontSize: 13, color: MUTE } },
            { text: "−" + fmt(r[1]), options: { fontFace: SANS, fontSize: 13, color: RED, align: "right" } },
          ]),
          [
            { text: "Estimated net to seller", options: { fontFace: SANS, fontSize: 17, color: GREEN, bold: true } },
            { text: fmt(netProceeds), options: { fontFace: SANS, fontSize: 17, color: GREEN, bold: true, align: "right" } },
          ],
        ];
        s.addTable(netRows, {
          x: 1.6, y: 1.5, w: 10.1, colW: [6.6, 3.5],
          border: { type: "none" }, fill: { color: CARD },
          rowH: 0.5, margin: 0.1,
        });
        s.addText("Estimates only — actual costs vary by transaction. Final figures come from escrow and the seller's lender.", {
          x: 1.6, y: 6.35, w: 10.1, h: 0.4, fontFace: SANS, fontSize: 10, color: MUTE, italic: true, align: "center",
        });
      }

      addCustomAfter("net");

      // ---- Closing / agent slide ----
      if (!hid("close")) {
      s = pptx.addSlide();
      base(s);
      if (agent.logo) {
        try {
          s.addImage({ data: agent.logo, x: 5.67, y: 1.45, w: 2.0, h: 0.7, sizing: { type: "contain", w: 2.0, h: 0.7 } });
        } catch (e) { console.error("Logo skipped:", e); }
      }
      s.addText(agent.name, {
        x: 0.8, y: 2.3, w: 11.7, h: 0.8, align: "center", fontFace: SERIF, fontSize: 34, color: GREEN, bold: true,
      });
      s.addText(`${agent.brokerage} · ${agent.license}`, {
        x: 0.8, y: 3.2, w: 11.7, h: 0.4, align: "center", fontFace: SANS, fontSize: 15, color: MUTE,
      });
      s.addText(agent.phone, {
        x: 0.8, y: 3.6, w: 11.7, h: 0.4, align: "center", fontFace: SANS, fontSize: 15, color: MUTE,
      });
      s.addText(
        "This comparative market analysis reflects the professional opinion of the preparing agent based on comparable sales they selected. It is not an appraisal and was not prepared by a licensed appraiser. Value conclusions are the agent's own.",
        { x: 1.5, y: 5.6, w: 10.3, h: 0.9, align: "center", fontFace: SANS, fontSize: 10, color: MUTE, italic: true }
      );

      }
      addCustomAfter("close");

      await pptx.writeFile({ fileName: `CMA - ${subject.address}.pptx` });
    } catch (err) {
      console.error("Slide export failed:", err);
      alert("Slide export hit a snag. Try again.");
    } finally {
      setSlidesBusy(false);
    }
  };

  const setSubjectPhoto = async (file) => {
    if (!file) return;
    try {
      const dataUrl = await fileToResizedDataUrl(file);
      setSubject((prev) => ({ ...prev, photo: dataUrl }));
    } catch { /* ignore bad files */ }
  };

  const setAgentImage = async (field, file) => {
    if (!file) return;
    try {
      const dataUrl = await fileToResizedDataUrl(file);
      setAgent((prev) => ({ ...prev, [field]: dataUrl }));
    } catch { /* ignore bad files */ }
  };

  const addCompPhotos = async (compId, fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    try {
      const urls = [];
      for (const f of files) urls.push(await fileToResizedDataUrl(f));
      setComps((prev) =>
        prev.map((c) =>
          c.id === compId
            ? { ...c, photos: [...(c.photos || []), ...urls], photo: c.photo || urls[0] }
            : c
        )
      );
    } catch { /* ignore bad files */ }
  };

  const removeCompPhoto = (compId, i) => {
    setComps((prev) =>
      prev.map((c) => {
        if (c.id !== compId) return c;
        const photos = (c.photos || []).filter((_, idx) => idx !== i);
        return { ...c, photos, photo: photos[0] || null };
      })
    );
  };

  const setCompPhoto = async (compId, file) => {
    if (!file) return;
    try {
      const dataUrl = await fileToResizedDataUrl(file);
      setComps((prev) => prev.map((c) => (c.id === compId ? { ...c, photo: dataUrl } : c)));
    } catch { /* ignore bad files */ }
  };

  const PhotoPicker = ({ photo, onPick, onClear, label = "Photo" }) => (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
      {photo ? (
        <div style={{ position: "relative" }}>
          <img src={photo} alt="" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 3, border: "1px solid #A99C7A", display: "block" }} />
          <button
            onClick={onClear}
            title="Remove photo"
            style={{ position: "absolute", top: -8, right: -8, width: 20, height: 20, borderRadius: "50%", border: "none", background: "#8E3B2F", color: "#EFE7D3", fontSize: 11, cursor: "pointer", lineHeight: "20px", padding: 0 }}
          >
            ✕
          </button>
        </div>
      ) : (
        <label style={{ ...labelStyle, cursor: "pointer" }}>
          {label}
          <span style={{ display: "block", marginTop: 4, padding: "10px 14px", fontSize: 13, fontWeight: 600, border: "1px dashed #A99C7A", borderRadius: 3, background: "#FBF7EC", color: "#1F3D2B" }}>
            + Add photo
          </span>
          <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { onPick(e.target.files?.[0]); e.target.value = ""; }} />
        </label>
      )}
    </div>
  );

  // ---------- comp map (Geoapify) ----------
  const GEOAPIFY_KEY = process.env.NEXT_PUBLIC_GEOAPIFY_KEY;
  const [mapUrl, setMapUrl] = useState(null);
  const [mapBusy, setMapBusy] = useState(false);
  const [mapSig, setMapSig] = useState("");
  const [mapPoints, setMapPoints] = useState(null);
  const mapDivRef = React.useRef(null);
  const leafletMapRef = React.useRef(null);

  const geocode = async (query, bias) => {
    const biasParam = bias ? `&bias=proximity:${bias[0]},${bias[1]}` : "";
    const res = await fetch(
      `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(query)}&limit=1&filter=countrycode:us${biasParam}&apiKey=${GEOAPIFY_KEY}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    const f = data.features?.[0];
    return f ? [f.properties.lon, f.properties.lat] : null; // [lng, lat]
  };

  const staticMapToDataUrl = async (url) => {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        console.error("Geoapify static map rejected:", res.status, errText);
        return null;
      }
      const blob = await res.blob();
      return await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.onerror = reject;
        r.readAsDataURL(blob);
      });
    } catch (e) {
      console.error("Geoapify static map fetch failed:", e);
      return null;
    }
  };

  const buildMap = async () => {
    if (!GEOAPIFY_KEY) return;
    const sig = JSON.stringify([subject.address, subject.city, comps.map((c) => c.address)]);
    if (sig === mapSig && mapUrl) return; // addresses unchanged
    setMapBusy(true);
    try {
      const cityPart = subject.city || "San Diego, CA";
      const subjCoord = await geocode(`${subject.address}, ${cityPart}`);
      if (!subjCoord) {
        console.error("Geoapify could not geocode subject:", subject.address);
        setMapUrl(null); setMapSig(sig); return;
      }

      const compCoords = [];
      for (const c of comps) {
        const coord = await geocode(`${c.address}, ${cityPart}`, subjCoord);
        compCoords.push(coord);
      }
      setMapPoints({ subj: subjCoord, comps: compCoords });

      const all = [subjCoord, ...compCoords.filter(Boolean)];
      const lngs = all.map((p) => p[0]);
      const lats = all.map((p) => p[1]);
      const pad = 0.004;
      const rect = `rect:${Math.min(...lngs) - pad},${Math.min(...lats) - pad},${Math.max(...lngs) + pad},${Math.max(...lats) + pad}`;
      const center = [lngs.reduce((a, b) => a + b, 0) / lngs.length, lats.reduce((a, b) => a + b, 0) / lats.length];

      const markersFull = [
        `lonlat:${subjCoord[0]},${subjCoord[1]};type:material;color:%238e3b2f;size:x-large;text:S`,
        ...compCoords
          .map((coord, i) => (coord ? `lonlat:${coord[0]},${coord[1]};type:material;color:%231f3d2b;size:large;text:${i + 1}` : null))
          .filter(Boolean),
      ].join("|");

      const markersSimple = [
        `lonlat:${subjCoord[0]},${subjCoord[1]};color:%238e3b2f;size:x-large`,
        ...compCoords
          .map((coord) => (coord ? `lonlat:${coord[0]},${coord[1]};color:%231f3d2b;size:medium` : null))
          .filter(Boolean),
      ].join("|");

      const markersNamed = [
        `lonlat:${subjCoord[0]},${subjCoord[1]};color:red;size:x-large`,
        ...compCoords
          .map((coord) => (coord ? `lonlat:${coord[0]},${coord[1]};color:green;size:medium` : null))
          .filter(Boolean),
      ].join("|");

      const baseUrl = "https://maps.geoapify.com/v1/staticmap";
      const candidates = [
        `${baseUrl}?style=positron&width=900&height=500&area=${rect}&marker=${markersFull}&scaleFactor=2&apiKey=${GEOAPIFY_KEY}`,
        `${baseUrl}?style=positron&width=900&height=500&area=${rect}&marker=${markersSimple}&apiKey=${GEOAPIFY_KEY}`,
        `${baseUrl}?style=osm-bright&width=900&height=500&center=lonlat:${center[0]},${center[1]}&zoom=13&marker=${markersSimple}&apiKey=${GEOAPIFY_KEY}`,
        `${baseUrl}?style=osm-bright&width=900&height=500&center=lonlat:${center[0]},${center[1]}&zoom=13&marker=${markersNamed}&apiKey=${GEOAPIFY_KEY}`,
      ];

      for (const u of candidates) {
        const dataUrl = await staticMapToDataUrl(u);
        if (dataUrl) {
          setMapUrl(dataUrl);
          setMapSig(sig);
          return;
        }
      }
      setMapUrl(null);
      setMapSig(sig);
    } catch (err) {
      console.error("Map build failed:", err);
      setMapUrl(null);
    } finally {
      setMapBusy(false);
    }
  };

  useEffect(() => {
    if (view === "report" || view === "present") buildMap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  // ---------- share links ----------
  const [shareInfo, setShareInfo] = useState(null);
  const [shares, setShares] = useState([]);
  const [sharesBusy, setSharesBusy] = useState(false);
  const [copiedShare, setCopiedShare] = useState(null);

  const loadShares = async () => {
    if (!session) return;
    setSharesBusy(true);
    const { data, error } = await supabase
      .from("shares")
      .select("id, created_at, view_count, last_viewed_at, address:data->subject->>address")
      .order("created_at", { ascending: false });
    if (!error) setShares(data || []);
    setSharesBusy(false);
  };

  useEffect(() => {
    if (view === "shares" || view === "home") loadShares();
    if (view === "home") loadDrafts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  const deleteShare = async (id) => {
    await supabase.from("shares").delete().eq("id", id);
    await loadShares();
  };

  const shareUrlFor = (id) => {
    const origin = (process.env.NEXT_PUBLIC_SITE_URL ||
      (typeof window !== "undefined" ? window.location.origin : "")).replace(/\/$/, "");
    return `${origin}/p/${id}`;
  };

  const copyShareLink = (id) => {
    navigator.clipboard.writeText(shareUrlFor(id)).then(() => {
      setCopiedShare(id);
      setTimeout(() => setCopiedShare(null), 1600);
    });
  };

  const sharePresentation = async () => {
    setShareInfo({ busy: true });
    try {
      const id =
        Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 8);
      const payload = { subject, agent, comps, mapPoints, netSheet, deck, meta };
      const { error } = await supabase
        .from("shares")
        .insert({ id, user_id: session.user.id, data: payload });
      if (error) throw error;
      const origin = (process.env.NEXT_PUBLIC_SITE_URL || window.location.origin).replace(/\/$/, "");
      const url = `${origin}/p/${id}`;
      try { await navigator.clipboard.writeText(url); } catch { /* clipboard optional */ }
      setShareInfo({ url, copied: true });
      loadShares();
    } catch (e) {
      setShareInfo({ error: e.message || "Could not create link" });
    }
  };

  // Interactive map: pan/zoom, streets & satellite layers, clickable pins
  useEffect(() => {
    if (view !== "report" || !mapPoints || !GEOAPIFY_KEY) return;
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !mapDivRef.current) return;
      if (leafletMapRef.current) { leafletMapRef.current.remove(); leafletMapRef.current = null; }

      const map = L.map(mapDivRef.current, { scrollWheelZoom: true });
      const streets = L.tileLayer(
        `https://maps.geoapify.com/v1/tile/osm-bright/{z}/{x}/{y}.png?apiKey=${GEOAPIFY_KEY}`,
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
      const addPin = (lnglat, bg, label, popupHtml, zOffset) => {
        L.marker([lnglat[1], lnglat[0]], {
          icon: L.divIcon({ className: "", html: pinHtml(bg, label), iconSize: [32, 32], iconAnchor: [16, 30], popupAnchor: [0, -28] }),
          zIndexOffset: zOffset,
        }).addTo(map).bindPopup(popupHtml);
      };

      addPin(
        mapPoints.subj, "#8e3b2f", "S",
        `<div style="font-family:Georgia,serif;min-width:190px;"><b style="font-size:14px;">${subject.address}</b><br/><span style="color:#555;">${subject.beds} bd / ${subject.baths} ba · ${subject.sqft.toLocaleString()} sqft</span><br/><span style="color:#8e3b2f;font-weight:700;">Recommended list: ${fmt(mid)}</span></div>`,
        1000
      );
      mapPoints.comps.forEach((coord, i) => {
        if (!coord || !adjusted[i]) return;
        const c = adjusted[i];
        addPin(
          coord, "#1f3d2b", String(i + 1),
          `<div style="font-family:Georgia,serif;min-width:190px;"><b style="font-size:14px;">${i + 1}. ${c.address}</b><br/><span style="color:#555;">${c.beds} bd / ${c.baths} ba · ${c.sqft.toLocaleString()} sqft · sold ${c.sold}</span><br/>Sold: <b>${fmt(c.price)}</b><br/>Adjusted: <b style="color:#1f3d2b;">${fmt(c.adjValue)}</b></div>`,
          0
        );
      });

      const pts = [mapPoints.subj, ...mapPoints.comps.filter(Boolean)].map((p) => [p[1], p[0]]);
      map.fitBounds(L.latLngBounds(pts), { padding: [45, 45] });
      leafletMapRef.current = map;
    })();
    return () => {
      cancelled = true;
      if (leafletMapRef.current) { leafletMapRef.current.remove(); leafletMapRef.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, mapPoints]);

  const copyToClipboard = (key, text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1500);
    });
  };

  const fonts = `
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Libre+Franklin:wght@400;500;600&display=swap');
    .fraunces { font-family: 'Fraunces', serif; }
    input:focus, textarea:focus, select:focus { outline: 2px solid #A8853C; outline-offset: 1px; }
    .print-only { display: none; }
    .map-page { display: none; }
    .leaflet-container, .leaflet-pane, .leaflet-top, .leaflet-bottom { z-index: 1 !important; }
    .sk { background: linear-gradient(90deg, #E0D7BE 25%, #EFE7D3 37%, #E0D7BE 63%);
      background-size: 400% 100%; animation: skShimmer 1.3s ease infinite; border-radius: 3px; }
    @keyframes skShimmer { 0% { background-position: 100% 50%; } 100% { background-position: 0 50%; } }
    @keyframes dsToast { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
    .ds-shell { display: flex; align-items: stretch; min-height: 100vh; }
    .ds-rail { width: 214px; flex-shrink: 0; background: #10251A; border-right: 1px solid #21402E;
      padding: 20px 12px; display: flex; flex-direction: column; gap: 3px; }
    .ds-main { flex: 1; min-width: 0; }
    .ds-nav { display: block; width: 100%; text-align: left; padding: 10px 12px; border-radius: 8px; border: none;
      background: transparent; color: #94AE9E; font-size: 13.5px; font-family: inherit; cursor: pointer; transition: all .13s ease; }
    .ds-nav:hover { background: rgba(168,133,60,.10); color: #EFE7D3; }
    .ds-nav-on { background: rgba(168,133,60,.16); color: #EFE7D3; font-weight: 600;
      box-shadow: inset 2px 0 0 #A8853C; }
    .ds-nav-sm { font-size: 12px; color: #6F8C7B; padding: 7px 11px; }
    .ds-card { background: #EFE7D3; color: #26221A; border-radius: 4px; padding: 14px 15px; text-align: left;
      border: 1px solid #C9BC9C; cursor: pointer; transition: all .13s ease; width: 100%; font-family: inherit; }
    .ds-card:hover { border-color: #A8853C; transform: translateY(-1px); }
    .ds-stat { background: rgba(255,255,255,.035); border: 1px solid #2E5540; border-radius: 10px; padding: 13px 15px; }
    @media (max-width: 640px) {
      /* Report preview: the low/high price row overlaps on narrow screens — stack it */
      .ds-gauge { flex-direction: column !important; gap: 10px; align-items: center; }
      .ds-gauge > div { text-align: center !important; }
      /* Forms become a clean single column, like a native app form */
      /* price range row must never run off the screen */
      .ds-gauge { gap: 6px; }
      .ds-gauge > div { flex: 1 1 0; min-width: 0; }
      .ds-gauge div[class="fraunces"], .ds-gauge .fraunces { font-size: 15px !important; }
      .ds-homegrid { grid-template-columns: 1fr !important; }
      .ds-form { padding: 0 12px 40px !important; }
      .ds-form > div, .ds-form > details { padding: 14px !important; margin-bottom: 12px !important; }
      .ds-form label { width: 100% !important; display: block !important; margin-bottom: 12px; }
      .ds-form input, .ds-form select, .ds-form textarea { width: 100% !important; max-width: 100% !important; font-size: 16px !important; }
      .ds-form input[type="checkbox"], .ds-form input[type="radio"] { width: auto !important; }
      /* nothing should ever scroll sideways */
      html, body { overflow-x: hidden; }
    }
    @media (max-width: 640px) {
      /* the printed-report layout is built for a wide page — tighten it for phones */
      .report-wrap { margin: 10px 6px 40px !important; max-width: 100% !important; }
      .report-wrap > div { margin: 6px !important; padding: 20px 16px 18px !important; }
      .report-wrap h1 { font-size: 25px !important; }
      .ds-rail { padding: 8px !important; }
      .ds-rail .ds-nav { padding: 8px 12px; font-size: 12.5px; }
      .ds-stat { padding: 10px 12px !important; }
      /* price range row: shrink so the high value can't run off the page */
      .ds-gauge { gap: 6px; padding: 0 !important; }
      .ds-gauge > div > div:first-child { font-size: 15px !important; }
      .ds-gauge > div:nth-child(2) > div:first-child { font-size: 21px !important; }
      .ds-gauge > div > div:last-child { font-size: 8.5px !important; letter-spacing: .06em !important; }
    }
    @media (max-width: 780px) {
      /* inline widths on inputs would overflow narrow screens */
      .chrome input[type="text"], .chrome input[type="number"], .chrome input[type="email"],
      .chrome input[type="password"], .chrome select, .chrome textarea {
        max-width: 100% !important;
      }
      .chrome label { max-width: 100%; }
      .ds-tabbar { overflow-x: auto; flex-wrap: nowrap !important; -webkit-overflow-scrolling: touch; }
      .ds-tabbar::-webkit-scrollbar { height: 0; }
      .ds-tabbar button { flex: 0 0 auto; }
      .report-wrap { margin-left: 8px !important; margin-right: 8px !important; }
    }
    .only-mobile { display: none !important; }
    @media (max-width: 900px) {
      .only-mobile { display: flex !important; }
      .only-desktop { display: none !important; }

      .ds-shell { flex-direction: column; }

      /* Bottom tab bar, like a native app */
      .ds-rail {
        position: fixed; left: 0; right: 0; bottom: 0; width: auto; z-index: 60;
        flex-direction: row; justify-content: space-around; align-items: stretch; gap: 2px;
        background: #12291B; border-right: none; border-top: 1px solid #2E5540; z-index: 1200;
        padding: 5px 6px calc(5px + env(safe-area-inset-bottom, 0px));
        box-shadow: 0 -6px 18px rgba(0,0,0,.28);
      }
      .ds-rail .ds-sep, .ds-rail .ds-railhead { display: none; }
      .ds-nav {
        flex: 1; width: auto; text-align: center; padding: 9px 2px 7px; font-size: 10.5px;
        line-height: 1.25; border-radius: 9px; white-space: nowrap;
      }
      .ds-nav-on { background: rgba(168,133,60,.20); color: #EFE7D3; }
      .ds-main { padding-bottom: 78px; }

      /* Compact top bar */
      .ds-topbar { padding: 10px 14px !important; }
      .ds-tabbar { display: grid !important; grid-template-columns: 1fr 1fr; gap: 7px !important;
        width: 100%; overflow: visible !important; }
      .ds-tabbar button { width: 100%; padding: 11px 8px !important; font-size: 13px !important; }
      .ds-topbar { flex-direction: column; align-items: stretch !important; gap: 10px !important; }
    }
    @media print { .ds-rail { display: none !important; } }
    @page { size: letter portrait; margin: 0.2in; }
    @media print {
      html, body { height: auto !important; }
      * { min-height: 0 !important; }
      .chrome { display: none !important; }
      .no-print { display: none !important; }
      .print-only { display: block !important; }
      .map-inline { display: none !important; }
      .map-page { display: block !important; break-before: page; page-break-before: always; padding-top: 4px; }
      body { background: #EFE7D3 !important; }
      .report-wrap {
        margin: 0 auto !important;
        box-shadow: none !important;
        border: none !important;
        max-width: 100% !important;
        zoom: 0.78;
        page-break-after: avoid;
      }
    }
  `;

  // ---------- auth screen ----------
  // Keep these hooks above the early returns — every render must reach them
  const inEditorView = ["inputs", "report", "copy"].includes(view);
  useEffect(() => { inEditorRef.current = inEditorView; }, [inEditorView]);

  useEffect(() => {
    const onKey = (e) => {
      const t = e.target;
      const typing = t && (t.isContentEditable || t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT");
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (inEditorRef.current) { autoSave(); toast("Saved."); }
      } else if (e.key === "Enter" && !typing && inEditorRef.current) {
        e.preventDefault();
        setShareInfo(null);
        setView("present");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, subject, agent, comps, netSheet, deck, meta, draftName, currentDraftId]);

  if (!authReady) {
    return <div style={{ background: "#1F3D2B", minHeight: "100vh" }} />;
  }

  if (!session) {
    return (
      <div style={{ background: "#1F3D2B", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Libre Franklin', Arial, sans-serif", padding: 20 }}>
        <style>{fonts}</style>
        <div style={{ background: "#EFE7D3", border: "1px solid #C9BC9C", borderRadius: 4, padding: "36px 34px", maxWidth: 400, width: "100%" }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div className="fraunces" style={{ fontSize: 26, fontWeight: 700, color: "#1F3D2B" }}>DeedSheet</div>
            <div style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "#8E3B2F", marginTop: 4 }}>
              {authMode === "signup" ? "Create your account" : "Agent login"}
            </div>
          </div>
          <label style={labelStyle}>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ ...inputStyle, width: "100%", fontWeight: 400, marginBottom: 12 }}
              placeholder="you@brokerage.com"
            />
          </label>
          <label style={labelStyle}>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAuth(); }}
              style={{ ...inputStyle, width: "100%", fontWeight: 400 }}
              placeholder={authMode === "signup" ? "At least 6 characters" : "Your password"}
            />
          </label>
          {authError && (
            <div style={{ marginTop: 12, fontSize: 13, color: "#8E3B2F", fontWeight: 500 }}>{authError}</div>
          )}
          {resetMsg && (
            <div style={{ marginTop: 12, fontSize: 13, color: "#1F3D2B", fontWeight: 600 }}>{resetMsg}</div>
          )}
          <button
            onClick={handleAuth}
            disabled={authBusy}
            style={{ marginTop: 18, width: "100%", padding: "11px 0", fontSize: 14, fontWeight: 600, cursor: authBusy ? "wait" : "pointer", borderRadius: 3, border: "none", background: "#1F3D2B", color: "#EFE7D3" }}
          >
            {authBusy ? "One moment…" : authMode === "signup" ? "Create account" : "Log in"}
          </button>
          <button
            onClick={() => { setAuthMode(authMode === "signup" ? "login" : "signup"); setAuthError(null); }}
            style={{ marginTop: 12, width: "100%", padding: "8px 0", fontSize: 13, cursor: "pointer", borderRadius: 3, border: "1px solid #A99C7A", background: "transparent", color: "#6B6252" }}
          >
            {authMode === "signup" ? "Already have an account? Log in" : "New here? Create an account"}
          </button>
          {authMode !== "signup" && (
            <button
              onClick={sendReset}
              disabled={resetBusy}
              style={{ marginTop: 10, width: "100%", padding: "6px 0", fontSize: 12.5, cursor: resetBusy ? "wait" : "pointer", borderRadius: 3, border: "none", background: "transparent", color: "#8E3B2F", textDecoration: "underline" }}
            >
              {resetBusy ? "Sending…" : "Forgot your password?"}
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!sub.loading && sub.billingEnabled && !sub.active) {
    return (
      <div style={{ background: "#1F3D2B", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Libre Franklin', Arial, sans-serif", padding: 20 }}>
        <style>{fonts}</style>
        <div style={{ background: "#EFE7D3", border: "1px solid #C9BC9C", borderRadius: 5, padding: "34px 32px", maxWidth: 440, width: "100%", textAlign: "center" }}>
          <div className="fraunces" style={{ fontSize: 26, fontWeight: 700, color: "#1F3D2B" }}>DeedSheet</div>
          <div style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "#8E3B2F", marginTop: 4 }}>
            {sub.status === "past_due" ? "Payment issue" : sub.status === "canceled" ? "Subscription ended" : "Subscription required"}
          </div>
          <p style={{ fontSize: 14, color: "#3A3428", lineHeight: 1.7, marginTop: 18 }}>
            {sub.status === "past_due"
              ? "Your last payment didn't go through, so report generation is paused. Update your card to pick up right where you left off."
              : sub.status === "canceled"
              ? "Your subscription has ended. Your saved reports are still here — restart any time to keep using them."
              : "DeedSheet is a subscription. Start yours to create unlimited CMAs, presentations and share links."}
          </p>
          {billingError && <div style={{ fontSize: 13, color: "#8E3B2F", marginTop: 12 }}>{billingError}</div>}
          <button
            onClick={sub.hasBilling ? openBillingPortal : startCheckout}
            disabled={billingBusy}
            style={{ marginTop: 20, width: "100%", padding: "12px 0", fontSize: 14.5, fontWeight: 700, cursor: billingBusy ? "wait" : "pointer", borderRadius: 3, border: "none", background: "#8E3B2F", color: "#EFE7D3" }}
          >
            {billingBusy ? "One moment…" : sub.hasBilling ? "Manage billing" : "Start subscription"}
          </button>
          <button
            onClick={signOut}
            style={{ marginTop: 10, width: "100%", padding: "9px 0", fontSize: 13, cursor: "pointer", borderRadius: 3, border: "1px solid #A99C7A", background: "transparent", color: "#6B6252" }}
          >
            Sign out
          </button>
          <div style={{ fontSize: 11.5, color: "#8A7E63", marginTop: 16, lineHeight: 1.6 }}>
            Signed in as {session.user.email}. Your saved reports are never deleted when a subscription lapses.
          </div>
        </div>
      </div>
    );
  }

  // ---------- app ----------
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

  const skeletonCards = (count = 3, tall = false) => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ background: "#EFE7D3", border: "1px solid #C9BC9C", borderRadius: 4, padding: 14 }}>
          <div className="sk" style={{ height: 15, width: "72%" }} />
          <div className="sk" style={{ height: 11, width: "45%", marginTop: 9 }} />
          {tall && <div className="sk" style={{ height: 11, width: "60%", marginTop: 9 }} />}
          <div className="sk" style={{ height: 16, width: 84, marginTop: 13, borderRadius: 2 }} />
        </div>
      ))}
    </div>
  );

  const skeletonRows = (count = 3) => (
    <div>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ background: "#EFE7D3", border: "1px solid #C9BC9C", borderRadius: 4, padding: "16px 18px", marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14 }}>
          <div style={{ flex: 1 }}>
            <div className="sk" style={{ height: 16, width: "48%" }} />
            <div className="sk" style={{ height: 11, width: "32%", marginTop: 10 }} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div className="sk" style={{ height: 30, width: 62, borderRadius: 3 }} />
            <div className="sk" style={{ height: 30, width: 82, borderRadius: 3 }} />
          </div>
        </div>
      ))}
    </div>
  );

  const Icon = ({ name, size = 17 }) => {
    const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round" };
    const paths = {
      home: <><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></>,
      plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
      docs: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></>,
      link: <><path d="M9.5 14.5 14.5 9.5" /><path d="M11 6.5 13 4.5a4 4 0 0 1 6 6l-2 2" /><path d="M13 17.5 11 19.5a4 4 0 0 1-6-6l2-2" /></>,
      user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" /></>,
      eye: <><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></>,
      clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
      folder: <><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" /></>,
      chart: <><path d="M4 19V5" /><path d="M4 19h16" /><path d="M8 15l3.5-4 3 2.5L20 8" /></>,
      key: <><circle cx="8" cy="12" r="3.2" /><path d="M11 12h9" /><path d="M17 12v3" /></>,
      out: <><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" /><path d="M10 17l-5-5 5-5" /><path d="M5 12h11" /></>,
      card: <><rect x="2.5" y="5" width="19" height="14" rx="2" /><path d="M2.5 10h19" /></>,
      search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
    };
    return <svg {...common} style={{ flexShrink: 0 }}>{paths[name] || null}</svg>;
  };

  const railBtn = (id, label, onClick, short, icon) => (
    <button
      key={id}
      className={`ds-nav ${view === id ? "ds-nav-on" : ""}`}
      onClick={onClick || (() => setView(id))}
    >
      <span className="only-desktop" style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {icon && <Icon name={icon} />}{label}
      </span>
      <span className="only-mobile" style={{ justifyContent: "center" }}>{short || label}</span>
    </button>
  );

  const inEditor = ["inputs", "report", "copy"].includes(view);

  return (
    <div style={{ background: "#1F3D2B", minHeight: "100vh", fontFamily: "'Libre Franklin', sans-serif" }}>
      <style>{fonts}</style>

      <div className="ds-shell">
      {/* Side rail */}
      <div className="ds-rail chrome">
        <div className="ds-railhead" style={{ padding: "0 11px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <span style={{ color: "#A8853C", display: "flex" }}><Icon name="home" size={19} /></span>
            <span className="fraunces" style={{ color: "#EFE7D3", fontSize: 19, fontWeight: 700 }}>DeedSheet</span>
          </div>
          <div style={{ color: "#6F8C7B", fontSize: 9.5, letterSpacing: "0.13em", textTransform: "uppercase", marginTop: 4, lineHeight: 1.5 }}>
            CMA reports in<br />two minutes
          </div>
        </div>
        {railBtn("home", "Dashboard", null, "Home", "home")}
        <button className="ds-nav" onClick={newReport} style={{ color: "#D9C48F", fontWeight: 600 }}>
          <span className="only-desktop" style={{ display: "flex", alignItems: "center", gap: 10 }}><Icon name="plus" />New report</span>
          <span className="only-mobile" style={{ justifyContent: "center" }}>New</span>
        </button>
        {railBtn("drafts", "My drafts", null, "Drafts", "docs")}
        {railBtn("shares", "Shared links", null, "Shared", "link")}
        {railBtn("profile", "My profile", () => { setProfileReturnTo(null); setView("profile"); }, "Profile", "user")}
        <div className="ds-sep" style={{ flex: 1 }} />
        <div className="ds-sep" style={{ height: 1, background: "#2E5540", margin: "10px 4px" }} />
        <span className="only-desktop" style={{ display: "flex", flexDirection: "column" }}>
          {sub.billingEnabled && !sub.owner && (
            <button className="ds-nav ds-nav-sm" onClick={openBillingPortal} disabled={billingBusy}>
              <span style={{ display: "flex", alignItems: "center", gap: 10 }}><Icon name="card" size={15} />Billing</span>
            </button>
          )}
          <button className="ds-nav ds-nav-sm" onClick={() => { window.location.href = "/reset"; }}>
            <span style={{ display: "flex", alignItems: "center", gap: 10 }}><Icon name="key" size={15} />Password</span>
          </button>
          <button className="ds-nav ds-nav-sm" onClick={signOut} title={session.user.email}>
            <span style={{ display: "flex", alignItems: "center", gap: 10 }}><Icon name="out" size={15} />Sign out</span>
          </button>

          <button
            onClick={() => { setProfileReturnTo(null); setView("profile"); }}
            style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12, padding: "10px 11px", borderRadius: 8, border: "1px solid #2E5540", background: "rgba(255,255,255,.03)", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}
          >
            <span style={{ width: 30, height: 30, borderRadius: "50%", background: "#A8853C", color: "#16301F", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11.5, fontWeight: 700, flexShrink: 0 }}>
              {(agent.name || "A").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
            </span>
            <span style={{ minWidth: 0 }}>
              <span style={{ display: "block", color: "#EFE7D3", fontSize: 12.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {agent.name === initialAgent.name ? "Set up profile" : agent.name}
              </span>
              <span style={{ display: "block", color: "#6F8C7B", fontSize: 10.5 }}>View profile</span>
            </span>
          </button>
        </span>
        <button className="ds-nav only-mobile" onClick={() => setMenuOpen(true)} style={{ justifyContent: "center" }}>More</button>
      </div>

      <div className="ds-main">
      {/* Tool chrome */}
      <div className="chrome" style={{ background: "#16301F", borderBottom: "1px solid #2E5540" }}>
        <div className="ds-topbar" style={{ maxWidth: 960, margin: "0 auto", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div className="fraunces" style={{ color: "#EFE7D3", fontSize: 17, fontWeight: 700 }}>
              {inEditor ? (draftName || subject.address || "Untitled report") : view === "drafts" ? "My drafts" : view === "shares" ? "Shared links" : "Home"}
            </div>
          </div>
          <div className="ds-tabbar" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {inEditor && tabBtn("inputs", "Agent inputs")}
            {inEditor && tabBtn("report", "Report preview")}
            {inEditor && tabBtn("copy", "Listing copy")}
            {inEditor && (<span className="only-desktop" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button
              onClick={() => { setView("report"); setTimeout(() => window.print(), 300); }}
              style={{ padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", borderRadius: 3, border: "1px solid #2E5540", background: "transparent", color: "#8FAE9B" }}
            >
              Quick CMA (PDF)
            </button>
            <button
              onClick={() => setWizardOpen(true)}
              style={{ padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", borderRadius: 3, border: "1px solid #2E5540", background: "transparent", color: "#8FAE9B" }}
            >
              Setup
            </button>
            <button
              onClick={() => { setShareInfo(null); setView("present"); }}
              style={{ padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", borderRadius: 3, border: "1px solid #A8853C", background: "transparent", color: "#D9C48F" }}
            >
              Full CMA (Present)
            </button>
            </span>)}
            {inEditor && (
              <button
                className="only-mobile"
                onClick={() => { setShareInfo(null); setView("present"); }}
                style={{ padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", borderRadius: 20, border: "none", background: "#A8853C", color: "#16301F", whiteSpace: "nowrap" }}
              >
                Present
              </button>
            )}
            {sub.billingEnabled && !sub.owner && (
              <button
                onClick={openBillingPortal}
                disabled={billingBusy}
                style={{ padding: "8px 12px", fontSize: 12, cursor: billingBusy ? "wait" : "pointer", borderRadius: 3, border: "1px solid #2E5540", background: "transparent", color: "#8FAE9B" }}
              >
                Billing
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Autosave status bar */}
      {inEditor && (
      <div className="chrome" style={{ maxWidth: 960, margin: "0 auto", padding: "12px 20px 0", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <input
          type="text"
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          placeholder={subject.address || "Report name"}
          style={{ padding: "8px 10px", fontSize: 13, border: "1px solid #2E5540", borderRadius: 3, background: "#16301F", color: "#EFE7D3", width: 260 }}
        />
        <button
          onClick={() => { autoSave(); toast("Saved."); }}
          title="Reports save on their own — this saves right now (⌘S)"
          style={{ padding: "8px 14px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", borderRadius: 3, border: "1px solid #A8853C", background: "transparent", color: "#D9C48F" }}
        >
          Save now
        </button>
        <span style={{ fontSize: 12, color: saveState.status === "error" ? "#E08A7A" : "#8FAE9B", display: "flex", alignItems: "center", gap: 6 }}>
          {saveState.status === "saving" && <><span style={{ width: 6, height: 6, borderRadius: "50%", background: "#A8853C" }} /> Saving…</>}
          {saveState.status === "saved" && <><span style={{ width: 6, height: 6, borderRadius: "50%", background: "#5E8B6C" }} /> All changes saved{saveState.at ? ` · ${saveState.at.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}` : ""}</>}
          {saveState.status === "error" && <>Couldn't save — check your connection</>}
          {saveState.status === "idle" && <>Changes save automatically</>}
        </span>
      </div>
      )}

      {view === "home" && (() => {
        const now = new Date();
        const inMonth = (d, off = 0) => {
          const dt = new Date(d);
          const ref = new Date(now.getFullYear(), now.getMonth() - off, 1);
          return dt.getMonth() === ref.getMonth() && dt.getFullYear() === ref.getFullYear();
        };
        const thisMonth = drafts.filter((d) => inMonth(d.updated_at)).length;
        const lastMonth = drafts.filter((d) => inMonth(d.updated_at, 1)).length;
        const delta = lastMonth ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : null;
        const totalViews = shares.reduce((s, x) => s + (x.view_count || 0), 0);
        const awaiting = shares.filter((x) => !(x.view_count > 0)).length;
        const shareFor = (d) => {
          const key = (d.address || d.name || "").toLowerCase();
          return shares.find((x) => x.address && key.includes(x.address.toLowerCase()));
        };
        const q = search.trim().toLowerCase();
        const visible = q
          ? drafts.filter((d) => `${d.name} ${d.address || ""} ${d.city || ""}`.toLowerCase().includes(q))
          : drafts;
        const hour = now.getHours();
        const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
        const firstName = (agent.name || "").split(" ")[0];

        const activity = [
          ...shares.filter((s) => s.last_viewed_at).map((s) => ({
            when: new Date(s.last_viewed_at), icon: "eye",
            text: `Your client opened ${s.address || "a presentation"}`,
          })),
          ...drafts.slice(0, 6).map((d) => ({
            when: new Date(d.updated_at), icon: "docs",
            text: `You edited ${d.address || d.name}`,
          })),
        ].sort((a, b) => b.when - a.when).slice(0, 5);

        const ago = (dt) => {
          const mins = Math.round((now - dt) / 60000);
          if (mins < 60) return `${Math.max(1, mins)} min ago`;
          const hrs = Math.round(mins / 60);
          if (hrs < 24) return `${hrs} hour${hrs !== 1 ? "s" : ""} ago`;
          const days = Math.round(hrs / 24);
          return days === 1 ? "Yesterday" : `${days} days ago`;
        };

        const stat = (icon, value, label, note, noteTone) => (
          <div className="ds-stat" key={label} style={{ padding: "16px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ color: "#A8853C", display: "flex" }}><Icon name={icon} size={18} /></span>
              <span className="fraunces" style={{ fontSize: 27, fontWeight: 700, color: "#EFE7D3", lineHeight: 1 }}>{value}</span>
            </div>
            <div style={{ fontSize: 12.5, color: "#B9C9BE", marginTop: 9 }}>{label}</div>
            {note && (
              <div style={{ fontSize: 11.5, color: noteTone === "up" ? "#7FBF95" : "#8FAE9B", marginTop: 5 }}>{note}</div>
            )}
          </div>
        );

        return (
          <div className="chrome" style={{ maxWidth: 1180, margin: "0 auto", padding: "24px 24px 60px" }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16, marginBottom: 22 }}>
              <div>
                <div className="fraunces" style={{ fontSize: 27, fontWeight: 700, color: "#EFE7D3" }}>
                  {greeting}{firstName && firstName !== "Your" ? `, ${firstName}` : ""} 👋
                </div>
                <div style={{ fontSize: 13, color: "#8FAE9B", marginTop: 4 }}>
                  Here's what's happening with your CMAs today.
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div className="only-desktop" style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,.05)", border: "1px solid #2E5540", borderRadius: 8, padding: "9px 13px", minWidth: 260 }}>
                  <span style={{ color: "#6F8C7B", display: "flex" }}><Icon name="search" size={15} /></span>
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search reports or addresses…"
                    style={{ border: "none", background: "transparent", color: "#EFE7D3", fontSize: 13, outline: "none", width: "100%", fontFamily: "inherit" }}
                  />
                </div>
                <button
                  onClick={newReport}
                  style={{ padding: "11px 20px", fontSize: 13.5, fontWeight: 700, cursor: "pointer", borderRadius: 8, border: "none", background: "#A8853C", color: "#16301F", whiteSpace: "nowrap" }}
                >
                  + New CMA
                </button>
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12, marginBottom: 20 }}>
              {stat("docs", thisMonth, "CMAs this month", delta === null ? null : `${delta >= 0 ? "↑" : "↓"} ${Math.abs(delta)}% from last month`, delta >= 0 ? "up" : "down")}
              {stat("eye", totalViews, "Client views", totalViews ? "Across all shared links" : "No views yet")}
              {stat("clock", awaiting, "Awaiting client review", awaiting ? "Shared but not opened" : "Nothing pending")}
              {stat("folder", drafts.length, "Saved reports", savedProfile ? "Branding saved" : "Set up your profile")}
            </div>

            {/* Two columns */}
            <div className="ds-homegrid" style={{ display: "grid", gridTemplateColumns: "1.35fr 1fr", gap: 14, alignItems: "start" }}>
              {/* Recent reports */}
              <div style={{ background: "rgba(255,255,255,.035)", border: "1px solid #2E5540", borderRadius: 10, padding: "16px 18px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div className="fraunces" style={{ fontSize: 17, fontWeight: 700, color: "#EFE7D3" }}>Recent reports</div>
                  {drafts.length > 5 && (
                    <button onClick={() => setView("drafts")} style={{ background: "none", border: "none", color: "#D9C48F", fontSize: 12, cursor: "pointer" }}>View all</button>
                  )}
                </div>

                {draftsLoading && drafts.length === 0 ? skeletonRows(3) : visible.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "26px 10px" }}>
                    <div className="fraunces" style={{ fontSize: 16, color: "#EFE7D3" }}>
                      {q ? "No reports match that search" : "No reports yet"}
                    </div>
                    <div style={{ fontSize: 12.5, color: "#8FAE9B", marginTop: 6, lineHeight: 1.6 }}>
                      {q ? "Try a different address." : savedProfile ? "Start your first CMA — your branding is ready." : "Tip: save your name, brokerage and logo as your profile first."}
                    </div>
                    {!q && (
                      <button onClick={newReport} style={{ marginTop: 14, padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer", borderRadius: 6, border: "none", background: "#A8853C", color: "#16301F" }}>
                        Create your first CMA
                      </button>
                    )}
                  </div>
                ) : visible.slice(0, 5).map((d) => {
                  const sh = shareFor(d);
                  const sent = !!sh;
                  return (
                    <button
                      key={d.id}
                      onClick={() => openDraft(d.id)}
                      style={{ display: "flex", alignItems: "center", gap: 13, width: "100%", textAlign: "left", padding: "11px 6px", background: "none", border: "none", borderBottom: "1px solid rgba(255,255,255,.07)", cursor: "pointer", fontFamily: "inherit" }}
                    >
                      <span style={{ width: 46, height: 40, borderRadius: 6, background: "rgba(168,133,60,.14)", color: "#A8853C", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Icon name="home" size={19} />
                      </span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span className="fraunces" style={{ display: "block", fontSize: 14.5, fontWeight: 600, color: "#EFE7D3", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {d.address || d.name}
                        </span>
                        <span style={{ display: "block", fontSize: 11.5, color: "#8FAE9B", marginTop: 2 }}>
                          {d.city ? `${d.city} · ` : ""}{sent && sh.view_count > 0 ? `Viewed ${new Date(sh.last_viewed_at || d.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : `Edited ${new Date(d.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
                        </span>
                      </span>
                      <span style={{
                        fontSize: 9.5, letterSpacing: "0.1em", fontWeight: 700, padding: "4px 9px", borderRadius: 4, flexShrink: 0,
                        background: sent ? "rgba(127,191,149,.16)" : "rgba(255,255,255,.07)",
                        color: sent ? "#7FBF95" : "#B9C9BE",
                      }}>
                        {sent ? "SENT" : "DRAFT"}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Activity */}
              <div style={{ background: "rgba(255,255,255,.035)", border: "1px solid #2E5540", borderRadius: 10, padding: "16px 18px" }}>
                <div className="fraunces" style={{ fontSize: 17, fontWeight: 700, color: "#EFE7D3", marginBottom: 12 }}>Activity</div>
                {activity.length === 0 ? (
                  <div style={{ fontSize: 12.5, color: "#8FAE9B", lineHeight: 1.7, padding: "8px 0 4px" }}>
                    Nothing yet. Once you share a presentation, you'll see here the moment your client opens it.
                  </div>
                ) : activity.map((a, i) => (
                  <div key={i} style={{ display: "flex", gap: 11, padding: "9px 0", borderBottom: i < activity.length - 1 ? "1px solid rgba(255,255,255,.07)" : "none" }}>
                    <span style={{ color: "#A8853C", display: "flex", marginTop: 1 }}><Icon name={a.icon} size={15} /></span>
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: 12.5, color: "#E3E9E2", lineHeight: 1.45 }}>{a.text}</span>
                      <span style={{ display: "block", fontSize: 11, color: "#6F8C7B", marginTop: 2 }}>{ago(a.when)}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {view === "profile" && (
        <div className="chrome ds-form ds-onlight" style={{ maxWidth: 760, margin: "20px auto", padding: "0 20px 60px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 14, marginBottom: 18 }}>
            <div>
              {profileReturnTo && (
                <button
                  onClick={() => { setStep(profileReturnTo.step || 3); setView(profileReturnTo.view || "inputs"); setProfileReturnTo(null); }}
                  style={{ background: "none", border: "none", color: "#D9C48F", fontSize: 12.5, cursor: "pointer", padding: 0, marginBottom: 8, fontFamily: "inherit" }}
                >
                  ← Back to your report
                </button>
              )}
              <div className="fraunces" style={{ fontSize: 22, fontWeight: 700, color: "#EFE7D3" }}>My profile</div>
              <div style={{ fontSize: 12.5, color: "#8FAE9B", marginTop: 4, lineHeight: 1.6 }}>
                {profileReturnTo
                  ? "Save this and we'll take you straight back to your report."
                  : "Saved once and used on every new report — your name, brokerage, logo, headshot and bio."}
              </div>
            </div>
            <button
              onClick={saveProfilePage}
              disabled={profileBusy}
              style={{ padding: "11px 22px", fontSize: 13.5, fontWeight: 700, cursor: profileBusy ? "wait" : "pointer", borderRadius: 6, border: "none", background: profileSaved ? "#1F3D2B" : "#A8853C", color: profileSaved ? "#EFE7D3" : "#16301F", whiteSpace: "nowrap" }}
            >
              {profileBusy ? "Saving…" : profileSaved ? "✓ Saved" : profileReturnTo ? "Save & continue" : "Save profile"}
            </button>
          </div>

          <div style={cardStyle}>
            <div className="fraunces" style={{ fontSize: 17, fontWeight: 600, color: "#26221A", marginBottom: 12 }}>
              Contact details
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
              {[["name", "Name"], ["brokerage", "Brokerage"], ["license", "DRE #"], ["phone", "Phone"]].map(([field, label]) => (
                <label key={field} style={labelStyle}>
                  {label}
                  <input
                    type="text"
                    value={profileDraft[field] || ""}
                    onChange={(e) => setProfileDraft({ ...profileDraft, [field]: e.target.value })}
                    style={{ ...inputStyle, width: 200 }}
                  />
                </label>
              ))}
            </div>
          </div>

          <div style={cardStyle}>
            <div className="fraunces" style={{ fontSize: 17, fontWeight: 600, color: "#26221A", marginBottom: 4 }}>
              Brand images
            </div>
            <div style={{ fontSize: 12, color: "#6B6252", marginBottom: 12 }}>
              Your logo appears on reports and presentations. Your headshot appears on the introduction slide.
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
              <PhotoPicker
                photo={profileDraft.logo}
                onPick={(f) => setProfileImage("logo", f)}
                onClear={() => setProfileDraft({ ...profileDraft, logo: null })}
                label="Logo"
              />
              <PhotoPicker
                photo={profileDraft.photo}
                onPick={(f) => setProfileImage("photo", f)}
                onClear={() => setProfileDraft({ ...profileDraft, photo: null })}
                label="Headshot"
              />
            </div>
          </div>

          <div style={cardStyle}>
            <div className="fraunces" style={{ fontSize: 17, fontWeight: 600, color: "#26221A", marginBottom: 12 }}>
              Introduction
            </div>
            <label style={{ ...labelStyle, display: "block" }}>
              Short bio
              <textarea
                value={profileDraft.bio || ""}
                onChange={(e) => setProfileDraft({ ...profileDraft, bio: e.target.value })}
                rows={4}
                placeholder="Ocean Beach and Point Loma specialist. 40+ homes sold in 92107. I price with real neighborhood data, not guesswork."
                style={{ ...inputStyle, width: "100%", fontWeight: 400, fontFamily: "'Libre Franklin', sans-serif", resize: "vertical", marginTop: 6, padding: "10px 12px", fontSize: 14 }}
              />
            </label>
            <label style={{ fontSize: 13, color: "#26221A", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginTop: 10 }}>
              <input
                type="checkbox"
                checked={profileDraft.introEnabled !== false}
                onChange={(e) => setProfileDraft({ ...profileDraft, introEnabled: e.target.checked })}
              />
              Include an introduction slide in presentations
            </label>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 4 }}>
            <button
              onClick={saveProfilePage}
              disabled={profileBusy}
              style={{ padding: "11px 22px", fontSize: 13.5, fontWeight: 700, cursor: profileBusy ? "wait" : "pointer", borderRadius: 6, border: "none", background: "#A8853C", color: "#16301F" }}
            >
              {profileBusy ? "Saving…" : profileReturnTo ? "Save & continue" : "Save profile"}
            </button>
            {savedProfile && (
              <button
                onClick={() => { setProfileDraft({ ...initialAgent, ...savedProfile }); toast("Reverted to your saved profile."); }}
                style={{ padding: "11px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer", borderRadius: 6, border: "1px solid #2E5540", background: "transparent", color: "#8FAE9B" }}
              >
                Undo changes
              </button>
            )}
          </div>
        </div>
      )}

      {view === "shares" && (
        <div className="chrome" style={{ maxWidth: 760, margin: "28px auto", padding: "0 20px 60px" }}>
          <div style={{ color: "#D9C48F", fontSize: 13, marginBottom: 18, lineHeight: 1.6 }}>
            Every presentation you've shared, and whether your client has opened it yet.
          </div>
          {sharesBusy && shares.length === 0 && skeletonRows(3)}
          {!sharesBusy && shares.length === 0 && (
            <div style={{ ...cardStyle, textAlign: "center", color: "#6B6252", fontSize: 14 }}>
              No shared links yet. Open a report in Full CMA (Present) and hit Share link.
            </div>
          )}
          {shares.map((sh) => {
            const viewed = (sh.view_count || 0) > 0;
            return (
              <div key={sh.id} style={{ ...cardStyle, borderLeft: `3px solid ${viewed ? "#1F3D2B" : "#C9BC9C"}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ minWidth: 0 }}>
                    <div className="fraunces" style={{ fontSize: 17, fontWeight: 600, color: "#26221A" }}>
                      {sh.address || "Untitled presentation"}
                    </div>
                    <div style={{ fontSize: 12, color: "#6B6252", marginTop: 3 }}>
                      Shared {new Date(sh.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      {" · "}
                      {viewed ? (
                        <span style={{ color: "#1F3D2B", fontWeight: 600 }}>
                          Opened {sh.view_count} time{sh.view_count !== 1 ? "s" : ""}
                          {sh.last_viewed_at && ` · last ${new Date(sh.last_viewed_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`}
                        </span>
                      ) : (
                        <span style={{ color: "#8A7E63", fontStyle: "italic" }}>Not opened yet</span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    <a href={shareUrlFor(sh.id)} target="_blank" rel="noreferrer"
                      style={{ padding: "7px 14px", fontSize: 13, fontWeight: 600, borderRadius: 3, border: "1px solid #A99C7A", background: "transparent", color: "#1F3D2B", textDecoration: "none" }}>
                      Open
                    </a>
                    <button onClick={() => copyShareLink(sh.id)}
                      style={{ padding: "7px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", borderRadius: 3, border: "none", background: copiedShare === sh.id ? "#1F3D2B" : "#A8853C", color: copiedShare === sh.id ? "#EFE7D3" : "#16301F" }}>
                      {copiedShare === sh.id ? "Copied" : "Copy link"}
                    </button>
                    <button onClick={() => askConfirm({
                      title: "Revoke this link?",
                      body: "Anyone who already has this link will immediately lose access to the presentation. Your report itself is not affected.",
                      confirmLabel: "Revoke link",
                      danger: true,
                      onConfirm: async () => { await deleteShare(sh.id); toast("Link revoked."); },
                    })} title="Revoke this link"
                      style={{ padding: "7px 12px", fontSize: 13, cursor: "pointer", borderRadius: 3, border: "1px solid #A99C7A", background: "transparent", color: "#8E3B2F", fontWeight: 600 }}>
                      Revoke
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === "drafts" && (
        <div className="chrome" style={{ maxWidth: 760, margin: "28px auto", padding: "0 20px 60px" }}>
          <div style={{ color: "#D9C48F", fontSize: 13, marginBottom: 18, lineHeight: 1.6 }}>
            Your saved reports. Open one to keep working on it, and use Save changes to update it.
          </div>
          {draftsLoading && drafts.length === 0 && skeletonRows(3)}
          {!draftsLoading && drafts.length === 0 && (
            <div style={{ ...cardStyle, textAlign: "center", color: "#6B6252", fontSize: 14 }}>
              No saved reports yet. Start a report and it saves itself as you work.
            </div>
          )}
          {drafts.map((d) => (
            <div key={d.id} style={{ ...cardStyle, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div className="fraunces" style={{ fontSize: 17, fontWeight: 600, color: "#26221A" }}>
                  {d.name} {d.id === currentDraftId && <span style={{ fontSize: 11, color: "#8E3B2F" }}>(open)</span>}
                </div>
                <div style={{ fontSize: 12, color: "#6B6252" }}>
                  Last saved {new Date(d.updated_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => openDraft(d.id)}
                  style={{ padding: "7px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", borderRadius: 3, border: "none", background: "#1F3D2B", color: "#EFE7D3" }}
                >
                  Open
                </button>
                <button
                  onClick={() => askConfirm({
                    title: "Delete this report?",
                    body: `"${d.name}" will be permanently removed. This can't be undone.`,
                    confirmLabel: "Delete report",
                    danger: true,
                    onConfirm: async () => { await deleteDraft(d.id); toast("Report deleted."); },
                  })}
                  style={{ padding: "7px 12px", fontSize: 13, cursor: "pointer", borderRadius: 3, border: "1px solid #A99C7A", background: "transparent", color: "#8E3B2F", fontWeight: 600 }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {view === "inputs" && (
        <div className="chrome ds-form ds-onlight" style={{ maxWidth: 760, margin: "16px auto", padding: "0 20px 60px" }}>
          {(() => {
            const done1 = !!subject.address && Number(subject.sqft) > 0;
            const done2 = comps.length > 0 && comps.every((c) => Number(c.price) > 0);
            const steps = [
              { n: 1, label: "Property", done: done1 },
              { n: 2, label: "Comparables", done: done2 },
              { n: 3, label: "Finishing touches", done: true },
            ];
            return (
              <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
                {steps.map((s) => {
                  const active = step === s.n;
                  return (
                    <button
                      key={s.n}
                      onClick={() => { setStep(s.n); window.scrollTo(0, 0); }}
                      style={{
                        display: "flex", alignItems: "center", gap: 9, padding: "10px 16px", borderRadius: 4,
                        cursor: "pointer", fontFamily: "inherit", flex: "1 1 auto", minWidth: 150,
                        border: `1px solid ${active ? "#A8853C" : "#2E5540"}`,
                        background: active ? "rgba(168,133,60,0.16)" : "transparent",
                        transition: "all .13s ease",
                      }}
                    >
                      <span style={{
                        width: 22, height: 22, borderRadius: "50%", flexShrink: 0, fontSize: 11.5, fontWeight: 700,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: s.done ? "#A8853C" : active ? "#EFE7D3" : "transparent",
                        color: s.done ? "#16301F" : active ? "#1F3D2B" : "#8FAE9B",
                        border: s.done || active ? "none" : "1.5px solid #2E5540",
                      }}>
                        {s.done ? "✓" : s.n}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: active ? 700 : 500, color: active ? "#EFE7D3" : "#8FAE9B", textAlign: "left" }}>
                        {s.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })()}

          {step === 2 && (<>
          {/* MLS paste import */}
          <div style={{ ...cardStyle, borderLeft: "3px solid #8E3B2F" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <div>
                <div className="fraunces" style={{ fontSize: 17, fontWeight: 600, color: "#26221A" }}>
                  Import from MLS
                </div>
                <div style={{ fontSize: 12, color: "#6B6252", marginTop: 2 }}>
                  Copy your sold comps from the MLS, Zillow, Redfin, or a CSV — paste, and the comps fill themselves in.
                </div>
              </div>
              <button
                onClick={() => { setImportOpen(!importOpen); setImportError(null); }}
                style={{ padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", borderRadius: 3, border: "none", background: "#8E3B2F", color: "#EFE7D3" }}
              >
                {importOpen ? "Close" : "Paste comps"}
              </button>
            </div>
            {importOpen && (
              <div style={{ marginTop: 14 }}>
                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  rows={7}
                  placeholder={"Paste your MLS results here — the raw text is fine, formatting doesn't matter.\n\nExample of what works: a copied results grid, a CSV export, or even:\n4622 Del Monte Ave  3/2  1,410 sqft  SOLD 5/12/2026  $1,385,000\n4915 Coronado Ave  3/2  1,520 sqft  SOLD 4/03/2026  $1,450,000"}
                  style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", fontSize: 13, border: "1px solid #A99C7A", borderRadius: 3, background: "#FBF7EC", color: "#26221A", fontFamily: "monospace", resize: "vertical" }}
                />
                <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 10, flexWrap: "wrap" }}>
                  <button
                    onClick={() => {
                      if (comps.length > 0) {
                        askConfirm({
                          title: "Replace the current comps?",
                          body: `Importing will replace the ${comps.length} comparable${comps.length !== 1 ? "s" : ""} in this report, including any adjustments you've entered.`,
                          confirmLabel: "Replace comps",
                          danger: true,
                          onConfirm: importComps,
                        });
                      } else importComps();
                    }}
                    disabled={importBusy}
                    style={{ padding: "9px 20px", fontSize: 13, fontWeight: 600, cursor: importBusy ? "wait" : "pointer", borderRadius: 3, border: "none", background: importBusy ? "#8A7E63" : "#1F3D2B", color: "#EFE7D3" }}
                  >
                    {importBusy ? "Reading…" : "Import comps"}
                  </button>
                  <span style={{ fontSize: 12, color: "#8A7E63" }}>
                    Heads up: this replaces the comps currently in the report.
                  </span>
                </div>
                {importError && (
                  <div style={{ marginTop: 10, fontSize: 13, color: "#8E3B2F", fontWeight: 500 }}>{importError}</div>
                )}
              </div>
            )}
          </div>
          </>)}

          {step === 3 && (
          <div style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center", minWidth: 0 }}>
                {agent.logo ? (
                  <img src={agent.logo} alt="" style={{ width: 54, height: 40, objectFit: "contain", flexShrink: 0 }} />
                ) : (
                  <span style={{ width: 42, height: 42, borderRadius: "50%", background: "#1F3D2B", color: "#EFE7D3", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
                    {(agent.name || "A").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                  </span>
                )}
                <div style={{ minWidth: 0 }}>
                  <div className="fraunces" style={{ fontSize: 17, fontWeight: 600, color: "#26221A" }}>
                    {agent.name === initialAgent.name ? "No branding on this report yet" : agent.name}
                  </div>
                  <div style={{ fontSize: 12, color: "#6B6252", marginTop: 2 }}>
                    {agent.name === initialAgent.name
                      ? "Apply your saved profile, or fill it in below."
                      : `${agent.brokerage} · ${agent.license} · ${agent.phone}`}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {savedProfile ? (
                  <button
                    onClick={() => { applyProfile(); }}
                    style={{ padding: "9px 16px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", borderRadius: 4, border: "none", background: "#1F3D2B", color: "#EFE7D3" }}
                  >
                    Use my profile
                  </button>
                ) : (
                  <button
                    onClick={() => { setProfileReturnTo({ view: "inputs", step: 3 }); setView("profile"); window.scrollTo(0, 0); }}
                    style={{ padding: "9px 16px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", borderRadius: 4, border: "none", background: "#1F3D2B", color: "#EFE7D3" }}
                  >
                    Set up my profile
                  </button>
                )}
                <button
                  onClick={() => { setProfileReturnTo({ view: "inputs", step: 3 }); setView("profile"); window.scrollTo(0, 0); }}
                  style={{ padding: "9px 14px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", borderRadius: 4, border: "1px solid #A99C7A", background: "transparent", color: "#6B6252" }}
                >
                  Edit profile
                </button>
              </div>
            </div>

            <details>
              <summary style={{ cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#1F3D2B", marginBottom: 10 }}>
                Customise branding for this report only
              </summary>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
              {[["name", "Name"], ["brokerage", "Brokerage"], ["license", "DRE #"], ["phone", "Phone"]].map(([field, label]) => (
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
              <PhotoPicker
                photo={agent.logo}
                onPick={(f) => setAgentImage("logo", f)}
                onClear={() => setAgent({ ...agent, logo: null })}
                label="Logo"
              />
              <PhotoPicker
                photo={agent.photo}
                onPick={(f) => setAgentImage("photo", f)}
                onClear={() => setAgent({ ...agent, photo: null })}
                label="Your headshot"
              />
            </div>
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px dashed #C9BC9C" }}>
              <label style={{ ...labelStyle, display: "block" }}>
                Short bio (used on your introduction slide)
                <textarea
                  value={agent.bio}
                  onChange={(e) => setAgent({ ...agent, bio: e.target.value })}
                  rows={3}
                  placeholder="e.g. Ocean Beach and Point Loma specialist. 40+ homes sold in 92107. I price with real neighborhood data, not guesswork."
                  style={{ ...inputStyle, width: "100%", fontWeight: 400, fontFamily: "'Libre Franklin', sans-serif", resize: "vertical", marginTop: 6, padding: "10px 12px", fontSize: 14 }}
                />
              </label>
              <label style={{ fontSize: 13, color: "#26221A", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginTop: 10 }}>
                <input
                  type="checkbox"
                  checked={agent.introEnabled !== false}
                  onChange={(e) => setAgent({ ...agent, introEnabled: e.target.checked })}
                />
                Include an introduction slide in the presentation
              </label>
            </div>
            </details>
          </div>
          )}

          {step === 1 && (
          <div style={cardStyle}>
            <div className="fraunces" style={{ fontSize: 17, fontWeight: 600, color: "#26221A", marginBottom: 12 }}>
              Subject property information
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
              <label style={labelStyle}>
                Property type
                <select value={subject.propertyType || PROPERTY_TYPES[0]}
                  onChange={(e) => setSubject({ ...subject, propertyType: e.target.value })}
                  style={{ ...inputStyle, width: 200, fontWeight: 400 }}>
                  {PROPERTY_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </label>
              <label style={labelStyle}>
                Street address
                <input type="text" value={subject.address} onChange={(e) => setSubject({ ...subject, address: e.target.value })} style={{ ...inputStyle, width: 220 }} />
              </label>
              <label style={labelStyle}>
                City / area / zip
                <input type="text" value={subject.city} onChange={(e) => setSubject({ ...subject, city: e.target.value })} style={{ ...inputStyle, width: 250 }} />
              </label>
              <PhotoPicker
                photo={subject.photo}
                onPick={setSubjectPhoto}
                onClear={() => setSubject({ ...subject, photo: null })}
                label="Cover photo"
              />
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 14 }}>
              <label style={labelStyle}>
                Bedrooms
                <input type="number" value={subject.beds} onChange={(e) => setSubject({ ...subject, beds: Number(e.target.value) || 0 })} style={{ ...inputStyle, width: 80 }} />
              </label>
              <label style={labelStyle}>
                Baths
                <input type="number" step="0.5" value={subject.baths} onChange={(e) => setSubject({ ...subject, baths: Number(e.target.value) || 0 })} style={{ ...inputStyle, width: 80 }} />
              </label>
              <label style={labelStyle}>
                Total sqft
                <input type="number" value={subject.sqft} onChange={(e) => setSubject({ ...subject, sqft: Number(e.target.value) || 0 })} style={{ ...inputStyle, width: 105 }} />
              </label>
              <label style={labelStyle}>
                Living area sqft
                <input type="number" value={subject.livingSqft} onChange={(e) => setSubject({ ...subject, livingSqft: e.target.value })} style={{ ...inputStyle, width: 115 }} />
              </label>
              <label style={labelStyle}>
                Year built
                <input type="number" value={subject.year} onChange={(e) => setSubject({ ...subject, year: Number(e.target.value) || 0 })} style={{ ...inputStyle, width: 95 }} />
              </label>
              <label style={labelStyle}>
                Lot size
                <input type="number" value={subject.lotSize} onChange={(e) => setSubject({ ...subject, lotSize: e.target.value })} style={{ ...inputStyle, width: 110 }} />
              </label>
              <div style={{ ...labelStyle, display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 4, paddingBottom: 6 }}>
                <span>Units</span>
                <div style={{ display: "flex", gap: 10, fontSize: 13, color: "#26221A", textTransform: "none", letterSpacing: 0 }}>
                  {["sqft", "acres"].map((u) => (
                    <label key={u} style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
                      <input type="radio" name="lotUnits" checked={(subject.lotUnits || "sqft") === u}
                        onChange={() => setSubject({ ...subject, lotUnits: u })} />
                      {u}
                    </label>
                  ))}
                </div>
              </div>
              <label style={labelStyle}>
                Lot dimensions
                <input type="text" value={subject.lotDimensions} placeholder="60 x 80"
                  onChange={(e) => setSubject({ ...subject, lotDimensions: e.target.value })} style={{ ...inputStyle, width: 120, fontWeight: 400 }} />
              </label>
            </div>

            <details style={{ marginTop: 14, paddingTop: 12, borderTop: "1px dashed #C9BC9C" }}>
              <summary style={{ cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#1F3D2B" }}>
                Tax, parcel & association details
              </summary>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 12 }}>
                <label style={labelStyle}>
                  Tax amount
                  <input type="number" value={subject.taxAmount} onChange={(e) => setSubject({ ...subject, taxAmount: e.target.value })} style={{ ...inputStyle, width: 120 }} />
                </label>
                <label style={labelStyle}>
                  Tax year
                  <input type="number" value={subject.taxYear} onChange={(e) => setSubject({ ...subject, taxYear: e.target.value })} style={{ ...inputStyle, width: 95 }} />
                </label>
                <label style={labelStyle}>
                  Parcel #
                  <input type="text" value={subject.parcel} onChange={(e) => setSubject({ ...subject, parcel: e.target.value })} style={{ ...inputStyle, width: 150, fontWeight: 400 }} />
                </label>
                <label style={labelStyle}>
                  County
                  <input type="text" value={subject.county} onChange={(e) => setSubject({ ...subject, county: e.target.value })} style={{ ...inputStyle, width: 170, fontWeight: 400 }} />
                </label>
                <label style={labelStyle}>
                  HOA dues (monthly)
                  <input type="number" value={subject.hoaDues} onChange={(e) => setSubject({ ...subject, hoaDues: e.target.value })} style={{ ...inputStyle, width: 130 }} />
                </label>
                <label style={labelStyle}>
                  Maintenance fee
                  <input type="number" value={subject.maintenanceFee} onChange={(e) => setSubject({ ...subject, maintenanceFee: e.target.value })} style={{ ...inputStyle, width: 130 }} />
                </label>
              </div>
            </details>

            <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px dashed #C9BC9C" }}>
              <label style={{ ...labelStyle, display: "block" }}>
                Features (one per line, or comma separated)
                <textarea
                  value={subject.features}
                  onChange={(e) => setSubject({ ...subject, features: e.target.value })}
                  rows={3}
                  placeholder="Remodeled kitchen with quartz counters&#10;Original 1948 hardwood floors&#10;Detached garage, private fenced yard"
                  style={{ ...inputStyle, width: "100%", fontWeight: 400, fontFamily: "'Libre Franklin', sans-serif", resize: "vertical", marginTop: 6, padding: "10px 12px", fontSize: 14 }}
                />
              </label>
            </div>
          </div>
          )}

          {step === 2 && (<>
          {comps.map((c) => (
            <div key={c.id} style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div className="fraunces" style={{ fontSize: 17, fontWeight: 600, color: "#26221A" }}>Comparable sale</div>
                <button onClick={() => askConfirm({
                  title: "Remove this comparable?",
                  body: `${c.address} and its adjustments will be removed from this report.`,
                  confirmLabel: "Remove comp",
                  danger: true,
                  onConfirm: () => removeComp(c.id),
                })} style={{ padding: "4px 10px", fontSize: 12, cursor: "pointer", borderRadius: 3, border: "1px solid #A99C7A", background: "transparent", color: "#8E3B2F", fontWeight: 600 }}>
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
                <PhotoPicker
                  photo={c.photo}
                  onPick={(f) => setCompPhoto(c.id, f)}
                  onClear={() => updateComp(c.id, "photo", null)}
                />
              </div>
              <details style={{ marginBottom: 12, paddingTop: 10, borderTop: "1px dashed #C9BC9C" }}>
                <summary style={{ cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#1F3D2B" }}>
                  Photos, remarks & details {((c.photos || []).length > 0 || c.remarks) ? `(${(c.photos || []).length} photo${(c.photos || []).length !== 1 ? "s" : ""}${c.remarks ? ", remarks added" : ""})` : ""}
                </summary>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12, alignItems: "flex-start" }}>
                  {(c.photos || []).map((p, pi) => (
                    <div key={pi} style={{ position: "relative" }}>
                      <img src={p} alt="" style={{ width: 74, height: 56, objectFit: "cover", borderRadius: 3, border: "1px solid #A99C7A", display: "block" }} />
                      <button onClick={() => removeCompPhoto(c.id, pi)} title="Remove photo"
                        style={{ position: "absolute", top: -7, right: -7, width: 19, height: 19, borderRadius: "50%", border: "none", background: "#8E3B2F", color: "#EFE7D3", fontSize: 10, cursor: "pointer", lineHeight: "19px", padding: 0 }}>
                        ✕
                      </button>
                      {pi === 0 && (
                        <span style={{ position: "absolute", bottom: 3, left: 3, background: "rgba(31,61,43,.85)", color: "#EFE7D3", fontSize: 8.5, fontWeight: 700, padding: "1px 4px", borderRadius: 2 }}>COVER</span>
                      )}
                    </div>
                  ))}
                  <label style={{ cursor: "pointer" }}>
                    <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 74, height: 56, fontSize: 11, fontWeight: 600, border: "1px dashed #A99C7A", borderRadius: 3, background: "#FBF7EC", color: "#1F3D2B", textAlign: "center", lineHeight: 1.3 }}>
                      + Add<br />photos
                    </span>
                    <input type="file" accept="image/*" multiple style={{ display: "none" }}
                      onChange={(e) => { addCompPhotos(c.id, e.target.files); e.target.value = ""; }} />
                  </label>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 14 }}>
                  <label style={labelStyle}>
                    Status
                    <select value={c.status || "Sold"} onChange={(e) => updateComp(c.id, "status", e.target.value)}
                      style={{ ...inputStyle, width: 110, fontWeight: 400 }}>
                      <option>Sold</option><option>Pending</option><option>Active</option>
                    </select>
                  </label>
                  <label style={labelStyle}>
                    Days on market
                    <input type="number" value={c.dom || ""} onChange={(e) => updateComp(c.id, "dom", e.target.value)} style={{ ...inputStyle, width: 110 }} />
                  </label>
                  <label style={labelStyle}>
                    Lot size
                    <input type="text" value={c.lotSize || ""} placeholder="6,600 sqft"
                      onChange={(e) => updateComp(c.id, "lotSize", e.target.value)} style={{ ...inputStyle, width: 120, fontWeight: 400 }} />
                  </label>
                  <label style={labelStyle}>
                    Year built
                    <input type="number" value={c.year || ""} onChange={(e) => updateComp(c.id, "year", e.target.value)} style={{ ...inputStyle, width: 100 }} />
                  </label>
                </div>

                <label style={{ ...labelStyle, display: "block", marginTop: 12 }}>
                  Agent remarks / listing description
                  <textarea value={c.remarks || ""} onChange={(e) => updateComp(c.id, "remarks", e.target.value)} rows={3}
                    placeholder="Paste the listing remarks from the MLS here — they show when a client taps this comp on the map."
                    style={{ ...inputStyle, width: "100%", fontWeight: 400, fontFamily: "'Libre Franklin', sans-serif", resize: "vertical", marginTop: 6, padding: "10px 12px", fontSize: 13.5 }} />
                </label>
              </details>

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
          </>)}

          {step === 3 && (
          <div style={{ ...cardStyle, marginTop: 14, borderLeft: "3px solid #A8853C" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
              <div>
                <div className="fraunces" style={{ fontSize: 17, fontWeight: 600, color: "#26221A" }}>Seller net sheet</div>
                <div style={{ fontSize: 12, color: "#6B6252", marginTop: 2 }}>
                  What the seller walks away with. Estimates from the recommended list price — adjust for this seller's situation.
                </div>
              </div>
              <label style={{ fontSize: 13, color: "#26221A", display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={netSheet.enabled}
                  onChange={(e) => setNetSheet({ ...netSheet, enabled: e.target.checked })}
                />
                Include in report & presentation
              </label>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
              <label style={labelStyle}>
                Sale price (blank = recommended)
                <input type="number" step="5000" value={netSheet.priceOverride} placeholder={String(mid)}
                  onChange={(e) => setNetSheet({ ...netSheet, priceOverride: e.target.value })}
                  style={{ ...inputStyle, width: 150 }} />
              </label>
              <label style={labelStyle}>
                Total commission %
                <input type="number" step="0.25" value={netSheet.commissionPct}
                  onChange={(e) => setNetSheet({ ...netSheet, commissionPct: e.target.value })}
                  style={{ ...inputStyle, width: 90 }} />
              </label>
              <label style={labelStyle}>
                Title, escrow & closing %
                <input type="number" step="0.25" value={netSheet.closingPct}
                  onChange={(e) => setNetSheet({ ...netSheet, closingPct: e.target.value })}
                  style={{ ...inputStyle, width: 90 }} />
              </label>
              <label style={labelStyle}>
                Transfer tax %
                <input type="number" step="0.01" value={netSheet.transferPct}
                  onChange={(e) => setNetSheet({ ...netSheet, transferPct: e.target.value })}
                  style={{ ...inputStyle, width: 90 }} />
              </label>
              <label style={labelStyle}>
                Mortgage payoff $
                <input type="number" step="1000" value={netSheet.payoff}
                  onChange={(e) => setNetSheet({ ...netSheet, payoff: e.target.value })}
                  style={{ ...inputStyle, width: 130 }} />
              </label>
              <label style={labelStyle}>
                Repairs / credits $
                <input type="number" step="500" value={netSheet.credits}
                  onChange={(e) => setNetSheet({ ...netSheet, credits: e.target.value })}
                  style={{ ...inputStyle, width: 110 }} />
              </label>
            </div>
            <div style={{ marginTop: 12, fontSize: 14, color: "#1F3D2B", fontWeight: 700 }}>
              Estimated net proceeds: {fmt(netProceeds)}
            </div>
          </div>
          )}

          {/* Step navigation */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginTop: 20, paddingTop: 16, borderTop: "1px solid #2E5540", flexWrap: "wrap" }}>
            <button
              onClick={() => { setStep(Math.max(1, step - 1)); window.scrollTo(0, 0); }}
              disabled={step === 1}
              style={{ padding: "10px 18px", fontSize: 13, fontWeight: 600, borderRadius: 3, border: "1px solid #2E5540", background: "transparent", color: step === 1 ? "#3E5A4A" : "#8FAE9B", cursor: step === 1 ? "default" : "pointer" }}
            >
              ← Back
            </button>
            {step < 3 ? (
              <button
                onClick={() => { setStep(step + 1); window.scrollTo(0, 0); }}
                style={{ padding: "11px 24px", fontSize: 13.5, fontWeight: 700, borderRadius: 3, border: "none", background: "#A8853C", color: "#16301F", cursor: "pointer" }}
              >
                Next: {step === 1 ? "Comparables" : "Finishing touches"} →
              </button>
            ) : (
              <button
                onClick={() => setView("report")}
                style={{ padding: "11px 24px", fontSize: 13.5, fontWeight: 700, borderRadius: 3, border: "none", background: "#8E3B2F", color: "#EFE7D3", cursor: "pointer" }}
              >
                See the report →
              </button>
            )}
          </div>
        </div>
      )}

      {view === "copy" && (
        <div className="chrome ds-form ds-onlight" style={{ maxWidth: 760, margin: "16px auto", padding: "0 20px 60px" }}>
          <div style={{ color: "#D9C48F", fontSize: 13, marginBottom: 18, lineHeight: 1.6 }}>
            One click writes the MLS description, Instagram announcement, and email blast for {subject.address}. Add the highlights only you would know, pick a tone, and generate.
          </div>

          <div style={cardStyle}>
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
                <div key={card.key} style={{ ...cardStyle, borderLeft: "3px solid #A8853C" }}>
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
        <div className="report-wrap" style={{ maxWidth: 820, margin: "24px auto 60px", background: "#EFE7D3", boxShadow: "0 12px 40px rgba(0,0,0,0.45)", border: "1px solid #C9BC9C" }}>
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
                {subject.beds} bed · {subject.baths} bath · {subject.sqft.toLocaleString()} sqft · {lotDisplay(subject)} lot · built {subject.year}
              </div>
            </div>

            {subject.photo && (
              <img
                src={subject.photo}
                alt={subject.address}
                style={{ width: "100%", height: 210, objectFit: "cover", border: "1px solid #A99C7A", marginBottom: 26, display: "block" }}
              />
            )}

            <div style={{ marginBottom: 30 }}>
              <div style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: "#1F3D2B", fontWeight: 600, marginBottom: 14 }}>
                Suggested market position
              </div>
              <div style={{ position: "relative", height: 8, background: "#D8CCAC", borderRadius: 4, margin: "26px 8px 8px" }}>
                <div style={{ position: "absolute", left: "8%", right: "8%", top: 0, bottom: 0, background: "linear-gradient(90deg, #A8853C, #1F3D2B)", borderRadius: 4 }} />
                <div style={{ position: "absolute", left: "50%", top: -9, transform: "translateX(-50%)", width: 26, height: 26, borderRadius: "50%", background: "#8E3B2F", border: "3px solid #EFE7D3", boxShadow: "0 2px 6px rgba(0,0,0,0.3)" }} />
              </div>
              <div className="ds-gauge" style={{ display: "flex", justifyContent: "space-between", padding: "0 8px", marginTop: 10 }}>
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

            {GEOAPIFY_KEY && (mapPoints || mapUrl || mapBusy) && (
              <div className="map-inline" style={{ marginBottom: 30 }}>
                <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
                <div style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: "#1F3D2B", fontWeight: 600, marginBottom: 12 }}>
                  Comparable locations
                </div>
                {mapPoints ? (
                  <>
                    <div
                      ref={mapDivRef}
                      className="no-print"
                      style={{ width: "100%", height: 380, border: "1px solid #A99C7A" }}
                    />
                    <div style={{ fontSize: 10.5, color: "#8A7E63", marginTop: 6, fontStyle: "italic" }}>
                      S = subject property · numbered pins are comparable sales in ledger order · click a pin for details · drag and zoom to explore
                    </div>
                  </>
                ) : mapUrl ? (
                  <>
                    <img
                      src={mapUrl}
                      alt="Map of subject property and comparable sales"
                      onError={() => setMapUrl(null)}
                      style={{ width: "100%", height: 260, objectFit: "cover", border: "1px solid #A99C7A", display: "block" }}
                    />
                    <div style={{ fontSize: 10.5, color: "#8A7E63", marginTop: 6, fontStyle: "italic" }}>
                      S = subject property · numbered pins are comparable sales in ledger order
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: 12, color: "#8A7E63", fontStyle: "italic" }}>Building map…</div>
                )}
              </div>
            )}

            <div style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: "#1F3D2B", fontWeight: 600, marginBottom: 12 }}>
              Comparable sales ledger
            </div>
            {adjusted.map((c) => (
              <div key={c.id} style={{ borderTop: "1px solid #C9BC9C", padding: "14px 4px", display: "flex", gap: 14 }}>
                {c.photo && (
                  <img src={c.photo} alt={c.address} style={{ width: 84, height: 84, objectFit: "cover", border: "1px solid #A99C7A", flexShrink: 0 }} />
                )}
                <div style={{ flex: 1 }}>
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

            {netSheet.enabled && (
              <div style={{ marginTop: 26 }}>
                <div style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: "#1F3D2B", fontWeight: 600, marginBottom: 12 }}>
                  Estimated seller net proceeds
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 600, color: "#26221A", padding: "6px 4px" }}>
                  <span>Sale price{!netSheet.priceOverride ? " (recommended list)" : ""}</span>
                  <span>{fmt(netBase)}</span>
                </div>
                {[
                  [`Commission (${netSheet.commissionPct}%)`, netLines.commission],
                  [`Title, escrow & closing (${netSheet.closingPct}%)`, netLines.closing],
                  [`Transfer tax (${netSheet.transferPct}%)`, netLines.transfer],
                  ["Mortgage payoff", netLines.payoff],
                  ["Repairs / seller credits", netLines.credits],
                ].filter(([, v]) => v > 0).map(([label, v]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#6B6252", padding: "3px 4px 0 20px" }}>
                    <span>{label}</span>
                    <span style={{ color: "#8E3B2F", fontWeight: 500 }}>−{fmt(v)}</span>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16, fontWeight: 700, color: "#1F3D2B", paddingTop: 8, marginTop: 8, borderTop: "1px solid #A99C7A" }}>
                  <span style={{ paddingLeft: 4 }}>Estimated net to seller</span>
                  <span>{fmt(netProceeds)}</span>
                </div>
                <div style={{ fontSize: 9.5, color: "#8A7E63", fontStyle: "italic", marginTop: 6 }}>
                  Estimates only — actual costs vary by transaction. Final figures come from escrow and the seller's lender.
                </div>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 34, paddingTop: 20, borderTop: "1px solid #A99C7A", flexWrap: "wrap", gap: 14 }}>
              <div>
                {agent.logo && (
                  <img src={agent.logo} alt={agent.brokerage} style={{ maxWidth: 150, maxHeight: 46, objectFit: "contain", display: "block", marginBottom: 8 }} />
                )}
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

            {/* Printed on its own sheet so the report stays one page */}
            {mapUrl && (
              <div className="map-page">
                <div style={{ textAlign: "center", borderBottom: "1px solid #A99C7A", paddingBottom: 16, marginBottom: 20 }}>
                  <div style={{ fontSize: 10, letterSpacing: "0.3em", color: "#8E3B2F", textTransform: "uppercase", fontWeight: 600 }}>
                    Comparable locations
                  </div>
                  <div className="fraunces" style={{ fontSize: 22, fontWeight: 700, color: "#1F3D2B", marginTop: 6 }}>
                    {subject.address}
                  </div>
                  <div style={{ fontSize: 11.5, color: "#6B6252", marginTop: 3 }}>{subject.city}</div>
                </div>
                <img
                  src={mapUrl}
                  alt="Map of subject property and comparable sales"
                  style={{ width: "100%", border: "1px solid #A99C7A", display: "block" }}
                />
                <div style={{ fontSize: 10.5, color: "#8A7E63", marginTop: 8, fontStyle: "italic" }}>
                  S = subject property · numbered pins are comparable sales in ledger order
                </div>
                <div style={{ marginTop: 18, paddingTop: 12, borderTop: "1px solid #A99C7A", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                  <div>
                    {adjusted.map((c, i) => (
                      <div key={c.id} style={{ fontSize: 11, color: "#3A3428", padding: "2px 0" }}>
                        <span style={{ fontWeight: 700, color: "#1F3D2B" }}>{i + 1}.</span> {c.address} — {fmt(c.price)}
                      </div>
                    ))}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className="fraunces" style={{ fontSize: 14, fontWeight: 600, color: "#1F3D2B" }}>{agent.name}</div>
                    <div style={{ fontSize: 10.5, color: "#6B6252" }}>{agent.brokerage} · {agent.license}</div>
                    <div style={{ fontSize: 10.5, color: "#6B6252" }}>{agent.phone}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      </div>
      </div>

      {/* Mobile menu sheet */}
      {menuOpen && (
        <div
          onClick={() => setMenuOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(10,22,15,0.65)", zIndex: 10040, display: "flex", alignItems: "flex-end" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%", background: "#EFE7D3", borderRadius: "14px 14px 0 0",
              padding: "10px 14px calc(20px + env(safe-area-inset-bottom, 0px))",
              maxHeight: "80vh", overflowY: "auto",
            }}
          >
            <div style={{ width: 42, height: 4, borderRadius: 2, background: "#C9BC9C", margin: "4px auto 14px" }} />

            {inEditor && (
              <>
                <div style={{ fontSize: 10.5, letterSpacing: "0.16em", textTransform: "uppercase", color: "#8A7E63", fontWeight: 700, padding: "4px 6px 8px" }}>
                  This report
                </div>
                {[
                  ["Present full CMA", () => { setShareInfo(null); setView("present"); }],
                  ["Quick CMA (PDF)", () => { setView("report"); setTimeout(() => window.print(), 400); }],
                  ["Presentation setup", () => setWizardOpen(true)],
                  ["Save now", () => { autoSave(); toast("Saved."); }],
                ].map(([label, fn]) => (
                  <button
                    key={label}
                    onClick={() => { setMenuOpen(false); fn(); }}
                    style={{ display: "block", width: "100%", textAlign: "left", padding: "14px 8px", fontSize: 15, fontWeight: 600, color: "#26221A", background: "none", border: "none", borderBottom: "1px solid #DFD5B8", cursor: "pointer", fontFamily: "inherit" }}
                  >
                    {label}
                  </button>
                ))}
              </>
            )}

            <div style={{ fontSize: 10.5, letterSpacing: "0.16em", textTransform: "uppercase", color: "#8A7E63", fontWeight: 700, padding: "16px 6px 8px" }}>
              Account
            </div>
            {sub.billingEnabled && !sub.owner && (
              <button
                onClick={() => { setMenuOpen(false); openBillingPortal(); }}
                style={{ display: "block", width: "100%", textAlign: "left", padding: "14px 8px", fontSize: 15, fontWeight: 600, color: "#26221A", background: "none", border: "none", borderBottom: "1px solid #DFD5B8", cursor: "pointer", fontFamily: "inherit" }}
              >
                Billing
              </button>
            )}
            <button
              onClick={() => { window.location.href = "/reset"; }}
              style={{ display: "block", width: "100%", textAlign: "left", padding: "14px 8px", fontSize: 15, fontWeight: 600, color: "#26221A", background: "none", border: "none", borderBottom: "1px solid #DFD5B8", cursor: "pointer", fontFamily: "inherit" }}
            >
              Change password
            </button>
            <button
              onClick={() => { setMenuOpen(false); signOut(); }}
              style={{ display: "block", width: "100%", textAlign: "left", padding: "14px 8px", fontSize: 15, fontWeight: 600, color: "#8E3B2F", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}
            >
              Sign out
            </button>
            <div style={{ fontSize: 11.5, color: "#8A7E63", textAlign: "center", paddingTop: 14 }}>
              {session.user.email}
            </div>
          </div>
        </div>
      )}

      {/* Toasts */}
      {toasts.length > 0 && (
        <div style={{ position: "fixed", bottom: 22, right: 22, zIndex: 10050, display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
          {toasts.map((t) => (
            <div
              key={t.id}
              style={{
                background: t.tone === "bad" ? "#8E3B2F" : "#EFE7D3",
                color: t.tone === "bad" ? "#F6E6E2" : "#26221A",
                border: `1px solid ${t.tone === "bad" ? "#8E3B2F" : "#C9BC9C"}`,
                borderLeft: `3px solid ${t.tone === "bad" ? "#F0B5AB" : "#A8853C"}`,
                borderRadius: 4, padding: "11px 16px", fontSize: 13.5, fontWeight: 500,
                boxShadow: "0 10px 28px rgba(0,0,0,.4)", maxWidth: 340,
                animation: "dsToast .22s ease",
              }}
            >
              {t.message}
            </div>
          ))}
        </div>
      )}

      {/* Confirm dialog */}
      {confirmState && (
        <div
          onClick={() => setConfirmState(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(10,22,15,0.72)", zIndex: 10060, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#EFE7D3", border: "1px solid #C9BC9C", borderRadius: 5, padding: "26px 28px", maxWidth: 420, width: "100%" }}>
            <div className="fraunces" style={{ fontSize: 19, fontWeight: 700, color: "#1F3D2B" }}>{confirmState.title}</div>
            <div style={{ fontSize: 13.5, color: "#3A3428", lineHeight: 1.65, marginTop: 8 }}>{confirmState.body}</div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <button
                onClick={() => setConfirmState(null)}
                style={{ padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", borderRadius: 3, border: "1px solid #A99C7A", background: "transparent", color: "#6B6252" }}
              >
                Cancel
              </button>
              <button
                onClick={() => { const fn = confirmState.onConfirm; setConfirmState(null); fn && fn(); }}
                style={{ padding: "9px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer", borderRadius: 3, border: "none", background: confirmState.danger ? "#8E3B2F" : "#1F3D2B", color: "#EFE7D3" }}
              >
                {confirmState.confirmLabel || "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {wizardOpen && (
        <SetupWizard
          meta={meta}
          onApply={(m) => { setMeta(m); setNetSheet((prev) => ({ ...prev, enabled: !!m.sections.net })); setWizardOpen(false); }}
          onClose={() => setWizardOpen(false)}
        />
      )}

      {view === "present" && (
        <ErrorBoundary onReset={() => setView("report")}>
        <Presentation
          subject={subject}
          agent={agent}
          comps={comps}
          mapPoints={mapPoints}
          geoKey={GEOAPIFY_KEY}
          netSheet={netSheet}
          deck={deck}
          onDeckChange={setDeck}
          meta={meta}
          editable
          onExit={() => setView("report")}
          onShare={sharePresentation}
          shareState={shareInfo}
          onPptx={exportSlides}
          pptxBusy={slidesBusy}
        />
        </ErrorBoundary>
      )}

    </div>
  );
}
