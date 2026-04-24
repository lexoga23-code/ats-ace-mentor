/**
 * Fonctions de sauvegarde/chargement des données CV éditées
 * Stockage dans user_analyses.edited_cv_data (JSONB)
 */

import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { CVData } from "./types";

/**
 * Sauvegarde les données CV éditées en base
 * @param analysisId - ID de l'analyse user_analyses
 * @param cvData - Données CV éditées
 * @returns true si succès, false sinon
 */
export const saveEditedCvData = async (
  analysisId: string,
  cvData: CVData
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from("user_analyses")
      .update({ edited_cv_data: cvData as unknown as Record<string, unknown> })
      .eq("id", analysisId);

    if (error) {
      console.error("[saveEditedCvData] Error:", error);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[saveEditedCvData] Exception:", err);
    return false;
  }
};

/**
 * Charge les données CV éditées depuis la base
 * @param analysisId - ID de l'analyse user_analyses
 * @returns CVData si existe, null sinon
 */
export const loadEditedCvData = async (
  analysisId: string
): Promise<CVData | null> => {
  try {
    const { data, error } = await supabase
      .from("user_analyses")
      .select("edited_cv_data")
      .eq("id", analysisId)
      .single();

    if (error) {
      console.error("[loadEditedCvData] Error:", error);
      return null;
    }

    if (!data?.edited_cv_data) {
      return null;
    }

    // Valider que c'est bien un objet CVData (vérification minimale)
    const cvData = data.edited_cv_data as unknown as CVData;
    if (typeof cvData === "object" && cvData !== null && "name" in cvData) {
      return cvData;
    }

    return null;
  } catch (err) {
    console.error("[loadEditedCvData] Exception:", err);
    return null;
  }
};

/**
 * Réinitialise les données CV éditées (supprime edited_cv_data)
 * @param analysisId - ID de l'analyse user_analyses
 * @returns true si succès, false sinon
 */
export const resetEditedCvData = async (
  analysisId: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from("user_analyses")
      .update({ edited_cv_data: null })
      .eq("id", analysisId);

    if (error) {
      console.error("[resetEditedCvData] Error:", error);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[resetEditedCvData] Exception:", err);
    return false;
  }
};
