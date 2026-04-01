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

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check Stripe for active subscription
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    let isPro = false;
    let subscriptionEnd: string | null = null;

    if (customers.data.length > 0) {
      const customerId = customers.data[0].id;
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: "active",
        limit: 1,
      });

      if (subscriptions.data.length > 0) {
        isPro = true;
        subscriptionEnd = new Date(subscriptions.data[0].current_period_end * 1000).toISOString();

        // Upsert user_subscriptions table
        await supabaseClient.from("user_subscriptions").upsert({
          user_id: user.id,
          is_pro: true,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptions.data[0].id,
          subscription_end: subscriptionEnd,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
      } else {
        // No active subscription — mark as not pro
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

    // Check review requested
    const { data: subData } = await supabaseClient
      .from("user_subscriptions")
      .select("review_requested")
      .eq("user_id", user.id)
      .maybeSingle();

    return new Response(JSON.stringify({
      isPro,
      subscriptionEnd,
      reviewRequested: subData?.review_requested ?? false,
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
