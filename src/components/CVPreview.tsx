import { useState, useEffect, useRef, useCallback } from "react";
import { Pencil, Check, RotateCcw, RefreshCw } from "lucide-react";
import { exportCVToDocx } from "@/lib/docxExport";
import { parseCV } from "@/lib/cv/parser";
import { buildHTML } from "@/lib/cv/templateHTML";
import { generatePDF } from "@/lib/cv/pdf/generatePDF";
import type { TemplateId, ColorPaletteId, CVData } from "@/lib/cv/types";
import CVTemplate from "@/components/cv/CVTemplate";
import TemplateSelector from "@/components/cv/TemplateSelector";
import ColorSelector from "@/components/cv/ColorSelector";
import {
  saveEditedCvData,
  loadEditedCvData,
  resetEditedCvData,
} from "@/lib/cv/saveEditedCV";

interface CVPreviewProps {
  cvText: string;
  onChange: (text: string) => void;
  analysisId?: string | null;
}

const CVPreview = ({ cvText, analysisId }: CVPreviewProps) => {
  const [templateId, setTemplateId] = useState<TemplateId>("careerops");
  const [colorId, setColorId] = useState<ColorPaletteId>("sarcelle");

  // États pour l'édition inline
  const [editedCvData, setEditedCvData] = useState<CVData | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [isEditing, setIsEditing] = useState(false);

  // Ref pour le timer de debounce
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Ref pour tracker si on a des changements en attente
  const pendingDataRef = useRef<CVData | null>(null);

  // Fonction utilitaire pour annuler le timer en attente
  const cancelPendingTimer = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
  }, []);

  // Parser le CV original
  const parsedCvData = parseCV(cvText);

  // Données à utiliser : éditées en priorité, sinon parsées
  const cvData = editedCvData ?? parsedCvData;

  // Générer le nom de fichier
  const filename = cvData.name
    ? `CV_${cvData.name.replace(/[^a-zA-Z0-9À-ÿ]/g, "_")}`
    : "CV_ScoreCV";

  // Charger les données éditées au montage
  useEffect(() => {
    if (!analysisId) return;

    const loadData = async () => {
      const data = await loadEditedCvData(analysisId);
      if (data) {
        setEditedCvData(data);
      }
    };

    loadData();
  }, [analysisId]);

  // Fonction de sauvegarde immédiate
  const saveNow = useCallback(
    async (dataToSave: CVData) => {
      if (!analysisId) return;

      setSaveStatus("saving");
      const success = await saveEditedCvData(analysisId, dataToSave);
      if (success) {
        setSaveStatus("saved");
        pendingDataRef.current = null;
        // Masquer "Sauvegardé" après 3 secondes
        setTimeout(() => {
          setSaveStatus((current) => (current === "saved" ? "idle" : current));
        }, 3000);
      } else {
        // Erreur de sauvegarde - garder les données en attente pour retry
        setSaveStatus("error");
        // Ne pas effacer pendingDataRef pour permettre le retry
      }
    },
    [analysisId]
  );

  // Handler d'édition avec debounce
  const handleCvDataChange = useCallback(
    (newCvData: CVData) => {
      setEditedCvData(newCvData);
      pendingDataRef.current = newCvData;
      setSaveStatus("saving");

      // Annuler le timer précédent
      cancelPendingTimer();

      // Déclencher la sauvegarde après 2 secondes
      saveTimerRef.current = setTimeout(() => {
        saveNow(newCvData);
      }, 2000);
    },
    [saveNow, cancelPendingTimer]
  );

  // Toggle édition
  const handleToggleEditing = useCallback(() => {
    if (isEditing) {
      // On quitte le mode édition : forcer une sauvegarde immédiate si changements en attente
      cancelPendingTimer();
      if (pendingDataRef.current && analysisId) {
        saveNow(pendingDataRef.current);
      }
    }
    setIsEditing(!isEditing);
  }, [isEditing, analysisId, saveNow, cancelPendingTimer]);

  // Réinitialiser à l'original
  const handleReset = useCallback(async () => {
    if (!analysisId) return;

    const confirmed = window.confirm(
      "Voulez-vous vraiment réinitialiser le CV à sa version originale ? Toutes vos modifications seront perdues."
    );

    if (!confirmed) return;

    // Annuler tout timer en cours
    cancelPendingTimer();

    const success = await resetEditedCvData(analysisId);
    if (success) {
      setEditedCvData(null);
      setSaveStatus("idle");
      pendingDataRef.current = null;
    }
  }, [analysisId, cancelPendingTimer]);

  // Handler pour réessayer la sauvegarde après une erreur
  const handleRetry = useCallback(() => {
    const dataToRetry = pendingDataRef.current ?? editedCvData;
    if (dataToRetry) {
      saveNow(dataToRetry);
    }
  }, [editedCvData, saveNow]);

  // Handler pour export PDF (utilise les données éditées)
  const handleExportPDF = () => {
    const html = buildHTML(cvData, templateId, colorId, false);
    generatePDF(html, filename);
  };

  // Handler pour export DOCX (utilise les données éditées)
  const handleExportDocx = () => {
    exportCVToDocx(cvData);
  };

  // Sauvegarde avant fermeture de page (beforeunload + visibilitychange)
  useEffect(() => {
    if (!analysisId) return;

    // Avertir l'utilisateur s'il y a des changements non sauvegardés
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pendingDataRef.current) {
        e.preventDefault();
        // Message standard (le navigateur affiche son propre message)
        return "";
      }
    };

    // Sauvegarder quand l'utilisateur quitte l'onglet
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden" && pendingDataRef.current) {
        // Annuler le debounce et sauvegarder immédiatement
        cancelPendingTimer();
        // Utiliser sendBeacon pour une sauvegarde fiable en arrière-plan
        // Note: On fait un appel classique car sendBeacon ne supporte pas les headers auth
        saveNow(pendingDataRef.current);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [analysisId, saveNow, cancelPendingTimer]);

  // Cleanup du timer au démontage
  useEffect(() => {
    return () => {
      cancelPendingTimer();
      // Sauvegarder les changements en attente au démontage du composant
      if (pendingDataRef.current && analysisId) {
        // Note: Cette sauvegarde peut ne pas aboutir si la page est déchargée
        saveEditedCvData(analysisId, pendingDataRef.current);
      }
    };
  }, [analysisId, cancelPendingTimer]);

  return (
    <div className="space-y-6">
      <TemplateSelector
        selected={templateId}
        onChange={setTemplateId}
      />

      <ColorSelector
        selected={colorId}
        onChange={setColorId}
      />

      {/* Barre d'édition */}
      {analysisId && (
        <div className="flex items-center justify-between gap-4 p-3 bg-secondary/50 rounded-xl">
          <div className="flex items-center gap-3">
            {/* Toggle édition */}
            <button
              onClick={handleToggleEditing}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                isEditing
                  ? "bg-primary text-primary-foreground"
                  : "bg-background border border-border hover:bg-secondary"
              }`}
            >
              {isEditing ? (
                <>
                  <Check className="w-4 h-4" /> Terminé
                </>
              ) : (
                <>
                  <Pencil className="w-4 h-4" /> Modifier
                </>
              )}
            </button>

            {/* Indicateur de sauvegarde */}
            {saveStatus === "saving" && (
              <span className="text-sm text-muted-foreground">Sauvegarde...</span>
            )}
            {saveStatus === "saved" && (
              <span className="text-sm text-emerald-600">Sauvegardé ✓</span>
            )}
            {saveStatus === "error" && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-destructive">Échec de la sauvegarde</span>
                <button
                  onClick={handleRetry}
                  className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-destructive hover:bg-destructive/10 rounded transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  Réessayer
                </button>
              </div>
            )}

            {/* Badge "Modifié" */}
            {editedCvData !== null && (
              <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
                Modifié
              </span>
            )}
          </div>

          {/* Bouton Réinitialiser */}
          {editedCvData !== null && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground hover:text-destructive transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Réinitialiser
            </button>
          )}
        </div>
      )}

      <CVTemplate
        cvData={cvData}
        templateId={templateId}
        colorId={colorId}
        onExportPDF={handleExportPDF}
        onExportDocx={handleExportDocx}
        isEditable={isEditing}
        onCvDataChange={handleCvDataChange}
      />
    </div>
  );
};

export default CVPreview;
