-- Migration: Ajouter la colonne edited_cv_data pour l'édition inline du CV
-- Cette colonne stocke les données CVData éditées par l'utilisateur

ALTER TABLE user_analyses ADD COLUMN IF NOT EXISTS edited_cv_data JSONB;

-- Commentaire pour documentation
COMMENT ON COLUMN user_analyses.edited_cv_data IS 'Données CV éditées par l''utilisateur (format CVData JSON). NULL si pas d''édition.';
