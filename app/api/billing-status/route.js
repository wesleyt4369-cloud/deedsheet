// Authoritative answer to "should this person see the app or the paywall?"
import { getUser, getSubscription, ownerEmails } from "../../lib/access";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    const user = await getUser(token);
    if (!user) return Response.json({ error: "Not logged in." }, { status: 401 });

    const billingEnabled =
      !!process.env.STRIPE_SECRET_KEY &&
      !!process.env.STRIPE_PRICE_ID &&
      !!process.env.SUPABASE_SERVICE_ROLE_KEY;

    const owner = ownerEmails().includes(user.email);
    const sub = billingEnabled ? await getSubscription(user.id) : null;
    const active = ["active", "trialing"].includes(sub?.status);

    return Response.json({
      billingEnabled,
      owner,
      active: owner || !billingEnabled || active,
      status: sub?.status || null,
      hasBilling: !!sub?.stripe_customer_id,
      periodEnd: sub?.current_period_end || null,
    });
  } catch (err) {
    console.error("billing-status error:", err);
    return Response.json({ error: "Could not check billing." }, { status: 500 });
  }
}
