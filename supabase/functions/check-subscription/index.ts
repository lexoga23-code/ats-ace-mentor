import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(userError.message);
    const user = userData.user;
    if (!user?.email) throw new Error("Not authenticated");

    // First, read existing subscription status from DB (source of truth set by webhooks)
    const { data: existingData } = await supabaseClient
      .from("user_subscriptions")
      .select("is_pro, subscription_end, review_requested, stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    let isPro = existingData?.is_pro ?? false;
    let subscriptionEnd: string | null = existingData?.subscription_end ?? null;
    const reviewRequested = existingData?.review_requested ?? false;
    let cancelAtPeriodEnd = false;

    // Otherwise, verify with Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check Stripe for active subscription
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length > 0) {
      const customerId = customers.data[0].id;
      // Also check subscriptions that are active but set to cancel at period end
      const allSubs = await stripe.subscriptions.list({
        customer: customerId,
        limit: 5,
      });

      const activeSub = allSubs.data.find(s => s.status === "active");

      if (activeSub) {
        isPro = true;
        const periodEnd = activeSub.current_period_end;
        console.log("Active sub found:", JSON.stringify({ id: activeSub.id, current_period_end: periodEnd, cancel_at_period_end: activeSub.cancel_at_period_end }));
        if (periodEnd) {
          subscriptionEnd = new Date(periodEnd * 1000).toISOString();
        }
        cancelAtPeriodEnd = activeSub.cancel_at_period_end === true;

        // Upsert user_subscriptions table
        await supabaseClient.from("user_subscriptions").upsert({
          user_id: user.id,
          is_pro: true,
          stripe_customer_id: customerId,
          stripe_subscription_id: activeSub.id,
          subscription_end: subscriptionEnd,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
      } else {
        // No active subscription in Stripe — mark as not pro
        isPro = false;
        subscriptionEnd = null;
        await supabaseClient.from("user_subscriptions").upsert({
          user_id: user.id,
          is_pro: false,
          stripe_customer_id: customerId,
          stripe_subscription_id: null,
          subscription_end: null,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
      }
    }
    // If no Stripe customer found, keep the existing DB status (could be set by webhook)

    return new Response(JSON.stringify({
      isPro,
      subscriptionEnd,
      reviewRequested,
      cancelAtPeriodEnd,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Check subscription error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
