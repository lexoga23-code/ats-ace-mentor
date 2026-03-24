import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2025-08-27.basil",
  });

  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET not configured");
    return new Response("Webhook secret not configured", { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response("No signature", { status: 400 });
  }

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  console.log("Webhook event received:", event.type);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const email = session.customer_details?.email || session.customer_email || null;
    const userId = session.metadata?.user_id;
    const productType = session.metadata?.product_type || "report";

    // Record payment
    await supabase.from("payments").upsert({
      session_id: session.id,
      email,
      amount: session.amount_total || 0,
      currency: session.currency || "eur",
      status: "completed",
      completed_at: new Date().toISOString(),
    }, { onConflict: "session_id" });

    if (userId) {
      if (productType === "report") {
        // Mark latest unpaid analysis as paid
        const { data: analyses } = await supabase
          .from("user_analyses")
          .select("id")
          .eq("user_id", userId)
          .eq("is_paid", false)
          .order("created_at", { ascending: false })
          .limit(1);

        if (analyses && analyses.length > 0) {
          await supabase
            .from("user_analyses")
            .update({ is_paid: true })
            .eq("id", analyses[0].id);
        }
      } else if (productType === "pro") {
        // Mark user as pro subscriber
        await supabase.from("user_subscriptions").upsert({
          user_id: userId,
          is_pro: true,
          stripe_customer_id: session.customer as string || null,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
      } else if (productType === "review") {
        // Mark review requested
        await supabase.from("user_subscriptions").upsert({
          user_id: userId,
          review_requested: true,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
      }
    }

    console.log(`Payment recorded: ${productType} for user ${userId}, session ${session.id}`);
  }

  // Handle subscription cancellation
  if (event.type === "customer.subscription.deleted" || event.type === "customer.subscription.updated") {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId = subscription.customer as string;

    if (subscription.status === "canceled" || subscription.status === "unpaid" || event.type === "customer.subscription.deleted") {
      // Find user by stripe customer ID in user_subscriptions
      const { data: subRows } = await supabase
        .from("user_subscriptions")
        .select("user_id")
        .eq("stripe_customer_id", customerId)
        .limit(1);

      if (subRows && subRows.length > 0) {
        await supabase.from("user_subscriptions").update({
          is_pro: false,
          stripe_subscription_id: null,
          subscription_end: null,
          updated_at: new Date().toISOString(),
        }).eq("user_id", subRows[0].user_id);

        console.log(`Pro subscription canceled for user ${subRows[0].user_id}`);
      }
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
