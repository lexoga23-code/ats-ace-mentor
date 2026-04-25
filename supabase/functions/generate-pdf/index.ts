/**
 * Edge function Supabase pour génération PDF via Browserless.io
 * Phase 3 de la refonte templates CV
 *
 * Reçoit du HTML, l'envoie à Browserless, retourne le PDF binaire.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // Gestion preflight CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    // Valider la méthode
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parser le body
    const body = await req.json();
    const { html, filename } = body;

    // Validation input
    if (!html || typeof html !== "string" || html.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid 'html' field. Must be a non-empty string." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Récupérer le token Browserless
    const browserlessToken = Deno.env.get("BROWSERLESS_TOKEN");
    if (!browserlessToken) {
      console.error("BROWSERLESS_TOKEN environment variable is not configured");
      return new Response(
        JSON.stringify({ error: "PDF service not configured. Please contact support." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Appeler Browserless.io
    const browserlessResponse = await fetch(
      `https://chrome.browserless.io/pdf?token=${browserlessToken}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          html,
          options: {
            format: "A4",
            margin: {
              top: "0",
              right: "0",
              bottom: "0",
              left: "0",
            },
            printBackground: true,
            preferCSSPageSize: true,
          },
          // Attendre que les polices soient chargées
          waitFor: 500,
        }),
      }
    );

    // Gérer les erreurs Browserless
    if (!browserlessResponse.ok) {
      const errorText = await browserlessResponse.text();
      console.error("Browserless error:", browserlessResponse.status, errorText);

      // Erreurs spécifiques
      if (browserlessResponse.status === 401) {
        return new Response(
          JSON.stringify({ error: "PDF service authentication failed" }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (browserlessResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "PDF service rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "PDF generation failed", details: errorText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Récupérer le PDF binaire
    const pdfBuffer = await browserlessResponse.arrayBuffer();

    // Sanitizer le filename (caractères alphanumériques, tirets, underscores uniquement)
    const safeName = (filename || "CV")
      .replace(/[^a-zA-Z0-9À-ÿ_-]/g, "_")
      .substring(0, 100);

    // Retourner le PDF
    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeName}.pdf"`,
        "Content-Length": pdfBuffer.byteLength.toString(),
      },
    });

  } catch (error) {
    console.error("generate-pdf error:", error);

    // Erreur de parsing JSON
    if (error instanceof SyntaxError) {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: error.message || "Unknown error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
