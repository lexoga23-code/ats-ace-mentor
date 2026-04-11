import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const FROM_EMAIL = "ScoreCV <bonjour@scorecv.eu>";
const ADMIN_EMAIL = "gael.laclautre@gmail.com";

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set, skipping email");
    return;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
    });
    const result = await res.json();
    console.log(`Email sent to ${to}:`, JSON.stringify(result));
  } catch (err) {
    console.error(`Failed to send email to ${to}:`, err.message);
  }
}

function reportEmail(name: string, analysisId?: string) {
  const greeting = name ? `Bonjour ${name},` : "Bonjour,";
  const reportUrl = analysisId
    ? `https://ats-ace-mentor.lovable.app/analyse/${analysisId}`
    : "https://ats-ace-mentor.lovable.app/compte";
  return {
    subject: "Votre rapport ScoreCV est prêt ! 📄",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #6366f1;">Rapport débloqué ! 🎉</h1>
        <p>${greeting}</p>
        <p>Votre paiement de 4€ a bien été reçu. Votre rapport complet est maintenant accessible :</p>
        <ul>
          <li>✍️ CV réécrit et optimisé ATS</li>
          <li>📝 Lettre de motivation personnalisée</li>
          <li>✅ Checklist complète</li>
          <li>📥 Export PDF & Word</li>
        </ul>
        <p>
          <a href="${reportUrl}"
             style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            Voir mon rapport →
          </a>
        </p>
        <p style="color: #666; font-size: 14px; margin-top: 30px;">Une question ? Répondez à cet email.<br/>L'équipe ScoreCV</p>
      </div>
    `,
  };
}

function proEmail(name: string) {
  const greeting = name ? `Bienvenue en Pro, ${name} ! 🚀` : "Bienvenue en Pro ! 🚀";
  return {
    subject: "Abonnement Pro activé ! 🚀",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #6366f1;">${greeting}</h1>
        <p>Votre abonnement Pro est maintenant actif. Vous avez accès à :</p>
        <ul>
          <li>♾️ Analyses illimitées</li>
          <li>🎨 Tous les designs de CV</li>
          <li>📥 Export illimité PDF & Word</li>
        </ul>
        <p>Pour gérer votre abonnement, rendez-vous dans <strong>Mon compte</strong>.</p>
        <p>
          <a href="https://ats-ace-mentor.lovable.app/account"
             style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            Mon compte →
          </a>
        </p>
        <p style="color: #666; font-size: 14px; margin-top: 30px;">L'équipe ScoreCV</p>
      </div>
    `,
  };
}

function reviewNotificationEmail(userName: string, userEmail: string) {
  return {
    subject: `Nouvelle demande de relecture de ${userName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #6366f1;">Nouvelle relecture demandée 📋</h1>
        <p><strong>Utilisateur :</strong> ${userName}</p>
        <p><strong>Email :</strong> ${userEmail}</p>
        <p>Connecte-toi au dashboard pour traiter cette demande sous 24h ouvrées.</p>
      </div>
    `,
  };
}

function reviewConfirmEmail(name: string) {
  const heading = name ? `Demande reçue, ${name} ! ✅` : "Demande reçue ! ✅";
  return {
    subject: "Demande de relecture reçue ! ✅",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #6366f1;">${heading}</h1>
        <p>Nous avons bien reçu votre demande de relecture de votre CV et lettre de motivation.</p>
        <p>Vous recevrez votre rapport PDF personnalisé sous <strong>24h ouvrées</strong>. Un échange email de suivi est inclus.</p>
        <p style="color: #666; font-size: 14px; margin-top: 30px;">L'équipe ScoreCV — bonjour@scorecv.eu</p>
      </div>
    `,
  };
}

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

    // Get user profile for email
    let userName = "";
    let userEmail = email;
    if (userId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("user_id", userId)
        .limit(1)
        .single();
      if (profile) {
        userName = profile.full_name || "";
        userEmail = profile.email || email;
      }
    }

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

        // Send report email to user
        const paidAnalysisId = analyses && analyses.length > 0 ? analyses[0].id : undefined;
        if (userEmail) {
          const { subject, html } = reportEmail(userName, paidAnalysisId);
          await sendEmail(userEmail, subject, html);
        }
      } else if (productType === "pro") {
        // Mark user as pro subscriber
        const subscriptionId = session.subscription as string || null;
        await supabase.from("user_subscriptions").upsert({
          user_id: userId,
          is_pro: true,
          stripe_customer_id: session.customer as string || null,
          stripe_subscription_id: subscriptionId,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

        // Send pro welcome email
        if (userEmail) {
          const { subject, html } = proEmail(userName);
          await sendEmail(userEmail, subject, html);
        }
      } else if (productType === "review") {
        // Mark review requested
        await supabase.from("user_subscriptions").upsert({
          user_id: userId,
          review_requested: true,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

        // Send confirmation to user
        if (userEmail) {
          const { subject, html } = reviewConfirmEmail(userName);
          await sendEmail(userEmail, subject, html);
        }

        // Send notification to admin
        const { subject: adminSubject, html: adminHtml } = reviewNotificationEmail(userName, userEmail || "inconnu");
        await sendEmail(ADMIN_EMAIL, adminSubject, adminHtml);
      }
    }

    console.log(`Payment recorded: ${productType} for user ${userId}, session ${session.id}`);
  }

  // Handle subscription created - mark user as pro
  if (event.type === "customer.subscription.created") {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId = subscription.customer as string;

    if (subscription.status === "active" || subscription.status === "trialing") {
      const subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();

      const { data: subRows } = await supabase
        .from("user_subscriptions")
        .select("user_id")
        .eq("stripe_customer_id", customerId)
        .limit(1);

      if (subRows && subRows.length > 0) {
        await supabase.from("user_subscriptions").update({
          is_pro: true,
          stripe_subscription_id: subscription.id,
          subscription_end: subscriptionEnd,
          updated_at: new Date().toISOString(),
        }).eq("user_id", subRows[0].user_id);

        console.log(`Pro subscription created for user ${subRows[0].user_id}`);
      }
    }
  }

  // Handle subscription updates
  if (event.type === "customer.subscription.updated") {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId = subscription.customer as string;

    const { data: subRows } = await supabase
      .from("user_subscriptions")
      .select("user_id")
      .eq("stripe_customer_id", customerId)
      .limit(1);

    if (subRows && subRows.length > 0) {
      if (subscription.status === "active" || subscription.status === "trialing") {
        const subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
        await supabase.from("user_subscriptions").update({
          is_pro: true,
          stripe_subscription_id: subscription.id,
          subscription_end: subscriptionEnd,
          updated_at: new Date().toISOString(),
        }).eq("user_id", subRows[0].user_id);

        console.log(`Pro subscription activated/renewed for user ${subRows[0].user_id}`);
      } else if (subscription.status === "canceled" || subscription.status === "unpaid" || subscription.status === "past_due") {
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

  // Handle subscription deleted
  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId = subscription.customer as string;

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

      console.log(`Pro subscription deleted for user ${subRows[0].user_id}`);
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
