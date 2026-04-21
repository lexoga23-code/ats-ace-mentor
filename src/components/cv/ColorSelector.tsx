/**
 * Sélecteur de couleur CV
 * Phase 4 de la refonte templates CV
 *
 * Affiche une rangée de 10 pastilles de couleur.
 */

import { Check } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ColorPaletteId } from "@/lib/cv/types";
import { COLORS, COLOR_ORDER } from "@/lib/cv/colors";

interface ColorSelectorProps {
  selected: ColorPaletteId;
  onChange: (id: ColorPaletteId) => void;
}

const ColorSelector = ({ selected, onChange }: ColorSelectorProps) => {
  return (
    <TooltipProvider>
      <div>
        <p className="text-sm font-bold text-foreground mb-3">Couleur</p>
        <div className="flex flex-wrap gap-3">
          {COLOR_ORDER.map((id) => {
            const palette = COLORS[id];
            const isSelected = selected === id;

            return (
              <Tooltip key={id}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onChange(id)}
                    className={`w-9 h-9 rounded-full border-2 transition-all flex items-center justify-center ${
                      isSelected
                        ? "border-foreground scale-110"
                        : "border-transparent hover:scale-105"
                    }`}
                    style={{ background: palette.primary }}
                    aria-label={palette.name}
                  >
                    {isSelected && (
                      <Check className="w-4 h-4 text-white" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>{palette.name}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
};

export default ColorSelector;
