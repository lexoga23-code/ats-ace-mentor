import { CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import type { SectionScore } from "@/lib/analysis";

const statusConfig = {
  ok: { icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-50", bar: "bg-emerald-500" },
  warn: { icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-50", bar: "bg-amber-500" },
  fail: { icon: XCircle, color: "text-destructive", bg: "bg-destructive/10", bar: "bg-destructive" },
};

const SectionScores = ({ sections }: { sections: SectionScore[] }) => {
  return (
    <div className="bg-card p-8 rounded-3xl shadow-soft">
      <h3 className="text-xl font-bold mb-6 text-foreground">Score par section</h3>
      <div className="grid sm:grid-cols-2 gap-4">
        {sections.map((section) => {
          const config = statusConfig[section.status];
          const Icon = config.icon;
          const pct = (section.score / section.maxScore) * 100;
          return (
            <div key={section.name} className={`p-4 rounded-xl ${config.bg}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${config.color}`} />
                  <span className="text-sm font-bold text-foreground">{section.name}</span>
                </div>
                <span className="text-sm font-bold text-foreground">
                  {section.score}/{section.maxScore}
                </span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden mb-2">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${config.bar}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">{section.feedback}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SectionScores;
