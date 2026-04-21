/**
 * Sélecteur de template CV
 * Phase 4 de la refonte templates CV
 *
 * Affiche une grille de cards pour choisir parmi les 7 templates.
 */

import { Check } from "lucide-react";
import type { TemplateId } from "@/lib/cv/types";
import { TEMPLATE_METADATA, TEMPLATE_ORDER } from "@/lib/cv/themes";

interface TemplateSelectorProps {
  selected: TemplateId;
  onChange: (id: TemplateId) => void;
}

const TemplateSelector = ({ selected, onChange }: TemplateSelectorProps) => {
  return (
    <div>
      <p className="text-sm font-bold text-foreground mb-3">Template</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {TEMPLATE_ORDER.map((id) => {
          const meta = TEMPLATE_METADATA[id];
          const isSelected = selected === id;

          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              className={`relative p-3 rounded-xl border-2 text-left transition-all text-xs ${
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40"
              }`}
            >
              <span className="font-bold text-foreground block">
                {meta.name}
              </span>
              <span className="text-muted-foreground">{meta.desc}</span>

              {isSelected && (
                <div className="absolute top-1.5 left-1.5 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-primary-foreground" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default TemplateSelector;
