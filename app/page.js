export const metadata = {
  title: "DeedSheet — CMA reports and listing presentations in minutes",
  description:
    "Turn your comps into a branded comparative market analysis, an interactive listing presentation and MLS-ready copy — in about three minutes. Built for solo and small-team agents.",
  openGraph: {
    title: "DeedSheet — CMA reports in minutes",
    description:
      "Branded CMAs, interactive presentations and share links your sellers can open on their phone.",
    siteName: "DeedSheet",
    type: "website",
  },
};

const GREEN = "#1F3D2B", DARK = "#132719", DARKER = "#0C1B12", PARCH = "#F2ECDC",
  BRASS = "#A8853C", RED = "#8E3B2F", INK = "#26221A",
  MUTE = "#6B6252", SAGE = "#8FAE9B", EDGE = "#C9BC9C";

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Libre+Franklin:wght@400;500;600;700&display=swap');
  .lp { font-family: 'Libre Franklin', Arial, sans-serif; background: ${DARK}; color: ${PARCH}; min-height: 100vh; }
  .lp-serif { font-family: 'Fraunces', Georgia, serif; }
  .lp-wrap { max-width: 1080px; margin: 0 auto; padding: 0 22px; }
  .lp-btn { display: inline-block; padding: 13px 26px; border-radius: 6px; font-size: 14.5px; font-weight: 700;
    text-decoration: none; transition: all .15s ease; white-space: nowrap; cursor: pointer; }
  .lp-btn-primary { background: ${BRASS}; color: ${DARKER}; }
  .lp-btn-primary:hover { background: #bd9948; }
  .lp-btn-ghost { border: 1px solid #2E5540; color: ${PARCH}; }
  .lp-btn-ghost:hover { border-color: ${BRASS}; background: rgba(168,133,60,.1); }
  .lp-eyebrow { font-size: 11px; letter-spacing: .3em; text-transform: uppercase; color: ${BRASS}; font-weight: 700; }
  .lp-h2 { font-family: 'Fraunces', Georgia, serif; font-size: clamp(25px, 3.4vw, 38px); font-weight: 700; margin: 10px 0 0; }
  .lp-grid3 { display: grid; grid-template-columns: repeat(auto-fit, minmax(258px, 1fr)); gap: 16px; }
  .lp-card { background: rgba(255,255,255,.035); border: 1px solid #2E5540; border-radius: 12px; padding: 24px; }
  .lp-card h3 { font-family: 'Fraunces', Georgia, serif; font-size: 19px; font-weight: 700; margin: 14px 0 8px; }
  .lp-card p { color: ${SAGE}; font-size: 13.5px; line-height: 1.7; margin: 0; }
  .lp-num { width: 30px; height: 30px; border-radius: 50%; background: ${BRASS}; color: ${DARKER};
    display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; }
  .lp-price { background: ${PARCH}; color: ${INK}; border-radius: 14px; padding: 30px 28px; }
  .lp-check { display: flex; gap: 10px; align-items: flex-start; padding: 7px 0; font-size: 14px; color: ${INK}; }
  .lp-faq { border-top: 1px solid rgba(255,255,255,.09); padding: 20px 0; }
  .lp-faq h4 { font-family: 'Fraunces', Georgia, serif; font-size: 17px; font-weight: 600; margin: 0 0 8px; }
  .lp-faq p { color: ${SAGE}; font-size: 13.5px; line-height: 1.75; margin: 0; }
  .lp-foot a { color: ${SAGE}; text-decoration: none; font-size: 13px; }
  .lp-foot a:hover { color: ${PARCH}; }
  .deed { background: ${PARCH}; color: ${INK}; border-radius: 6px; padding: 10px; box-shadow: 0 24px 70px rgba(0,0,0,.5); }
  .deed-inner { border: 2.5px double ${GREEN}; padding: 26px 24px; }
  .deed-row { display: flex; justify-content: space-between; font-size: 11px; padding: 6px 0; border-top: 1px solid ${EDGE}; }
  @media (max-width: 780px) {
    .lp-hero { grid-template-columns: 1fr !important; gap: 34px !important; }
    .deed-inner { padding: 18px 16px; }
  }
`;

export default function Landing() {
  return (
    <div className="lp">
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <header style={{ borderBottom: "1px solid rgba(255,255,255,.07)" }}>
        <div className="lp-wrap" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 22px" }}>
          <div className="lp-serif" style={{ fontSize: 21, fontWeight: 700 }}>DeedSheet</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <a className="lp-btn lp-btn-ghost" href="/app" style={{ padding: "9px 18px", fontSize: 13.5 }}>Log in</a>
            <a className="lp-btn lp-btn-primary" href="#pricing" style={{ padding: "9px 18px", fontSize: 13.5 }}>Get started</a>
          </div>
        </div>
      </header>

      <section className="lp-wrap" style={{ padding: "62px 22px 40px" }}>
        <div className="lp-hero" style={{ display: "grid", gridTemplateColumns: "1.05fr .95fr", gap: 46, alignItems: "center" }}>
          <div>
            <div className="lp-eyebrow">For real estate agents</div>
            <h1 className="lp-serif" style={{ fontSize: "clamp(33px, 5vw, 53px)", fontWeight: 700, lineHeight: 1.08, margin: "14px 0 0", letterSpacing: "-0.01em" }}>
              A listing presentation your seller actually remembers.
            </h1>
            <p style={{ color: SAGE, fontSize: 16.5, lineHeight: 1.75, marginTop: 18, maxWidth: 520 }}>
              Paste your comps, add your adjustments, and DeedSheet builds a branded CMA, an
              interactive presentation and MLS-ready listing copy — in about three minutes.
            </p>
            <div style={{ display: "flex", gap: 12, marginTop: 26, flexWrap: "wrap" }}>
              <a className="lp-btn lp-btn-primary" href="#pricing">Start your subscription</a>
              <a className="lp-btn lp-btn-ghost" href="#how">See how it works</a>
            </div>
            <div style={{ color: MUTE, fontSize: 12.5, marginTop: 16 }}>
              Works with any MLS · No contracts · Cancel anytime
            </div>
          </div>

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
                <div className="lp-serif" style={{ fontSize: 30, fontWeight: 700, color: RED }}>$1,445,000</div>
                <div style={{ fontSize: 8.5, letterSpacing: ".22em", textTransform: "uppercase", color: MUTE, marginTop: 5 }}>
                  Recommended list price
                </div>
              </div>
              <div style={{ fontSize: 8.5, letterSpacing: ".2em", textTransform: "uppercase", color: GREEN, fontWeight: 700, marginTop: 6 }}>
                Comparable sales ledger
              </div>
              {[["4622 Del Monte Ave", "$1,385,000"], ["4915 Coronado Ave", "$1,450,000"], ["1877 Froude St", "$1,525,000"]].map((row) => (
                <div className="deed-row" key={row[0]}>
                  <span className="lp-serif" style={{ fontWeight: 600 }}>{row[0]}</span>
                  <span style={{ fontWeight: 600 }}>{row[1]}</span>
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
        </div>
      </section>

      <section className="lp-wrap" style={{ padding: "44px 22px" }}>
        <div className="lp-eyebrow">What you get</div>
        <h2 className="lp-h2">Everything a listing appointment needs</h2>
        <div className="lp-grid3" style={{ marginTop: 26 }}>
          {[
            ["Branded CMA report", "A one-page comparative market analysis with your name, brokerage and logo — print it or send it as a PDF. The comp map prints on its own sheet."],
            ["Interactive presentation", "Present on your laptop or phone. Comps plot on a live map with price pins, satellite view, photo galleries and agent remarks."],
            ["Share links clients open", "Text a private link. Your seller sees the whole presentation on their phone — and you see when they opened it."],
            ["MLS-ready listing copy", "Generate the MLS description, an Instagram caption and an email blast from the same report, in the tone you pick."],
            ["Paste from any MLS", "No integrations, no contracts. Paste your comp results and DeedSheet reads the addresses, prices, dates and remarks for you."],
            ["Seller net sheet", "Show what they actually walk away with after commission, escrow, transfer tax and payoff — the question every seller asks."],
          ].map((f) => (
            <div className="lp-card" key={f[0]}>
              <div className="lp-num">✦</div>
              <h3>{f[0]}</h3>
              <p>{f[1]}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="how" className="lp-wrap" style={{ padding: "44px 22px" }}>
        <div className="lp-eyebrow">How it works</div>
        <h2 className="lp-h2">Three minutes, start to finish</h2>
        <div className="lp-grid3" style={{ marginTop: 26 }}>
          {[
            ["1", "Paste your comps", "Copy your sold comps out of the MLS and paste. Addresses, beds, baths, square footage, sold dates and prices fill themselves in."],
            ["2", "Add your adjustments", "You decide what the remodeled kitchen or the smaller lot is worth. DeedSheet does the math and sets the range."],
            ["3", "Present or send", "Print the report, present it live, or text a share link. Your branding is on all three."],
          ].map((s) => (
            <div className="lp-card" key={s[0]}>
              <div className="lp-num">{s[0]}</div>
              <h3>{s[1]}</h3>
              <p>{s[2]}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" className="lp-wrap" style={{ padding: "44px 22px 20px" }}>
        <div className="lp-eyebrow">Pricing</div>
        <h2 className="lp-h2">One plan. Everything included.</h2>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, 420px)", justifyContent: "center", marginTop: 28 }}>
          <div className="lp-price">
            <div style={{ fontSize: 11, letterSpacing: ".22em", textTransform: "uppercase", color: RED, fontWeight: 700 }}>DeedSheet</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 10 }}>
              <span className="lp-serif" style={{ fontSize: 44, fontWeight: 700, color: GREEN }}>$49</span>
              <span style={{ color: MUTE, fontSize: 14 }}>per month</span>
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
            <a className="lp-btn" href="/app" style={{ display: "block", textAlign: "center", marginTop: 20, background: GREEN, color: PARCH }}>
              Get started
            </a>
            <div style={{ fontSize: 12, color: MUTE, textAlign: "center", marginTop: 12, lineHeight: 1.6 }}>
              Cancel any time from your billing page. Your saved reports stay put.
            </div>
          </div>
        </div>
      </section>

      <section className="lp-wrap" style={{ padding: "40px 22px" }}>
        <div className="lp-eyebrow">Questions</div>
        <h2 className="lp-h2" style={{ marginBottom: 20 }}>Before you ask</h2>
        {[
          ["Do I need to connect my MLS?", "No. You paste your comps from whatever system you already use, and DeedSheet reads them. That means it works in every market from day one, with no data agreements to sign."],
          ["Is this an appraisal?", "No. A CMA reflects your professional opinion as a licensed agent, based on the comparables you select and the adjustments you make. Every report says so in writing."],
          ["What do my clients see?", "A private link with your branding — the same interactive presentation you would walk them through, viewable on their phone. No login, no app to download."],
          ["Can I cancel?", "Yes, from your billing page in one click. Your reports remain saved in case you come back."],
        ].map((q) => (
          <div className="lp-faq" key={q[0]}>
            <h4>{q[0]}</h4>
            <p>{q[1]}</p>
          </div>
        ))}
      </section>

      <section className="lp-wrap" style={{ padding: "30px 22px 60px" }}>
        <div style={{ background: "rgba(168,133,60,.1)", border: `1px solid ${BRASS}`, borderRadius: 14, padding: "34px 30px", textAlign: "center" }}>
          <h2 className="lp-serif" style={{ fontSize: "clamp(22px, 3vw, 31px)", fontWeight: 700, margin: 0 }}>
            Your next listing appointment starts here.
          </h2>
          <p style={{ color: SAGE, fontSize: 14.5, marginTop: 10 }}>
            Build one CMA and see how it feels to hand a seller something that looks like this.
          </p>
          <a className="lp-btn lp-btn-primary" href="/app" style={{ marginTop: 20 }}>Get started</a>
        </div>
      </section>

      <footer className="lp-foot" style={{ borderTop: "1px solid rgba(255,255,255,.07)", padding: "22px 0 40px" }}>
        <div className="lp-wrap" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <div className="lp-serif" style={{ fontSize: 15, fontWeight: 700 }}>DeedSheet</div>
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
            <a href="/app">Log in</a>
            <a href="/terms">Terms</a>
            <a href="/privacy">Privacy</a>
          </div>
          <div style={{ color: MUTE, fontSize: 12 }}>© 2026 DeedSheet</div>
        </div>
      </footer>
    </div>
  );
}
