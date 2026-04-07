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

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(userError.message);
    const user = userData.user;
    if (!user?.id) throw new Error("Not authenticated");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Get subscription ID from database
    const { data: subData } = await supabaseClient
      .from("user_subscriptions")
      .select("stripe_subscription_id, stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!subData?.stripe_subscription_id) {
      // Fallback: find subscription via customer email
      const customers = await stripe.customers.list({ email: user.email!, limit: 1 });
      if (customers.data.length === 0) {
        throw new Error("No active subscription found");
      }

      const subscriptions = await stripe.subscriptions.list({
        customer: customers.data[0].id,
        status: "active",
        limit: 1,
      });

      if (subscriptions.data.length === 0) {
        throw new Error("No active subscription found");
      }

      // Cancel at period end (user keeps access until end date)
      const canceled = await stripe.subscriptions.update(subscriptions.data[0].id, {
        cancel_at_period_end: true,
      });

      const periodEnd = new Date(canceled.current_period_end * 1000).toISOString();

      // Update database
      await supabaseClient.from("user_subscriptions").update({
        subscription_end: periodEnd,
        updated_at: new Date().toISOString(),
      }).eq("user_id", user.id);

      return new Response(JSON.stringify({
        success: true,
        subscriptionEnd: periodEnd,
        message: "Subscription will be canceled at period end",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cancel subscription at period end
    const canceled = await stripe.subscriptions.update(subData.stripe_subscription_id, {
      cancel_at_period_end: true,
    });

    const periodEnd = new Date(canceled.current_period_end * 1000).toISOString();

    // Update database with cancellation info
    await supabaseClient.from("user_subscriptions").update({
      subscription_end: periodEnd,
      updated_at: new Date().toISOString(),
    }).eq("user_id", user.id);

    return new Response(JSON.stringify({
      success: true,
      subscriptionEnd: periodEnd,
      message: "Subscription will be canceled at period end",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Cancel subscription error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
