// Creates a Stripe Checkout session for the logged-in agent.
import Stripe from "stripe";
import { getUser } from "../../lib/access";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_PRICE_ID) {
      return Response.json({ error: "Billing isn't configured yet." }, { status: 500 });
    }
    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    const user = await getUser(token);
    if (!user) return Response.json({ error: "Please log in first." }, { status: 401 });

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const site = (process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin).replace(/\/$/, "");
    const trialDays = Number(process.env.STRIPE_TRIAL_DAYS || 0);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      customer_email: user.email,
      client_reference_id: user.id,
      allow_promotion_codes: true,
      subscription_data: {
        metadata: { supabase_user_id: user.id },
        ...(trialDays > 0 ? { trial_period_days: trialDays } : {}),
      },
      metadata: { supabase_user_id: user.id },
      success_url: `${site}/app?billing=success`,
      cancel_url: `${site}/app?billing=cancelled`,
    });

    return Response.json({ url: session.url });
  } catch (err) {
    console.error("checkout error:", err);
    return Response.json({ error: "Could not start checkout. Try again." }, { status: 500 });
  }
}
