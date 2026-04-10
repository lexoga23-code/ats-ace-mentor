import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Find users who signed up 3 days ago and have 0 analyses
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const startOfDay = new Date(threeDaysAgo);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(threeDaysAgo);
    endOfDay.setHours(23, 59, 59, 999);

    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, email, full_name")
      .gte("created_at", startOfDay.toISOString())
      .lte("created_at", endOfDay.toISOString());

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      return new Response(JSON.stringify({ error: profilesError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Found ${profiles?.length || 0} profiles from 3 days ago`);
    let sentCount = 0;

    for (const profile of profiles || []) {
      // Check if user has any analyses
      const { count } = await supabase
        .from("user_analyses")
        .select("id", { count: "exact", head: true })
        .eq("user_id", profile.user_id);

      if ((count ?? 0) > 0) {
        console.log(`User ${profile.email} already has analyses, skipping`);
        continue;
      }

      if (!profile.email) continue;

      const fullName = profile.full_name || "there";

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: "ScoreCV <bonjour@scorecv.eu>",
          to: [profile.email],
          subject: "Votre CV attend son analyse ! 📄",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #6366f1;">Bonjour ${fullName} ! 👋</h1>
              <p>Vous vous êtes inscrit il y a 3 jours sur <strong>ATS Ace Mentor</strong>, mais vous n'avez pas encore analysé votre CV.</p>
              <p>Saviez-vous que <strong>75% des CV</strong> sont rejetés par les systèmes ATS avant même d'être lus par un recruteur ?</p>
              <p>
                <a href="https://ats-ace-mentor.lovable.app/#optimiser" 
                   style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                  Analyser mon CV gratuitement →
                </a>
              </p>
              <p style="color: #666; font-size: 14px; margin-top: 30px;">
                À bientôt,<br/>L'équipe ATS Ace Mentor
              </p>
            </div>
          `,
        }),
      });

      const result = await res.json();
      console.log(`Reminder sent to ${profile.email}:`, JSON.stringify(result));
      sentCount++;
    }

    return new Response(JSON.stringify({ success: true, sent: sentCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Cron reminder error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
