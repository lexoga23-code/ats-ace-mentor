/**
 * Fallback pour impression PDF via window.print()
 * Phase 3 de la refonte templates CV
 *
 * Utilisé si Browserless.io échoue ou est indisponible.
 * Qualité moindre mais garantit que l'utilisateur obtient un PDF.
 */

/**
 * Ouvre une fenêtre d'impression avec le HTML du CV
 * @param html - Le HTML complet du CV
 * @param filename - Le nom souhaité pour le fichier (utilisé pour le titre)
 */
export const fallbackPrint = (html: string, filename: string): void => {
  // Ouvrir une nouvelle fenêtre
  const printWindow = window.open("", "_blank");

  if (!printWindow) {
    // Popup bloqué - afficher une alerte
    alert(
      "Impossible d'ouvrir la fenêtre d'impression. " +
      "Veuillez autoriser les popups pour ce site et réessayer."
    );
    return;
  }

  // Injecter un message d'aide et le script d'impression auto
  const printScript = `
    <script>
      // Définir le titre du document pour éviter "about:blank"
      document.title = "${filename.replace(/"/g, '\\"')}";

      // Lancer l'impression après chargement complet
      window.onload = function() {
        // Petit délai pour s'assurer que les polices sont chargées
        setTimeout(function() {
          window.print();
        }, 300);

        // Fermer après impression (ou annulation)
        window.onafterprint = function() {
          window.close();
        };
      };
    </script>
  `;

  // Message d'aide pour l'utilisateur (s'affiche brièvement avant le dialogue)
  const helpMessage = `
    <div id="print-help" style="
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #fef3c7;
      color: #92400e;
      padding: 12px 20px;
      font-family: system-ui, sans-serif;
      font-size: 14px;
      text-align: center;
      z-index: 10000;
      border-bottom: 1px solid #fcd34d;
    ">
      <strong>Conseil :</strong> Dans le dialogue d'impression, décochez
      "En-têtes et pieds de page" pour un PDF propre.
    </div>
    <style>
      @media print {
        #print-help { display: none !important; }
      }
    </style>
  `;

  // Injecter le HTML modifié
  // On insère le message et le script juste avant </body>
  let modifiedHtml = html;

  if (html.includes("</body>")) {
    modifiedHtml = html.replace(
      "</body>",
      `${helpMessage}${printScript}</body>`
    );
  } else {
    // HTML mal formé - ajouter à la fin
    modifiedHtml = html + helpMessage + printScript;
  }

  // Écrire le contenu
  printWindow.document.write(modifiedHtml);
  printWindow.document.close();
};
