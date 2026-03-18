import emailjs from "@emailjs/browser";

// EmailJS public keys — safe to store client-side
const PUBLIC_KEY = import.meta.env.VITE_EJS_PUBLIC_KEY || "";
const SERVICE_ID = import.meta.env.VITE_EJS_SERVICE_ID || "";

// Template IDs — user must create these on emailjs.com
const TEMPLATES = {
  welcome: import.meta.env.VITE_EJS_TEMPLATE_WELCOME || "",
  paymentConfirm: import.meta.env.VITE_EJS_TEMPLATE_PAYMENT || "",
  reviewRequest: import.meta.env.VITE_EJS_TEMPLATE_REVIEW || "",
  proPlan: import.meta.env.VITE_EJS_TEMPLATE_PRO || "",
};

let initialized = false;

const ensureInit = () => {
  if (!initialized && PUBLIC_KEY) {
    emailjs.init(PUBLIC_KEY);
    initialized = true;
  }
};

const isConfigured = () => Boolean(PUBLIC_KEY && SERVICE_ID);

const sendEmail = async (templateId: string, params: Record<string, string>) => {
  if (!isConfigured() || !templateId) {
    console.warn("[EmailJS] Not configured — skipping email send");
    return;
  }
  ensureInit();
  try {
    await emailjs.send(SERVICE_ID, templateId, params);
    console.log("[EmailJS] Email sent:", templateId);
  } catch (err) {
    console.error("[EmailJS] Failed to send:", err);
  }
};

/** Email 1 — Welcome after signup */
export const sendWelcomeEmail = (toName: string, toEmail: string) =>
  sendEmail(TEMPLATES.welcome, {
    to_name: toName,
    to_email: toEmail,
    message: `Bonjour ${toName}, votre compte ScoreCV est créé. Uploadez votre CV pour obtenir votre score ATS gratuit en 30 secondes.\n\nL'équipe ScoreCV — contact.scorecv@gmail.com`,
  });

/** Email 2 — Payment confirmation (4€) */
export const sendPaymentConfirmEmail = (toName: string, toEmail: string) =>
  sendEmail(TEMPLATES.paymentConfirm, {
    to_name: toName,
    to_email: toEmail,
    message: `Bonjour ${toName}, votre paiement de 4€ a bien été reçu. Votre rapport complet est accessible sur votre compte ScoreCV.\n\nCV réécrit · Checklist complète · Lettre de motivation · Export PDF & Word.\n\nUne question ? Répondez à cet email.\n\nL'équipe ScoreCV`,
  });

/** Email 3 — Review request confirmation (29€) */
export const sendReviewRequestEmail = (toName: string, toEmail: string) =>
  sendEmail(TEMPLATES.reviewRequest, {
    to_name: toName,
    to_email: toEmail,
    message: `Bonjour ${toName}, nous avons bien reçu votre demande de relecture de votre CV et lettre de motivation.\n\nVous recevrez votre rapport PDF personnalisé sous 24h ouvrées. Un échange email de suivi est inclus.\n\nL'équipe ScoreCV — contact.scorecv@gmail.com`,
  });

/** Email 4 — Pro subscription welcome (12€/month) */
export const sendProWelcomeEmail = (toName: string, toEmail: string) =>
  sendEmail(TEMPLATES.proPlan, {
    to_name: toName,
    to_email: toEmail,
    message: `Bonjour ${toName}, votre abonnement Pro est actif.\n\nAnalyses illimitées · Tous les designs · Export illimité.\n\nPour annuler : portail Stripe accessible depuis votre espace Mon compte.\n\nL'équipe ScoreCV`,
  });

export { isConfigured as isEmailConfigured };
