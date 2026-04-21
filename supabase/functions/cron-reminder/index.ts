import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper to send email via send-email function
async function sendEmail(payload: Record<string, unknown>): Promise<void> {
  try {
    const response = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      console.error("Failed to send email:", await response.text());
    } else {
      console.log("Reminder email sent successfully");
    }
  } catch (error) {
    console.error("Error sending email:", error);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Calculate date 3 days from now (start and end of day)
    const now = new Date();
    const threeDaysFromNow = new Date(now);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    threeDaysFromNow.setHours(0, 0, 0, 0);

    const threeDaysFromNowEnd = new Date(threeDaysFromNow);
    threeDaysFromNowEnd.setHours(23, 59, 59, 999);

    console.log(`Looking for subscriptions ending between ${threeDaysFromNow.toISOString()} and ${threeDaysFromNowEnd.toISOString()}`);

    // Find active Pro subscriptions expiring in 3 days that haven't received reminder
    const { data: expiringSubscriptions, error } = await supabase
      .from("user_subscriptions")
      .select("user_id, subscription_end")
      .eq("is_pro", true)
      .gte("subscription_end", threeDaysFromNow.toISOString())
      .lte("subscription_end", threeDaysFromNowEnd.toISOString());

    if (error) {
      console.error("Error fetching subscriptions:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Found ${expiringSubscriptions?.length || 0} subscriptions expiring in 3 days`);

    let sentCount = 0;

    for (const subscription of expiringSubscriptions || []) {
      // Get user email
      const { data: userData } = await supabase.auth.admin.getUserById(subscription.user_id);

      if (!userData?.user?.email) {
        console.log(`No email found for user ${subscription.user_id}`);
        continue;
      }

      // Get first_name from profiles
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name")
        .eq("id", subscription.user_id)
        .single();

      // Send reminder email
      await sendEmail({
        type: "reminder",
        user_id: subscription.user_id,
        email: userData.user.email,
        first_name: profile?.first_name,
        subscription_end: subscription.subscription_end,
      });

      sentCount++;
    }

    return new Response(JSON.stringify({
      success: true,
      checked: expiringSubscriptions?.length || 0,
      sent: sentCount
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
