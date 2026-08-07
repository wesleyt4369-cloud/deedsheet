export const metadata = { title: "Terms of Service — DeedSheet" };

const S = { GREEN: "#1F3D2B", DARK: "#132719", PARCH: "#F2ECDC", SAGE: "#8FAE9B", BRASS: "#A8853C" };

export default function Terms() {
  return (
    <div style={{ background: S.DARK, minHeight: "100vh", color: S.PARCH, fontFamily: "'Libre Franklin', Arial, sans-serif" }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Libre+Franklin:wght@400;600&display=swap');
        .doc { max-width: 760px; margin: 0 auto; padding: 46px 22px 70px; }
        .doc h1 { font-family: 'Fraunces', Georgia, serif; font-size: 34px; font-weight: 700; margin: 0 0 6px; }
        .doc h2 { font-family: 'Fraunces', Georgia, serif; font-size: 19px; font-weight: 600; margin: 30px 0 8px; color: ${S.PARCH}; }
        .doc p, .doc li { color: ${S.SAGE}; font-size: 14.5px; line-height: 1.8; }
        .doc a { color: ${S.BRASS}; }
      ` }} />
      <div className="doc">
        <a href="/" style={{ color: S.SAGE, textDecoration: "none", fontSize: 13 }}>← DeedSheet</a>
        <h1 style={{ marginTop: 14 }}>Terms of Service</h1>
        <p style={{ fontSize: 13 }}>Last updated: August 2026</p>

        <h2>1. What DeedSheet is</h2>
        <p>DeedSheet is software that helps licensed real estate professionals produce comparative market analyses, listing presentations and marketing copy from data they enter themselves. We provide the tool; you provide the professional judgment.</p>

        <h2>2. Not an appraisal, not advice</h2>
        <p>Reports produced with DeedSheet reflect your opinion as the preparing agent, based on the comparable properties you select and the adjustments you make. DeedSheet does not determine property values, does not perform appraisals, and is not a substitute for a licensed appraiser. You are responsible for the accuracy of everything you enter and everything you deliver to your clients.</p>

        <h2>3. Your account</h2>
        <p>You are responsible for keeping your login credentials secure and for all activity under your account. Accounts are for individual agents; do not share a login across a team.</p>

        <h2>4. Your data and content</h2>
        <p>You keep ownership of the property data, photographs, remarks and branding you upload. You grant us permission to store and process that content solely to operate the service for you. Do not upload content you lack the rights to use, and follow your MLS's rules about how its data may be used.</p>

        <h2>5. Subscriptions and billing</h2>
        <p>DeedSheet is billed monthly in advance through Stripe. You may cancel at any time from your billing page; access continues to the end of the paid period, after which report generation is disabled while your saved reports remain stored. Fees already paid are non-refundable except where required by law.</p>

        <h2>6. Acceptable use</h2>
        <p>Do not use DeedSheet to produce misleading valuations, to violate fair housing law, to scrape or redistribute MLS data in breach of your agreements, or to attempt to disrupt the service or access other users' data.</p>

        <h2>7. Availability</h2>
        <p>We work to keep DeedSheet available and accurate, but the service is provided "as is" without warranties. We are not liable for indirect or consequential losses, and our total liability is limited to the amount you paid us in the twelve months before the claim.</p>

        <h2>8. Changes</h2>
        <p>We may update these terms as the product develops. Material changes will be communicated to the email on your account. Continued use after a change means you accept the updated terms.</p>

        <h2>9. Contact</h2>
        <p>Questions about these terms can be sent to the support address listed on our homepage.</p>
      </div>
    </div>
  );
}
