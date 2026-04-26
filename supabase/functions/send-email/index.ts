import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = "bonjour@scorecv.eu";
const APP_URL = "https://ats-ace-mentor.lovable.app";

// Email types
type EmailType = "welcome" | "report_paid" | "pro_subscription" | "reminder" | "review_notification";

interface EmailPayload {
  type: EmailType;
  user_id?: string;
  email?: string;
  first_name?: string;
  analysis_id?: string;
  subscription_end?: string;
  // For review notification
  user_name?: string;
  plan?: string;
  date?: string;
}

// Format date in French
function formatDateFrench(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// Format datetime in French
function formatDateTimeFrench(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Generate greeting with optional first name
function getGreeting(firstName?: string | null): string {
  if (firstName && firstName.trim()) {
    return `Bonjour ${firstName},`;
  }
  return "Bonjour,";
}

// Base HTML template
function getEmailTemplate(content: string): string {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-collapse: collapse;">
          <tr>
            <td style="padding: 40px;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px; text-align: center; border-top: 1px solid #eeeeee;">
              <p style="margin: 0; font-size: 12px; color: #888888;">
                ScoreCV &middot; Vous recevez cet email car vous avez cr&eacute;&eacute; un compte sur scorecv.eu
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

// Black button component
function getButton(text: string, url: string): string {
  return `
<table role="presentation" style="margin: 30px 0;">
  <tr>
    <td style="background-color: #000000; border-radius: 6px;">
      <a href="${url}" target="_blank" style="display: inline-block; padding: 16px 32px; color: #ffffff; text-decoration: none; font-weight: bold;">
        ${text}
      </a>
    </td>
  </tr>
</table>
`;
}

// Email 1: Welcome
function getWelcomeEmail(firstName?: string | null): { subject: string; html: string } {
  const content = `
    <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #333333;">
      ${getGreeting(firstName)}
    </p>
    <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #333333;">
      Votre compte ScoreCV est cr&eacute;&eacute;. Vous pouvez d&egrave;s maintenant analyser votre CV gratuitement et obtenir votre score ATS en moins de 30 secondes.
    </p>
    ${getButton("Analyser mon CV &rarr;", `${APP_URL}/#optimiser`)}
    <p style="margin: 30px 0 0 0; font-size: 16px; color: #333333;">
      Ga&euml;l &middot; ScoreCV
    </p>
  `;

  return {
    subject: "Bienvenue sur ScoreCV",
    html: getEmailTemplate(content),
  };
}

// Email 2: Report paid
function getReportPaidEmail(firstName?: string | null, analysisId?: string): { subject: string; html: string } {
  const reportUrl = analysisId ? `${APP_URL}/rapport/${analysisId}` : `${APP_URL}/#compte`;

  const content = `
    <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #333333;">
      ${getGreeting(firstName)}
    </p>
    <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #333333;">
      Votre paiement est confirm&eacute;. Votre rapport complet, votre CV r&eacute;&eacute;crit et votre lettre de motivation sont disponibles.
    </p>
    ${getButton("Acc&eacute;der &agrave; mon rapport &rarr;", reportUrl)}
    <p style="margin: 0 0 30px 0; font-size: 14px; line-height: 1.6; color: #666666;">
      Conservez cet email &mdash; votre rapport est accessible &agrave; tout moment depuis votre historique.
    </p>
    <p style="margin: 30px 0 0 0; font-size: 16px; color: #333333;">
      Ga&euml;l &middot; ScoreCV
    </p>
  `;

  return {
    subject: "Votre rapport complet est disponible",
    html: getEmailTemplate(content),
  };
}

// Email 3: Pro subscription
function getProSubscriptionEmail(firstName?: string | null, subscriptionEnd?: string): { subject: string; html: string } {
  const renewalDate = subscriptionEnd ? formatDateFrench(subscriptionEnd) : "";
  const renewalText = renewalDate
    ? `<p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #333333;">Votre abonnement sera renouvel&eacute; automatiquement le ${renewalDate}.</p>`
    : "";

  const content = `
    <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #333333;">
      ${getGreeting(firstName)}
    </p>
    <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #333333;">
      Bienvenue dans ScoreCV Pro. Vous avez d&eacute;sormais acc&egrave;s en illimit&eacute; aux rapports complets, CV r&eacute;&eacute;crits et lettres de motivation.
    </p>
    ${renewalText}
    ${getButton("Acc&eacute;der &agrave; mon espace Pro &rarr;", `${APP_URL}/#compte`)}
    <p style="margin: 30px 0 0 0; font-size: 16px; color: #333333;">
      Ga&euml;l &middot; ScoreCV
    </p>
  `;

  return {
    subject: "Votre abonnement Pro est actif",
    html: getEmailTemplate(content),
  };
}

// Email 4: Reminder J-3
function getReminderEmail(firstName?: string | null, subscriptionEnd?: string): { subject: string; html: string } {
  const endDate = subscriptionEnd ? formatDateFrench(subscriptionEnd) : "bientôt";

  const content = `
    <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #333333;">
      ${getGreeting(firstName)}
    </p>
    <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #333333;">
      Votre abonnement ScoreCV Pro expire le ${endDate}.
    </p>
    <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #333333;">
      Renouvelez-le pour continuer &agrave; b&eacute;n&eacute;ficier de l'acc&egrave;s illimit&eacute; aux rapports complets, CV r&eacute;&eacute;crits et lettres de motivation.
    </p>
    ${getButton("G&eacute;rer mon abonnement &rarr;", `${APP_URL}/#compte`)}
    <p style="margin: 30px 0 0 0; font-size: 16px; color: #333333;">
      Ga&euml;l &middot; ScoreCV
    </p>
  `;

  return {
    subject: "Votre abonnement Pro expire dans 3 jours",
    html: getEmailTemplate(content),
  };
}

// Email 5: Review notification (to admin)
function getReviewNotificationEmail(
  userName?: string | null,
  userEmail?: string,
  plan?: string,
  date?: string,
  analysisId?: string
): { subject: string; html: string } {
  const content = `
    <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #333333;">
      Nouvelle commande de relecture re&ccedil;ue.
    </p>
    <table style="margin: 20px 0; font-size: 16px; color: #333333;">
      <tr>
        <td style="padding: 8px 20px 8px 0; font-weight: bold;">Candidat :</td>
        <td style="padding: 8px 0;">${userName || "Non renseign&eacute;"}</td>
      </tr>
      <tr>
        <td style="padding: 8px 20px 8px 0; font-weight: bold;">Email :</td>
        <td style="padding: 8px 0;">${userEmail || "Non renseign&eacute;"}</td>
      </tr>
      <tr>
        <td style="padding: 8px 20px 8px 0; font-weight: bold;">Plan :</td>
        <td style="padding: 8px 0;">${plan || "Non renseign&eacute;"}</td>
      </tr>
      <tr>
        <td style="padding: 8px 20px 8px 0; font-weight: bold;">Date :</td>
        <td style="padding: 8px 0;">${date ? formatDateTimeFrench(date) : "Non renseign&eacute;e"}</td>
      </tr>
      <tr>
        <td style="padding: 8px 20px 8px 0; font-weight: bold;">Analysis ID :</td>
        <td style="padding: 8px 0;">${analysisId || "Non renseign&eacute;"}</td>
      </tr>
    </table>
    ${getButton("Voir dans Supabase &rarr;", "https://supabase.com/dashboard/project/qzjpsgmxjuuqnpkwwayh")}
  `;

  return {
    subject: "🔔 Nouvelle relecture à traiter",
    html: getEmailTemplate(content),
  };
}

// Send email via Resend
async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY not configured");
    return false;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to],
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Resend API error:", error);
      return false;
    }

    const result = await response.json();
    console.log("Email sent successfully:", result.id);
    return true;
  } catch (error) {
    console.error("Failed to send email:", error);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: EmailPayload = await req.json();
    const { type, user_id, email, first_name, analysis_id, subscription_end, user_name, plan, date } = payload;

    if (!type) {
      return new Response(JSON.stringify({ error: "Email type is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get user email and first_name from profiles if not provided
    let userEmail = email;
    let userName = first_name;

    if (user_id && (!userEmail || !userName)) {
      // Get email from auth.users
      const { data: userData } = await supabase.auth.admin.getUserById(user_id);
      if (userData?.user) {
        userEmail = userEmail || userData.user.email;
      }

      // Get first_name from profiles
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name")
        .eq("id", user_id)
        .single();

      if (profile) {
        userName = userName || profile.first_name;
      }
    }

    if (!userEmail && type !== "review_notification") {
      return new Response(JSON.stringify({ error: "Email address is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let emailData: { subject: string; html: string };
    let recipientEmail = userEmail!;

    switch (type) {
      case "welcome":
        emailData = getWelcomeEmail(userName);
        break;

      case "report_paid":
        emailData = getReportPaidEmail(userName, analysis_id);
        break;

      case "pro_subscription":
        emailData = getProSubscriptionEmail(userName, subscription_end);
        break;

      case "reminder":
        emailData = getReminderEmail(userName, subscription_end);
        break;

      case "review_notification":
        emailData = getReviewNotificationEmail(user_name, email, plan, date, analysis_id);
        recipientEmail = "gael.laclautre@gmail.com";
        break;

      default:
        return new Response(JSON.stringify({ error: `Unknown email type: ${type}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    const success = await sendEmail(recipientEmail, emailData.subject, emailData.html);

    if (success) {
      return new Response(JSON.stringify({ success: true, to: recipientEmail }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      return new Response(JSON.stringify({ error: "Failed to send email" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
