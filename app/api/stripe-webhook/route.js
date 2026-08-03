// Stripe tells us the moment a subscription starts, renews, fails or cancels.
// This is what makes access removal automatic.
import Stripe from "stripe";

export const runtime = "nodejs";

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function upsertSubscription(row) {
  const res = await fetch(`${SUPA_URL}/rest/v1/subscriptions`, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(row),
  });
  if (!res.ok) console.error("subscription upsert failed:", await res.text());
}

async function updateBySubscriptionId(subId, patch) {
  const res = await fetch(
    `${SUPA_URL}/rest/v1/subscriptions?stripe_subscription_id=eq.${subId}`,
    {
      method: "PATCH",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(patch),
    }
  );
  if (!res.ok) console.error("subscription patch failed:", await res.text());
}

export async function POST(request) {
  const sig = request.headers.get("stripe-signature");
  const raw = await request.text();

  let event;
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    event = stripe.webhooks.constructEvent(raw, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("webhook signature check failed:", err.message);
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object;
        const userId = s.client_reference_id || s.metadata?.supabase_user_id;
        if (userId && s.subscription) {
          const sub = await stripe.subscriptions.retrieve(s.subscription);
          await upsertSubscription({
            user_id: userId,
            email: s.customer_details?.email || s.customer_email || null,
            stripe_customer_id: typeof s.customer === "string" ? s.customer : s.customer?.id,
            stripe_subscription_id: sub.id,
            status: sub.status,
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const userId = sub.metadata?.supabase_user_id;
        const patch = {
          status: event.type === "customer.subscription.deleted" ? "canceled" : sub.status,
          current_period_end: sub.current_period_end
            ? new Date(sub.current_period_end * 1000).toISOString()
            : null,
          updated_at: new Date().toISOString(),
        };
        if (userId) {
          await upsertSubscription({
            user_id: userId,
            stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer?.id,
            stripe_subscription_id: sub.id,
            ...patch,
          });
        } else {
          await updateBySubscriptionId(sub.id, patch);
        }
        break;
      }

      case "invoice.payment_failed": {
        const inv = event.data.object;
        if (inv.subscription) {
          await updateBySubscriptionId(inv.subscription, {
            status: "past_due",
            updated_at: new Date().toISOString(),
          });
        }
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error("webhook handling error:", err);
    return new Response("Handler error", { status: 500 });
  }

  return new Response("ok", { status: 200 });
}
