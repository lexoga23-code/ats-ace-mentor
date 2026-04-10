import { corsHeaders } from "@supabase/supabase-js/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    console.log("Auth webhook received:", JSON.stringify(payload));

    const { record } = payload;
    if (!record?.email) {
      console.log("No email in record, skipping");
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fullName = record.full_name || "there";

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "ATS Ace Mentor <onboarding@resend.dev>",
        to: [record.email],
        subject: "Bienvenue sur ATS Ace Mentor ! 🎯",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #6366f1;">Bienvenue ${fullName} ! 👋</h1>
            <p>Merci de vous être inscrit sur <strong>ATS Ace Mentor</strong>.</p>
            <p>Vous pouvez maintenant :</p>
            <ul>
              <li>📄 Analyser votre CV gratuitement</li>
              <li>🎯 Obtenir un score ATS détaillé</li>
              <li>✍️ Générer un CV optimisé et une lettre de motivation</li>
            </ul>
            <p>
              <a href="https://ats-ace-mentor.lovable.app" 
                 style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                Commencer mon analyse →
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
    console.log("Resend response:", JSON.stringify(result));

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Auth webhook error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
