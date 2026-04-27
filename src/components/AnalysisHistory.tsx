import { useState } from "react";
import { History, ChevronRight, Trash2, BarChart3 } from "lucide-react";
import type { AnalysisResult } from "@/lib/analysis";
import { DEFAULT_ANALYSIS_MODE, GENERAL_ANALYSIS_TARGET_JOB, type AnalysisMode } from "@/lib/analysisTypes";

export interface HistoryEntry {
  id: string;
  date: string;
  targetJob: string;
  analysisMode?: AnalysisMode;
  score: number;
  matchScore?: number;
  results: AnalysisResult;
  cvText: string;
  jobDescription: string;
  industry: string;
}

const HISTORY_KEY = "scorecv_history";
const MAX_HISTORY = 5;

export const saveToHistory = (entry: Omit<HistoryEntry, "id" | "date">) => {
  const history = getHistory();
  const newEntry: HistoryEntry = {
    ...entry,
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
  };
  history.unshift(newEntry);
  if (history.length > MAX_HISTORY) history.pop();
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
};

export const getHistory = (): HistoryEntry[] => {
  try {
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]") as HistoryEntry[];
    return history.map((entry) => ({
      ...entry,
      analysisMode: entry.analysisMode ?? DEFAULT_ANALYSIS_MODE,
    }));
  } catch {
    return [];
  }
};

export const clearHistory = () => {
  localStorage.removeItem(HISTORY_KEY);
};

interface AnalysisHistoryProps {
  onRestore: (entry: HistoryEntry) => void;
}

const AnalysisHistory = ({ onRestore }: AnalysisHistoryProps) => {
  const [history, setHistory] = useState<HistoryEntry[]>(getHistory);
  const [expanded, setExpanded] = useState(false);

  if (history.length === 0) return null;

  const handleClear = () => {
    clearHistory();
    setHistory([]);
  };

  const getScoreColor = (score: number) => {
    if (score >= 75) return "text-emerald-600";
    if (score >= 50) return "text-amber-600";
    return "text-destructive";
  };

  const getHistoryDisplayTitle = (entry: HistoryEntry) =>
    (entry.analysisMode ?? DEFAULT_ANALYSIS_MODE) === "general"
      ? GENERAL_ANALYSIS_TARGET_JOB
      : entry.targetJob;

  return (
    <div className="bg-card rounded-2xl shadow-soft overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-secondary/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold text-foreground">
            Historique ({history.length})
          </span>
        </div>
        <ChevronRight
          className={`w-4 h-4 text-muted-foreground transition-transform ${expanded ? "rotate-90" : ""}`}
        />
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-2">
          {history.map((entry) => (
            <button
              key={entry.id}
              onClick={() => onRestore(entry)}
              className="w-full p-3 bg-secondary/50 rounded-xl flex items-center gap-3 hover:bg-secondary transition-colors text-left"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground truncate">
                  {getHistoryDisplayTitle(entry)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(entry.date).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <div className={`text-lg font-bold ${getScoreColor(entry.score)}`}>
                {entry.score}
              </div>
            </button>
          ))}
          <button
            onClick={handleClear}
            className="w-full py-2 text-xs text-muted-foreground hover:text-destructive flex items-center justify-center gap-1 transition-colors"
          >
            <Trash2 className="w-3 h-3" /> Effacer l'historique
          </button>
        </div>
      )}
    </div>
  );
};

export default AnalysisHistory;
