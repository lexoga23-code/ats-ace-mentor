import { useState, useRef } from "react";
import { Link2, Upload, Loader2 } from "lucide-react";
import { extractText } from "@/lib/fileParser";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface JobOfferInputProps {
  value: string;
  onChange: (text: string) => void;
}

const JobOfferInput = ({ value, onChange }: JobOfferInputProps) => {
  const [url, setUrl] = useState("");
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [loadingFile, setLoadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFetchUrl = async () => {
    if (!url.trim()) return;
    setLoadingUrl(true);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-job-offer", {
        body: { url: url.trim() },
      });
      if (error) throw error;
      if (data?.text) {
        onChange(data.text);
        toast.success("Offre récupérée avec succès !");
        setUrl("");
      } else {
        toast.error("Impossible d'extraire le contenu de cette page.");
      }
    } catch {
      toast.error("Erreur lors de la récupération de l'offre. Collez le texte manuellement.");
    } finally {
      setLoadingUrl(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoadingFile(true);
    try {
      const text = await extractText(file);
      if (text.length < 50) {
        toast.error("Le fichier semble vide ou illisible. Essayez un autre format.");
      } else {
        onChange(text);
        toast.success(`"${file.name}" chargé !`);
      }
    } catch {
      toast.error("Erreur de lecture du fichier.");
    } finally {
      setLoadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-3">
      <label className="label-ui block">Offre d'emploi</label>
      <p className="text-xs text-muted-foreground">
        Collez le texte, importez un PDF ou entrez l'URL de l'offre.
      </p>

      {/* URL input */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.indeed.fr/viewjob?jk=..."
            className="w-full pl-9 pr-4 py-3 bg-card rounded-xl shadow-soft border-none focus:ring-2 focus:ring-primary focus:outline-none text-foreground placeholder:text-muted-foreground text-sm"
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleFetchUrl())}
          />
        </div>
        <button
          onClick={handleFetchUrl}
          disabled={loadingUrl || !url.trim()}
          className="px-4 py-3 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-1.5"
        >
          {loadingUrl ? <Loader2 className="w-4 h-4 animate-spin" /> : "Récupérer"}
        </button>
      </div>

      {/* File upload + textarea row */}
      <div className="flex gap-2 items-start">
        <div className="flex-1">
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Collez ici le texte complet de l'offre d'emploi..."
            className="w-full h-32 p-4 bg-card rounded-xl shadow-soft border-none focus:ring-2 focus:ring-primary focus:outline-none text-foreground placeholder:text-muted-foreground resize-none text-sm"
          />
        </div>
        <div className="flex-shrink-0">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.docx,.txt"
            onChange={handleFileUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loadingFile}
            className="p-3 bg-secondary rounded-xl hover:bg-secondary/80 transition-colors text-muted-foreground"
            title="Importer un PDF/DOCX de l'offre"
          >
            {loadingFile ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Upload className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default JobOfferInput;
