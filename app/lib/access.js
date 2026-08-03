// Server-only helpers. Verifies the logged-in user and their subscription
// status before any billable work happens.

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ACTIVE_STATUSES = ["active", "trialing"];

export function ownerEmails() {
  return (process.env.OWNER_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

// Returns { id, email } for a valid session token, or null.
export async function getUser(token) {
  if (!token) return null;
  const res = await fetch(`${SUPA_URL}/auth/v1/user`, {
    headers: { apikey: SUPA_ANON, Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const user = await res.json();
  return user?.id ? { id: user.id, email: (user.email || "").toLowerCase() } : null;
}

// Reads the subscription row with the service key (bypasses RLS).
export async function getSubscription(userId) {
  if (!SERVICE_KEY) return null;
  const res = await fetch(
    `${SUPA_URL}/rest/v1/subscriptions?user_id=eq.${userId}&select=status,current_period_end,stripe_customer_id`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
  );
  if (!res.ok) return null;
  const rows = await res.json();
  return rows?.[0] || null;
}

// The gate every billable route calls first.
// Returns { user } on success, or { error, status } to return immediately.
export async function requirePaidUser(request) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const user = await getUser(token);
  if (!user) {
    return { error: "Please log in to continue.", status: 401 };
  }

  // Owner accounts always pass (your own demo logins)
  if (ownerEmails().includes(user.email)) return { user };

  // If billing isn't configured yet, don't lock anyone out
  if (!process.env.STRIPE_SECRET_KEY || !SERVICE_KEY) return { user };

  const sub = await getSubscription(user.id);
  const active =
    sub &&
    ACTIVE_STATUSES.includes(sub.status) &&
    (!sub.current_period_end || new Date(sub.current_period_end).getTime() > Date.now() - 86400000);

  if (!active) {
    return {
      error: "Your DeedSheet subscription isn't active. Reactivate it in Billing to keep generating.",
      status: 402,
    };
  }
  return { user };
}
