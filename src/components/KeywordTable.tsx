import { useState } from "react";
import { Check, X, Lightbulb } from "lucide-react";

interface KeywordTableProps {
  found: string[];
  missing: string[];
  suggested: string[];
}

type Filter = "all" | "found" | "missing" | "suggested";

const KeywordTable = ({ found, missing, suggested }: KeywordTableProps) => {
  const [filter, setFilter] = useState<Filter>("all");

  const allKeywords = [
    ...found.map((k) => ({ keyword: k, status: "found" as const })),
    ...missing.map((k) => ({ keyword: k, status: "missing" as const })),
    ...suggested.map((k) => ({ keyword: k, status: "suggested" as const })),
  ];

  const filtered = filter === "all" ? allKeywords : allKeywords.filter((k) => k.status === filter);

  const filters: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: "Tous", count: allKeywords.length },
    { key: "found", label: "Présents", count: found.length },
    { key: "missing", label: "Manquants", count: missing.length },
    { key: "suggested", label: "Suggérés", count: suggested.length },
  ];

  const statusConfig = {
    found: { icon: Check, label: "Présent", bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
    missing: { icon: X, label: "Manquant", bg: "bg-destructive/10", text: "text-destructive", dot: "bg-destructive" },
    suggested: { icon: Lightbulb, label: "Suggéré", bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  };

  return (
    <div className="bg-card p-8 rounded-3xl shadow-soft">
      <h3 className="text-xl font-bold mb-4 text-foreground">Tableau des mots-clés</h3>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              filter === f.key
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:bg-secondary/80"
            }`}
          >
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-secondary">
              <th className="text-left px-4 py-3 font-bold text-foreground">Mot-clé</th>
              <th className="text-left px-4 py-3 font-bold text-foreground">Statut</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item, i) => {
              const config = statusConfig[item.status];
              const Icon = config.icon;
              return (
                <tr key={`${item.keyword}-${i}`} className="border-t border-border hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3 text-foreground font-medium">{item.keyword}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${config.bg} ${config.text}`}>
                      <Icon className="w-3 h-3" />
                      {config.label}
                    </span>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={2} className="px-4 py-6 text-center text-muted-foreground text-sm">
                  Aucun mot-clé dans cette catégorie
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default KeywordTable;
