// Server component wrapper: gives every share link a proper preview card
// when it's texted, emailed, or posted.

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function generateMetadata({ params }) {
  const fallback = {
    title: "Comparative Market Analysis · DeedSheet",
    description: "A private property presentation prepared by your agent.",
  };

  try {
    const res = await fetch(
      `${SUPA_URL}/rest/v1/shares?id=eq.${params.id}&select=data`,
      {
        headers: { apikey: SUPA_ANON, Authorization: `Bearer ${SUPA_ANON}` },
        cache: "no-store",
      }
    );
    if (!res.ok) return fallback;
    const rows = await res.json();
    const d = rows?.[0]?.data;
    if (!d) return fallback;

    const address = d.subject?.address || "Your property";
    const city = d.subject?.city ? ` · ${d.subject.city}` : "";
    const agentName = d.agent?.name && d.agent.name !== "Your Name" ? d.agent.name : null;
    const brokerage = d.agent?.brokerage && d.agent.brokerage !== "Your Brokerage" ? d.agent.brokerage : null;

    const specs = [
      d.subject?.beds ? `${d.subject.beds} bed` : null,
      d.subject?.baths ? `${d.subject.baths} bath` : null,
      d.subject?.sqft ? `${Number(d.subject.sqft).toLocaleString()} sqft` : null,
    ].filter(Boolean).join(" · ");

    const title = `${address}${city}`;
    const by = agentName ? ` Prepared by ${agentName}${brokerage ? `, ${brokerage}` : ""}.` : "";
    const description = `Comparative Market Analysis${specs ? ` — ${specs}.` : "."}${by}`;

    return {
      title: `${title} · DeedSheet`,
      description,
      openGraph: {
        title,
        description,
        siteName: "DeedSheet",
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
      },
    };
  } catch {
    return fallback;
  }
}

export default function ShareLayout({ children }) {
  return children;
}
