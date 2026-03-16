import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ_ITEMS = [
  {
    q: "Que se passe-t-il après le paiement de 4€ ?",
    a: "Vous accédez immédiatement au rapport complet avec un email de confirmation. Si vous fermez la fenêtre, relancez simplement l'analyse — votre accès est conservé.",
  },
  {
    q: "Mon CV est-il en sécurité ?",
    a: "Votre CV est analysé anonymement. Aucune donnée nominative n'est stockée sur nos serveurs.",
  },
  {
    q: "Quelle différence entre l'IA à 4€ et la relecture humaine à 29€ ?",
    a: "L'IA optimise la compatibilité technique ATS (mots-clés, format, structure). L'expert humain évalue le ton, la cohérence et l'impact sur le recruteur. Les deux sont complémentaires.",
  },
  {
    q: "Quel est le délai de la relecture humaine ?",
    a: "24h ouvrées après paiement. Vous recevez un rapport PDF personnalisé + un échange email de suivi inclus.",
  },
  {
    q: "Et si je ne suis pas satisfait ?",
    a: "Pas de remboursement, mais notre analyse est sérieuse et garantie. Chaque rapport est personnalisé par notre IA ou nos experts.",
  },
  {
    q: "Comment annuler l'abonnement Pro ?",
    a: "Via le portail Stripe self-service. Le lien est dans votre email de confirmation. Annulation à tout moment.",
  },
  {
    q: "Quels formats de CV sont acceptés ?",
    a: "PDF, DOCX et TXT. Attention : les CVs créés avec Canva sont souvent des PDFs graphiques illisibles par les ATS — dans ce cas, collez le texte manuellement.",
  },
];

const FAQ = () => (
  <section id="faq" className="py-20 px-6 bg-card">
    <div className="max-w-3xl mx-auto">
      <h2 className="text-3xl font-bold text-center mb-16 text-foreground">Questions fréquentes</h2>
      <Accordion type="single" collapsible className="space-y-4">
        {FAQ_ITEMS.map((item, i) => (
          <AccordionItem key={i} value={`faq-${i}`} className="bg-background rounded-2xl shadow-soft border-none px-6">
            <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline py-5">
              {item.q}
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground pb-5 leading-relaxed">
              {item.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  </section>
);

export default FAQ;
