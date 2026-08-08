// Opens the Stripe billing portal so agents can update cards or cancel.
import Stripe from "stripe";
import { getUser, getSubscription } from "../../lib/access";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return Response.json({ error: "Billing isn't configured yet." }, { status: 500 });
    }
    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    const user = await getUser(token);
    if (!user) return Response.json({ error: "Please log in first." }, { status: 401 });

    const sub = await getSubscription(user.id);
    if (!sub?.stripe_customer_id) {
      return Response.json({ error: "No billing account found for this login yet." }, { status: 404 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const site = (process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin).replace(/\/$/, "");
    const portal = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${site}/app`,
    });
    return Response.json({ url: portal.url });
  } catch (err) {
    console.error("portal error:", err);
    return Response.json({ error: "Could not open billing. Try again." }, { status: 500 });
  }
}
