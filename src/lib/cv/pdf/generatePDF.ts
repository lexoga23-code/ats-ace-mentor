/**
 * Génération PDF via edge function Supabase + Browserless.io
 * Phase 3 de la refonte templates CV
 *
 * Appelle l'edge function generate-pdf qui utilise Browserless.io
 * pour générer un PDF haute qualité côté serveur.
 * En cas d'échec, utilise le fallback window.print().
 */

import { supabase } from "@/integrations/supabase/client";
import { fallbackPrint } from "./fallbackPrint";

/**
 * Génère et télécharge un PDF à partir du HTML d'un CV
 * @param html - Le HTML complet du CV (généré par buildHTML)
 * @param filename - Le nom du fichier sans extension (ex: "CV_Marie_Dupont")
 */
export const generatePDF = async (html: string, filename: string): Promise<void> => {
  try {
    // Appeler l'edge function Supabase
    const { data, error } = await supabase.functions.invoke("generate-pdf", {
      body: { html, filename },
    });

    // Gérer les erreurs de l'edge function
    if (error) {
      console.warn("PDF generation via Browserless failed:", error);
      throw new Error(error.message || "Edge function error");
    }

    // Vérifier que data est bien un ArrayBuffer ou similaire
    if (!data || !(data instanceof ArrayBuffer || data instanceof Uint8Array)) {
      // Parfois Supabase retourne un objet avec une erreur
      if (data && typeof data === "object" && "error" in data) {
        console.warn("PDF generation error:", data.error);
        throw new Error(data.error);
      }
      throw new Error("Invalid response from PDF service");
    }

    // Créer un Blob à partir des données binaires
    const blob = new Blob([data as BlobPart], { type: "application/pdf" });

    // Créer un lien temporaire pour le téléchargement
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}.pdf`;

    // Déclencher le téléchargement
    document.body.appendChild(link);
    link.click();

    // Nettoyer
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

  } catch (err) {
    // En cas d'erreur, utiliser le fallback window.print()
    console.warn("PDF generation failed, using fallback print:", err);
    fallbackPrint(html, filename);
  }
};

/**
 * Vérifie si le service PDF est disponible
 * Utile pour afficher un message à l'utilisateur
 */
export const checkPDFServiceAvailable = async (): Promise<boolean> => {
  try {
    const testHtml = "<!DOCTYPE html><html><body><p>test</p></body></html>";
    const { error } = await supabase.functions.invoke("generate-pdf", {
      body: { html: testHtml, filename: "test" },
    });
    return !error;
  } catch {
    return false;
  }
};
