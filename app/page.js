import Reveal from "./components/Reveal";
import { site } from "./lib/site";

export const metadata = {
  title: "DeedSheet — CMA reports and listing presentations in minutes",
  description:
    "Paste your comps, add your adjustments, and hand your seller a branded CMA, an interactive presentation and a private link they can open on their phone. Built for solo and small-team agents.",
  openGraph: {
    title: "DeedSheet — CMA reports in minutes",
    description:
      "Branded CMAs, interactive listing presentations and share links your sellers open on their phone.",
    siteName: "DeedSheet",
    type: "website",
  },
};

const GREEN = "#1F3D2B", DARK = "#132719", DARKER = "#0C1B12", PARCH = "#F2ECDC",
  CARD = "#E7DDC2", BRASS = "#A8853C", RED = "#8E3B2F", INK = "#26221A",
  MUTE = "#6B6252", SAGE = "#8FAE9B", EDGE = "#C9BC9C";

const DEMO_URL = site.demoUrl;
const CONTACT = site.contactEmail;

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Libre+Franklin:wght@400;500;600;700&display=swap');
  html { scroll-behavior: smooth; }
  .lp { font-family: 'Libre Franklin', Arial, sans-serif; background: ${DARK}; color: ${PARCH}; overflow-x: hidden; }
  .lp-serif { font-family: 'Fraunces', Georgia, serif; }
  .lp-wrap { max-width: 1120px; margin: 0 auto; padding: 0 22px; }
  .lp-nav { position: sticky; top: 0; z-index: 50; background: rgba(19,39,25,.86);
    backdrop-filter: blur(10px); border-bottom: 1px solid rgba(255,255,255,.07); }
  .lp-btn { display: inline-block; padding: 13px 26px; border-radius: 7px; font-size: 14.5px; font-weight: 700;
    text-decoration: none; transition: all .16s ease; white-space: nowrap; cursor: pointer; border: none; }
  .lp-btn-primary { background: ${BRASS}; color: ${DARKER}; }
  .lp-btn-primary:hover { background: #c09a4c; transform: translateY(-1px); }
  .lp-btn-ghost { border: 1px solid #2E5540; color: ${PARCH}; }
  .lp-btn-ghost:hover { border-color: ${BRASS}; background: rgba(168,133,60,.1); }
  .lp-eyebrow { font-size: 10.5px; letter-spacing: .32em; text-transform: uppercase; color: ${BRASS}; font-weight: 700; }
  .lp-h2 { font-family: 'Fraunces', Georgia, serif; font-size: clamp(26px, 3.4vw, 39px); font-weight: 700;
    margin: 12px 0 0; letter-spacing: -.01em; line-height: 1.15; }
  .lp-lead { color: ${SAGE}; font-size: 15.5px; line-height: 1.8; margin-top: 14px; max-width: 620px; }
  .lp-sec { padding: 74px 0; }
  .lp-sec-alt { background: ${DARKER}; }
  .lp-grid3 { display: grid; grid-template-columns: repeat(auto-fit, minmax(262px, 1fr)); gap: 16px; }
  .lp-card { background: rgba(255,255,255,.035); border: 1px solid #2E5540; border-radius: 13px; padding: 25px;
    transition: border-color .16s ease, transform .16s ease; }
  .lp-card:hover { border-color: rgba(168,133,60,.55); transform: translateY(-2px); }
  .lp-card h3 { font-family: 'Fraunces', Georgia, serif; font-size: 19px; font-weight: 700; margin: 15px 0 8px; }
  .lp-card p { color: ${SAGE}; font-size: 13.5px; line-height: 1.72; margin: 0; }
  .lp-num { width: 32px; height: 32px; border-radius: 9px; background: rgba(168,133,60,.16); color: ${BRASS};
    display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; }
  .lp-split { display: grid; grid-template-columns: 1fr 1fr; gap: 52px; align-items: center; }
  .lp-price { background: ${PARCH}; color: ${INK}; border-radius: 16px; padding: 32px 30px;
    box-shadow: 0 26px 70px rgba(0,0,0,.45); }
  .lp-check { display: flex; gap: 10px; align-items: flex-start; padding: 7px 0; font-size: 14px; color: ${INK}; }
  .lp-faq { border-top: 1px solid rgba(255,255,255,.09); padding: 22px 0; }
  .lp-faq h4 { font-family: 'Fraunces', Georgia, serif; font-size: 17.5px; font-weight: 600; margin: 0 0 8px; }
  .lp-faq p { color: ${SAGE}; font-size: 13.8px; line-height: 1.78; margin: 0; }
  .lp-foot a { color: ${SAGE}; text-decoration: none; font-size: 13px; }
  .lp-foot a:hover { color: ${PARCH}; }
  .lp-tag { display: inline-flex; align-items: center; gap: 7px; padding: 6px 13px; border-radius: 999px;
    border: 1px solid rgba(168,133,60,.45); background: rgba(168,133,60,.1); font-size: 12px; color: #E4D3A8; }

  /* deed report mock */
  .deed { background: ${PARCH}; color: ${INK}; border-radius: 7px; padding: 10px; box-shadow: 0 26px 74px rgba(0,0,0,.52); }
  .deed-inner { border: 2.5px double ${GREEN}; padding: 26px 24px; }
  .deed-row { display: flex; justify-content: space-between; font-size: 11px; padding: 6px 0; border-top: 1px solid ${EDGE}; }

  /* slide + phone mocks */
  .mock-slide { background: ${PARCH}; border-radius: 8px; padding: 8px; box-shadow: 0 20px 56px rgba(0,0,0,.45); }
  .mock-slide-in { border: 2px double ${GREEN}; padding: 16px; height: 100%; }
  .mock-map { position: relative; height: 178px; border: 1px solid ${BRASS}; border-radius: 3px; overflow: hidden;
    background:
      linear-gradient(115deg, transparent 46%, #E9E2CE 46%, #E9E2CE 49%, transparent 49%),
      linear-gradient(60deg, transparent 60%, #E9E2CE 60%, #E9E2CE 63%, transparent 63%),
      linear-gradient(160deg, transparent 30%, #E9E2CE 30%, #E9E2CE 33%, transparent 33%),
      #F6F1E2; }
  .pin { position: absolute; background: #2B2B2B; color: #fff; font-size: 9.5px; font-weight: 700;
    padding: 3px 7px; border-radius: 4px; box-shadow: 0 2px 7px rgba(0,0,0,.3); }
  .pin-s { background: ${RED}; }
  .phone { width: 216px; border-radius: 30px; border: 8px solid #0B1710; background: ${GREEN};
    box-shadow: 0 26px 64px rgba(0,0,0,.5); overflow: hidden; }

  .lp-strip { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: rgba(255,255,255,.09);
    border: 1px solid rgba(255,255,255,.09); border-radius: 13px; overflow: hidden; }
  .lp-strip > div { background: ${DARK}; padding: 22px 20px; }
  .lp-strip .t { font-family: 'Fraunces', Georgia, serif; font-size: 30px; font-weight: 700; }
  .lp-trust { display: flex; flex-wrap: wrap; gap: 10px 18px; align-items: center; justify-content: center; }
  .lp-trust span { color: ${SAGE}; font-size: 12.5px; letter-spacing: .06em; }
  .lp-quote { background: rgba(255,255,255,.035); border: 1px solid #2E5540; border-radius: 13px; padding: 24px; }
  .lp-sticky { display: none; }
  @media (max-width: 860px) {
    .lp-strip { grid-template-columns: 1fr; }
    .lp-sticky { display: flex; position: fixed; left: 0; right: 0; bottom: 0; z-index: 60;
      background: rgba(12,27,18,.94); backdrop-filter: blur(8px); border-top: 1px solid rgba(255,255,255,.1);
      padding: 10px 14px calc(10px + env(safe-area-inset-bottom, 0px)); gap: 10px; align-items: center; }
    .lp-sticky a { flex: 1; text-align: center; }
    .lp { padding-bottom: 74px; }
    .lp-split { grid-template-columns: 1fr !important; gap: 34px !important; }
    .lp-sec { padding: 54px 0; }
    .deed-inner { padding: 18px 16px; }
    .lp-hide-sm { display: none !important; }
  }
`;

function DeedMock() {
  return (
    <div className="deed">
      <div className="deed-inner">
        <div style={{ textAlign: "center", borderBottom: `1px solid ${EDGE}`, paddingBottom: 14 }}>
          <div style={{ fontSize: 8, letterSpacing: ".3em", textTransform: "uppercase", color: RED, fontWeight: 700 }}>
            Prepared exclusively for the property owner
          </div>
          <div className="lp-serif" style={{ fontSize: 22, fontWeight: 700, color: GREEN, marginTop: 8 }}>
            Comparative Market Analysis
          </div>
          <div className="lp-serif" style={{ fontSize: 13, color: INK, marginTop: 5 }}>
            4482 Niagara Ave · Ocean Beach, San Diego
          </div>
        </div>
        <div style={{ textAlign: "center", padding: "18px 0 12px" }}>
          <div className="lp-serif" style={{ fontSize: 31, fontWeight: 700, color: RED }}>$1,445,000</div>
          <div style={{ fontSize: 8.5, letterSpacing: ".22em", textTransform: "uppercase", color: MUTE, marginTop: 5 }}>
            Recommended list price
          </div>
        </div>
        <div style={{ fontSize: 8.5, letterSpacing: ".2em", textTransform: "uppercase", color: GREEN, fontWeight: 700 }}>
          Comparable sales ledger
        </div>
        {[["4622 Del Monte Ave", "$1,385,000"], ["4915 Coronado Ave", "$1,450,000"], ["1877 Froude St", "$1,525,000"]].map((r) => (
          <div className="deed-row" key={r[0]}>
            <span className="lp-serif" style={{ fontWeight: 600 }}>{r[0]}</span>
            <span style={{ fontWeight: 600 }}>{r[1]}</span>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 18, paddingTop: 12, borderTop: `1px solid ${EDGE}` }}>
          <div>
            <div className="lp-serif" style={{ fontSize: 12, fontWeight: 600, color: GREEN }}>Your name here</div>
            <div style={{ fontSize: 9, color: MUTE }}>Your Brokerage · DRE #00000000</div>
          </div>
          <div style={{ width: 44, height: 44, borderRadius: "50%", border: `1.5px solid ${RED}`, display: "flex", alignItems: "center", justifyContent: "center", transform: "rotate(-8deg)" }}>
            <div style={{ fontSize: 6, letterSpacing: ".1em", textTransform: "uppercase", color: RED, fontWeight: 700, textAlign: "center", lineHeight: 1.4 }}>
              Prepared<br />today
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MapSlideMock() {
  return (
    <div className="mock-slide">
      <div className="mock-slide-in">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 8.5, letterSpacing: ".24em", textTransform: "uppercase", color: GREEN, fontWeight: 700 }}>
            Comparable locations
          </span>
          <span style={{ flex: 1, height: 1, background: BRASS, opacity: .55 }} />
        </div>
        <div style={{ display: "flex", gap: 5, margin: "10px 0" }}>
          {["S", "1", "2", "3"].map((n, i) => (
            <div key={n} style={{ flex: 1, borderRadius: 3, border: `1px solid ${i === 1 ? BRASS : "rgba(168,133,60,.3)"}`, background: CARD, padding: 5 }}>
              <div style={{ height: 26, borderRadius: 2, background: i === 0 ? RED : "#D8CCAC", position: "relative" }}>
                <span style={{ position: "absolute", top: 2, left: 3, fontSize: 7.5, fontWeight: 700, color: i === 0 ? "#fff" : INK }}>{n}</span>
              </div>
              <div style={{ fontSize: 6.5, color: MUTE, marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {["4482 Niagara", "4622 Del Monte", "4915 Coronado", "1877 Froude"][i]}
              </div>
            </div>
          ))}
        </div>
        <div className="mock-map">
          <span className="pin pin-s" style={{ left: "58%", top: "44%" }}>SUBJECT</span>
          <span className="pin" style={{ left: "22%", top: "30%" }}>$1.39M</span>
          <span className="pin" style={{ left: "34%", top: "66%" }}>$1.45M</span>
          <span className="pin" style={{ left: "72%", top: "22%" }}>$1.52M</span>
        </div>
        <div style={{ fontSize: 7.5, color: MUTE, fontStyle: "italic", marginTop: 7 }}>
          Tap a pin for photos, remarks and the full listing detail
        </div>
      </div>
    </div>
  );
}

function PhoneMock() {
  return (
    <div className="phone">
      <div style={{ background: "#0F2418", padding: "9px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span className="lp-serif" style={{ fontSize: 11, fontWeight: 700, color: PARCH }}>DeedSheet</span>
        <span style={{ fontSize: 8, color: SAGE }}>4482 Niagara Ave</span>
      </div>
      <div style={{ padding: 9 }}>
        <div style={{ background: PARCH, borderRadius: 4, padding: 6 }}>
          <div style={{ border: `1.5px double ${GREEN}`, padding: "16px 10px", textAlign: "center" }}>
            <div style={{ fontSize: 5.5, letterSpacing: ".22em", textTransform: "uppercase", color: RED, fontWeight: 700 }}>
              Prepared exclusively for you
            </div>
            <div className="lp-serif" style={{ fontSize: 13, fontWeight: 700, color: GREEN, marginTop: 6, lineHeight: 1.2 }}>
              Comparative<br />Market Analysis
            </div>
            <div className="lp-serif" style={{ fontSize: 8, color: INK, marginTop: 5 }}>4482 Niagara Ave</div>
            <div style={{ width: 26, height: 1.5, background: BRASS, margin: "10px auto" }} />
            <div className="lp-serif" style={{ fontSize: 17, fontWeight: 700, color: RED }}>$1,445,000</div>
            <div style={{ fontSize: 5.5, letterSpacing: ".18em", textTransform: "uppercase", color: MUTE, marginTop: 3 }}>
              Recommended list
            </div>
          </div>
        </div>
        <div style={{ textAlign: "center", fontSize: 7.5, color: SAGE, padding: "8px 0 4px" }}>2 / 11 · swipe</div>
      </div>
    </div>
  );
}

export default function Landing() {
  return (
    <div className="lp">
      <style dangerouslySetInnerHTML={{ __html: css }} />

      {/* Nav */}
      <header className="lp-nav">
        <div className="lp-wrap" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 22px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 26 }}>
            <span className="lp-serif" style={{ fontSize: 21, fontWeight: 700 }}>DeedSheet</span>
            <span className="lp-hide-sm" style={{ display: "flex", gap: 20 }}>
              {[["How it works", "#how"], ["Features", "#features"], ["Pricing", "#pricing"], ["FAQ", "#faq"]].map((l) => (
                <a key={l[1]} href={l[1]} style={{ color: SAGE, textDecoration: "none", fontSize: 13.5 }}>{l[0]}</a>
              ))}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <a className="lp-btn lp-btn-ghost" href="/app" style={{ padding: "9px 18px", fontSize: 13.5 }}>Log in</a>
            <a className="lp-btn lp-btn-primary" href="#pricing" style={{ padding: "9px 18px", fontSize: 13.5 }}>Get started</a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="lp-wrap" style={{ padding: "70px 22px 46px" }}>
        <div className="lp-split" style={{ gridTemplateColumns: "1.05fr .95fr" }}>
          <div>
            <div className="lp-tag">Built in San Diego for working agents</div>
            <h1 className="lp-serif" style={{ fontSize: "clamp(34px, 5.1vw, 55px)", fontWeight: 700, lineHeight: 1.06, margin: "18px 0 0", letterSpacing: "-.015em" }}>
              Win the listing before you leave the kitchen table.
            </h1>
            <p className="lp-lead">
              Paste your comps, set your adjustments, and DeedSheet builds a branded CMA, an
              interactive presentation and MLS-ready listing copy. About three minutes, start to finish.
            </p>
            <div style={{ display: "flex", gap: 12, marginTop: 28, flexWrap: "wrap" }}>
              <a className="lp-btn lp-btn-primary" href="#pricing">Start your subscription</a>
              {DEMO_URL
                ? <a className="lp-btn lp-btn-ghost" href={DEMO_URL} target="_blank" rel="noreferrer">See a live presentation</a>
                : <a className="lp-btn lp-btn-ghost" href="#how">See how it works</a>}
            </div>
            <div style={{ color: MUTE, fontSize: 12.5, marginTop: 18, lineHeight: 1.7 }}>
              Works with any MLS · No data agreements · Cancel anytime
            </div>
          </div>
          {site.heroImage
            ? <img src={site.heroImage} alt="A DeedSheet comparative market analysis" style={{ width: "100%", borderRadius: 10, boxShadow: "0 26px 74px rgba(0,0,0,.52)", border: "1px solid rgba(168,133,60,.35)" }} />
            : <DeedMock />}
        </div>

        {(site.stats.agents || site.stats.reports) && (
          <div style={{ display: "flex", gap: 28, flexWrap: "wrap", marginTop: 40, color: SAGE, fontSize: 13.5 }}>
            {site.stats.agents && (
              <span><strong className="lp-serif" style={{ color: BRASS, fontSize: 20 }}>{site.stats.agents}</strong> San Diego agents using DeedSheet</span>
            )}
            {site.stats.reports && (
              <span><strong className="lp-serif" style={{ color: BRASS, fontSize: 20 }}>{site.stats.reports}+</strong> CMAs built</span>
            )}
          </div>
        )}
      </section>

      {/* Trust row */}
      <section className="lp-wrap" style={{ padding: "0 22px 8px" }}>
        <div className="lp-trust" style={{ borderTop: "1px solid rgba(255,255,255,.07)", borderBottom: "1px solid rgba(255,255,255,.07)", padding: "16px 0" }}>
          <span style={{ color: MUTE, fontSize: 11.5, letterSpacing: ".2em", textTransform: "uppercase" }}>Works with</span>
          {site.mlsNames.map((m) => <span key={m}>{m}</span>)}
        </div>
      </section>

      {/* Time comparison */}
      <section className="lp-sec" style={{ paddingBottom: 20 }}>
        <div className="lp-wrap">
          <Reveal>
            <div className="lp-eyebrow">The honest math</div>
            <h2 className="lp-h2" style={{ marginBottom: 26 }}>How long a CMA takes you today</h2>
            <div className="lp-strip">
              {[
                ["45 min", "Word template", "Retyping comps, fighting margins, exporting a PDF that looks like a fax."],
                ["20 min", "Brokerage tool", "It works — it just looks like 2014, and your seller can tell."],
                ["3 min", "DeedSheet", "Paste, adjust, present. Branded report, live presentation and a link they keep."],
              ].map((r, i) => (
                <div key={r[1]}>
                  <div className="t" style={{ color: i === 2 ? BRASS : PARCH }}>{r[0]}</div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 6, color: i === 2 ? BRASS : PARCH }}>{r[1]}</div>
                  <div style={{ color: SAGE, fontSize: 13, lineHeight: 1.7, marginTop: 7 }}>{r[2]}</div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* What the seller gets */}
      <section id="features" className="lp-sec lp-sec-alt">
        <div className="lp-wrap">
          <div className="lp-eyebrow">Three things you hand a seller</div>
          <h2 className="lp-h2">One report. Three ways to deliver it.</h2>
          <p className="lp-lead">
            Enter the property once. DeedSheet produces the leave-behind, the presentation you walk
            them through, and a private link they'll still be looking at that night.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 26, marginTop: 40, alignItems: "start" }}>
            <div>
              <div style={{ marginBottom: 16 }}><DeedMock /></div>
              <h3 className="lp-serif" style={{ fontSize: 19, fontWeight: 700, margin: "0 0 7px" }}>The printed CMA</h3>
              <p style={{ color: SAGE, fontSize: 13.5, lineHeight: 1.72, margin: 0 }}>
                A one-page deed-style report with your branding. The comp map prints on its own sheet
                so the report stays one page.
              </p>
            </div>
            <div>
              <div style={{ marginBottom: 16 }}>
                {site.mapImage
                  ? <img src={site.mapImage} alt="The interactive comp map" style={{ width: "100%", borderRadius: 8, border: `1px solid ${BRASS}`, boxShadow: "0 20px 56px rgba(0,0,0,.45)" }} />
                  : <MapSlideMock />}
              </div>
              <h3 className="lp-serif" style={{ fontSize: 19, fontWeight: 700, margin: "0 0 7px" }}>The live presentation</h3>
              <p style={{ color: SAGE, fontSize: 13.5, lineHeight: 1.72, margin: 0 }}>
                Comps plotted with price pins, satellite view, photo galleries and agent remarks —
                on your laptop or your phone, in full screen.
              </p>
            </div>
            <div>
              <div style={{ marginBottom: 16, display: "flex", justifyContent: "center" }}>
                {site.phoneImage
                  ? <img src={site.phoneImage} alt="A shared presentation on a phone" style={{ width: 216, borderRadius: 22, boxShadow: "0 26px 64px rgba(0,0,0,.5)" }} />
                  : <PhoneMock />}
              </div>
              <h3 className="lp-serif" style={{ fontSize: 19, fontWeight: 700, margin: "0 0 7px" }}>The link they keep</h3>
              <p style={{ color: SAGE, fontSize: 13.5, lineHeight: 1.72, margin: 0 }}>
                Text a private link with your branding. No login for them — and you see the moment
                they open it.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="lp-sec">
        <div className="lp-wrap">
          <div className="lp-eyebrow">How it works</div>
          <h2 className="lp-h2">Three minutes, start to finish</h2>
          <div className="lp-grid3" style={{ marginTop: 30 }}>
            {[
              ["1", "Paste your comps", "Copy sold comps out of whatever MLS you already use. Addresses, beds, baths, square footage, sold dates, prices and remarks fill themselves in."],
              ["2", "Add your adjustments", "You decide what the remodeled kitchen or the smaller lot is worth. DeedSheet does the math and sets the range."],
              ["3", "Present or send", "Print it, present it, or text the link. Your name, brokerage, logo and headshot are on all three."],
            ].map((s) => (
              <div className="lp-card" key={s[0]}>
                <div className="lp-num">{s[0]}</div>
                <h3>{s[1]}</h3>
                <p>{s[2]}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Everything included */}
      <section className="lp-sec lp-sec-alt">
        <div className="lp-wrap">
          <div className="lp-eyebrow">What's inside</div>
          <h2 className="lp-h2">Everything a listing appointment needs</h2>
          <div className="lp-grid3" style={{ marginTop: 30 }}>
            {[
              ["Paste from any MLS", "No integrations, no data agreements, no waiting for approval. If you can copy it, DeedSheet can read it."],
              ["Interactive comp map", "Price pins, satellite view, and a tap-through panel with photos, remarks, days on market and price per square foot."],
              ["AI listing copy", "MLS description, Instagram caption and email blast generated from the same report, in the tone you choose."],
              ["Seller net sheet", "Commission, escrow, transfer tax and payoff subtracted live — so you answer the walk-away question on the spot."],
              ["Three visual styles", "Deed Classic, Luxury black-and-gold, or Sleek modern. Same data, different room."],
              ["Open tracking", "See which sellers opened your presentation, how many times, and when — so you know exactly when to follow up."],
            ].map((f) => (
              <div className="lp-card" key={f[0]}>
                <div className="lp-num">✦</div>
                <h3>{f[0]}</h3>
                <p>{f[1]}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Objection: already have a tool */}
      <section className="lp-sec">
        <div className="lp-wrap">
          <Reveal>
            <div className="lp-split">
              <div>
                <div className="lp-eyebrow">If you already have a CMA tool</div>
                <h2 className="lp-h2">Then you already know the problem.</h2>
                <p className="lp-lead">
                  Most agents have access to something through their brokerage. Most of them still
                  build the important CMAs in Word, because the brokerage tool is slow, dated, or
                  produces something they'd rather not hand to a seller.
                </p>
                <p className="lp-lead" style={{ marginTop: 14 }}>
                  DeedSheet isn't trying to be your CRM or your transaction system. It does one job —
                  the thing you hand the seller — and it does it in three minutes.
                </p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  ["Not another login you forget", "Paste comps, present, share. That's the whole product."],
                  ["Nothing to wait for", "No MLS approval, no vendor agreement, no onboarding call."],
                  ["Yours, not your brokerage's", "Your branding, your account, and it moves with you."],
                ].map((r) => (
                  <div key={r[0]} className="lp-card" style={{ padding: 18 }}>
                    <h3 style={{ margin: "0 0 5px", fontSize: 16 }}>{r[0]}</h3>
                    <p>{r[1]}</p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Testimonials — hidden until there are real ones */}
      {site.testimonials.length > 0 && (
        <section className="lp-sec lp-sec-alt">
          <div className="lp-wrap">
            <Reveal>
              <div className="lp-eyebrow">From agents using it</div>
              <h2 className="lp-h2" style={{ marginBottom: 26 }}>What they said</h2>
              <div className="lp-grid3">
                {site.testimonials.map((t) => (
                  <div className="lp-quote" key={t.name}>
                    <p style={{ color: PARCH, fontSize: 14.5, lineHeight: 1.75, margin: 0 }}>“{t.quote}”</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 11, marginTop: 16 }}>
                      {t.photo && <img src={t.photo} alt="" style={{ width: 38, height: 38, borderRadius: "50%", objectFit: "cover" }} />}
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 600 }}>{t.name}</div>
                        <div style={{ color: SAGE, fontSize: 12 }}>{t.title}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </section>
      )}

      {/* Founder note */}
      {site.founder.name && (
        <section className="lp-sec">
          <div className="lp-wrap">
            <Reveal>
              <div style={{ display: "flex", gap: 22, alignItems: "center", flexWrap: "wrap", background: "rgba(255,255,255,.035)", border: "1px solid #2E5540", borderRadius: 14, padding: "26px 28px" }}>
                {site.founder.photo && (
                  <img src={site.founder.photo} alt={site.founder.name} style={{ width: 84, height: 84, borderRadius: "50%", objectFit: "cover", border: `2px solid ${BRASS}` }} />
                )}
                <div style={{ flex: 1, minWidth: 260 }}>
                  <p className="lp-serif" style={{ fontSize: 16.5, lineHeight: 1.75, color: PARCH, margin: 0 }}>
                    “{site.founder.note}”
                  </p>
                  <div style={{ color: BRASS, fontSize: 13, fontWeight: 600, marginTop: 12 }}>
                    {site.founder.name} · San Diego
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      )}

      {/* Pricing */}
      <section id="pricing" className="lp-sec">
        <div className="lp-wrap">
          <div className="lp-split">
            <div>
              <div className="lp-eyebrow">Pricing</div>
              <h2 className="lp-h2">One plan. Everything included.</h2>
              <p className="lp-lead">
                No per-report fees, no add-ons, no annual contract. If it stops earning its keep,
                cancel in one click and your saved reports stay right where they are.
              </p>
              <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  "Unlimited reports, presentations and share links",
                  "Works in every market — no MLS approval needed",
                  "Your branding on every page and every link",
                ].map((t) => (
                  <div key={t} style={{ display: "flex", gap: 10, alignItems: "flex-start", color: SAGE, fontSize: 14 }}>
                    <span style={{ color: BRASS, fontWeight: 700 }}>✓</span>{t}
                  </div>
                ))}
              </div>
            </div>

            <div className="lp-price">
              <div style={{ fontSize: 11, letterSpacing: ".22em", textTransform: "uppercase", color: RED, fontWeight: 700 }}>DeedSheet</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 10 }}>
                <span className="lp-serif" style={{ fontSize: 46, fontWeight: 700, color: GREEN }}>$49</span>
                <span style={{ color: MUTE, fontSize: 14 }}>per month</span>
              </div>
              <div style={{ fontSize: 12.5, color: MUTE, marginTop: 6 }}>
                Roughly what one printed listing packet costs.
              </div>
              <div style={{ height: 1, background: EDGE, margin: "18px 0" }} />
              {[
                "Unlimited CMA reports and presentations",
                "Interactive comp map with satellite view",
                "Share links with open tracking",
                "AI listing copy and MLS paste-import",
                "Seller net sheet and PowerPoint export",
                "Your logo, headshot and bio on everything",
              ].map((f) => (
                <div className="lp-check" key={f}>
                  <span style={{ color: BRASS, fontWeight: 700 }}>✓</span>
                  <span>{f}</span>
                </div>
              ))}
              <a className="lp-btn" href="/app" style={{ display: "block", textAlign: "center", marginTop: 22, background: GREEN, color: PARCH }}>
                Get started
              </a>
              <div style={{ fontSize: 12, color: MUTE, textAlign: "center", marginTop: 12, lineHeight: 1.6 }}>
                Small team? {CONTACT ? <a href={`mailto:${CONTACT}?subject=DeedSheet%20for%20our%20team`} style={{ color: BRASS }}>Ask about seats</a> : "Ask about seats."}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Free sample */}
      {CONTACT && (
        <section className="lp-wrap" style={{ padding: "0 22px 20px" }}>
          <div style={{ background: "rgba(255,255,255,.035)", border: "1px solid #2E5540", borderRadius: 14, padding: "28px 30px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
            <div>
              <div className="lp-serif" style={{ fontSize: 21, fontWeight: 700 }}>Not ready to sign up?</div>
              <p style={{ color: SAGE, fontSize: 14, lineHeight: 1.7, margin: "7px 0 0", maxWidth: 520 }}>
                Send one listing you're chasing and I'll build the CMA for you, free, so you can see
                what your seller would get.
              </p>
            </div>
            <a className="lp-btn lp-btn-ghost" href={`mailto:${CONTACT}?subject=Free%20sample%20CMA`}>Request a free sample</a>
          </div>
        </section>
      )}

      {/* FAQ */}
      <section id="faq" className="lp-sec">
        <div className="lp-wrap">
          <div className="lp-eyebrow">Questions</div>
          <h2 className="lp-h2" style={{ marginBottom: 22 }}>Before you ask</h2>
          {[
            ["Do I need to connect my MLS?", "No. You paste comps from whatever system you already use and DeedSheet reads them. That means it works in every market on day one, with no data agreements to sign and nothing to wait for."],
            ["Is this an appraisal?", "No. A CMA reflects your professional opinion as a licensed agent, based on the comparables you select and the adjustments you make. Every report states that in writing, and no report is generated without your judgment behind it."],
            ["What does my client actually see?", "A private link with your branding — the same interactive presentation you'd walk them through, on their phone. No login, no app, nothing to download."],
            ["What if I already have a brokerage tool?", "Plenty of agents do, and most of them still build CMAs in Word because the brokerage tool is slow or dated. DeedSheet is built to be the one you actually open."],
            ["Can I cancel?", "Any time, in one click from your billing page. Your saved reports stay stored in case you come back."],
          ].map((q) => (
            <div className="lp-faq" key={q[0]}>
              <h4>{q[0]}</h4>
              <p>{q[1]}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Closing CTA */}
      <section className="lp-wrap" style={{ padding: "10px 22px 70px" }}>
        <div style={{ background: "rgba(168,133,60,.1)", border: `1px solid ${BRASS}`, borderRadius: 16, padding: "40px 32px", textAlign: "center" }}>
          <h2 className="lp-serif" style={{ fontSize: "clamp(23px, 3vw, 33px)", fontWeight: 700, margin: 0 }}>
            Your next listing appointment starts here.
          </h2>
          <p style={{ color: SAGE, fontSize: 15, marginTop: 12, maxWidth: 520, marginLeft: "auto", marginRight: "auto", lineHeight: 1.7 }}>
            Build one CMA and see how it feels to hand a seller something that looks like it took all week.
          </p>
          <a className="lp-btn lp-btn-primary" href="/app" style={{ marginTop: 22 }}>Get started</a>
        </div>
      </section>

      {/* Footer */}
      <footer className="lp-foot" style={{ borderTop: "1px solid rgba(255,255,255,.07)", padding: "26px 0 44px" }}>
        <div className="lp-wrap" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <div>
            <div className="lp-serif" style={{ fontSize: 16, fontWeight: 700 }}>DeedSheet</div>
            <div style={{ color: MUTE, fontSize: 12, marginTop: 3 }}>CMA reports and listing presentations</div>
          </div>
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
            <a href="/app">Log in</a>
            <a href="#pricing">Pricing</a>
            <a href="/terms">Terms</a>
            <a href="/privacy">Privacy</a>
            {CONTACT && <a href={`mailto:${CONTACT}`}>Contact</a>}
          </div>
          <div style={{ color: MUTE, fontSize: 12 }}>© 2026 DeedSheet</div>
        </div>
      </footer>

      {/* Sticky CTA on phones */}
      <div className="lp-sticky">
        <a className="lp-btn lp-btn-ghost" href="/app" style={{ padding: "11px 0", fontSize: 13.5 }}>Log in</a>
        <a className="lp-btn lp-btn-primary" href="/app" style={{ padding: "11px 0", fontSize: 13.5 }}>Get started</a>
      </div>
    </div>
  );
}
