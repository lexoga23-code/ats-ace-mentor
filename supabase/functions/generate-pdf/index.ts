import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { generatePDF, type CVData } from "./pdf-generator.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { cvData, userId, analysisId } = await req.json();

    if (!cvData) {
      return new Response(
        JSON.stringify({ error: "cvData is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate CV data structure
    const data = cvData as CVData;
    if (!data.header || !data.header.name) {
      return new Response(
        JSON.stringify({ error: "Invalid CV data: header.name is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate PDF
    console.log("Generating PDF for:", data.header.name);
    const pdfBytes = generatePDF(data);

    // If userId and analysisId are provided, store in Supabase Storage
    if (userId && analysisId) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

      if (!supabaseUrl || !supabaseServiceKey) {
        console.error("Missing Supabase credentials");
        // Return PDF directly if storage not available
        return new Response(pdfBytes, {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="CV_${data.header.name.replace(/\s+/g, "_")}.pdf"`,
          },
        });
      }

      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // Generate filename
      const filename = `cv-${userId}-${analysisId}.pdf`;
      const filePath = `generated/${filename}`;

      // Upload to Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("cvs")
        .upload(filePath, pdfBytes, {
          contentType: "application/pdf",
          upsert: true,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        // Return PDF directly if upload fails
        return new Response(pdfBytes, {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="CV_${data.header.name.replace(/\s+/g, "_")}.pdf"`,
          },
        });
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("cvs")
        .getPublicUrl(filePath);

      console.log("PDF uploaded to:", urlData.publicUrl);

      return new Response(
        JSON.stringify({
          success: true,
          url: urlData.publicUrl,
          filename: filename,
          size: pdfBytes.byteLength,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Return PDF directly if no storage requested
    return new Response(pdfBytes, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="CV_${data.header.name.replace(/\s+/g, "_")}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to generate PDF" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
