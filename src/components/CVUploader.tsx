import { useState, useRef } from "react";
import { FileText, CheckCircle } from "lucide-react";
import { extractText } from "@/lib/fileParser";
import { toast } from "sonner";

interface CVUploaderProps {
  onTextExtracted: (text: string) => void;
}

const CVUploader = ({ onTextExtracted }: CVUploaderProps) => {
  const [uploaded, setUploaded] = useState(false);
  const [fileName, setFileName] = useState("");
  const [showWarning, setShowWarning] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setFileName(file.name);
    setUploaded(true);
    toast.success(`"${file.name}" chargé — prêt pour l'analyse.`);

    try {
      const text = await extractText(file);
      if (text.length < 200) {
        setShowWarning(true);
        onTextExtracted(text);
      } else {
        setShowWarning(false);
        setPasteText(text);
        onTextExtracted(text);
      }
    } catch {
      setShowWarning(true);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handlePasteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPasteText(e.target.value);
    onTextExtracted(e.target.value);
  };

  return (
    <div className="space-y-6">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".pdf,.docx,.txt"
        onChange={handleFileChange}
      />
      <div
        className={`group border-2 border-dashed rounded-3xl p-12 text-center transition-all cursor-pointer ${
          uploaded
            ? "border-emerald-500 bg-emerald-50/30"
            : "border-border hover:border-primary hover:bg-primary/5"
        }`}
        onClick={() => fileInputRef.current?.click()}
      >
        <div
          className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform ${
            uploaded ? "bg-emerald-100 text-emerald-600" : "bg-primary/10 text-primary"
          }`}
        >
          {uploaded ? <CheckCircle className="w-8 h-8" /> : <FileText className="w-8 h-8" />}
        </div>
        <h3 className="text-xl font-bold mb-2 text-foreground">
          {uploaded ? `"${fileName}" chargé avec succès` : "Déposez votre CV ici"}
        </h3>
        <p className="text-muted-foreground">PDF, DOCX ou TXT (Max 5Mo)</p>
      </div>

      {showWarning && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-2xl text-destructive text-sm">
          <p className="font-bold mb-1">⚠️ CV graphique détecté — illisible par les ATS.</p>
          Votre CV est un PDF graphique (Canva, Adobe). Nous ne pouvons pas en extraire le texte — et les logiciels ATS des recruteurs non plus. Collez le texte de votre CV ci-dessous.
        </div>
      )}

      <textarea
        value={pasteText}
        onChange={handlePasteChange}
        placeholder="Ou collez le texte de votre CV ici..."
        className="w-full h-48 p-4 bg-secondary border-none rounded-2xl text-sm resize-none focus:ring-2 focus:ring-primary focus:outline-none text-foreground placeholder:text-muted-foreground"
      />
    </div>
  );
};

export default CVUploader;
