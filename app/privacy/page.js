export const metadata = { title: "Privacy Policy — DeedSheet" };

const S = { DARK: "#132719", PARCH: "#F2ECDC", SAGE: "#8FAE9B", BRASS: "#A8853C" };

export default function Privacy() {
  return (
    <div style={{ background: S.DARK, minHeight: "100vh", color: S.PARCH, fontFamily: "'Libre Franklin', Arial, sans-serif" }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Libre+Franklin:wght@400;600&display=swap');
        .doc { max-width: 760px; margin: 0 auto; padding: 46px 22px 70px; }
        .doc h1 { font-family: 'Fraunces', Georgia, serif; font-size: 34px; font-weight: 700; margin: 0 0 6px; }
        .doc h2 { font-family: 'Fraunces', Georgia, serif; font-size: 19px; font-weight: 600; margin: 30px 0 8px; }
        .doc p, .doc li { color: ${S.SAGE}; font-size: 14.5px; line-height: 1.8; }
        .doc a { color: ${S.BRASS}; }
      ` }} />
      <div className="doc">
        <a href="/" style={{ color: S.SAGE, textDecoration: "none", fontSize: 13 }}>← DeedSheet</a>
        <h1 style={{ marginTop: 14 }}>Privacy Policy</h1>
        <p style={{ fontSize: 13 }}>Last updated: August 2026</p>

        <h2>What we collect</h2>
        <p>Your account email and password (stored hashed, never in plain text), the branding you save to your profile, and the report content you create — property details, comparables, photographs, remarks and adjustments. If you subscribe, Stripe processes your payment details; we never see or store your card number.</p>

        <h2>How we use it</h2>
        <p>Solely to operate DeedSheet for you: saving your reports, generating your presentations, sending the emails you request, and managing your subscription. We do not sell your data, and we do not use your report content for advertising.</p>

        <h2>AI features</h2>
        <p>When you use listing copy generation or MLS paste-import, the text you submit is sent to Anthropic's API to produce the result. It is used to answer that request and is not used to train models.</p>

        <h2>Share links</h2>
        <p>When you create a share link, the presentation content is stored so anyone holding that link can view it. We record a view count and the time it was last opened, so you can see whether your client has looked at it. You can revoke a link at any time, which deletes it immediately.</p>

        <h2>Who else touches your data</h2>
        <p>We rely on a small set of service providers to run DeedSheet: Supabase (accounts and database), Vercel (hosting), Stripe (payments), Anthropic (AI generation) and Geoapify (maps). Each processes data only as needed to provide their part of the service.</p>

        <h2>Your control</h2>
        <p>You can edit or delete any report at any time, revoke share links, and update your profile. To delete your account and everything in it, contact us and we will remove your data.</p>

        <h2>Security</h2>
        <p>Access is protected by authentication, and database rules ensure that agents can only read and write their own reports, drafts and profile. Traffic is encrypted in transit.</p>

        <h2>Contact</h2>
        <p>Privacy questions can be sent to the support address listed on our homepage.</p>
      </div>
    </div>
  );
}
