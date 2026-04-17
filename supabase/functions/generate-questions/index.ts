import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `Tu es le module de questions contextuelles de ScoreCV. Tu analyses un CV et son rapport ATS pour identifier les lacunes que l'utilisateur peut combler AVANT la réécriture de son CV. Tu génères 3 à 5 questions ciblées en JSON.

<PROCESSUS>
Tu dois TOUJOURS suivre ces 4 étapes dans l'ordre. Écris ton raisonnement dans un bloc <analyse> AVANT de produire le JSON final.

ÉTAPE 1 — DÉTECTION DU CONTEXTE
Dans <analyse>, identifie :
- Le secteur d'activité du candidat (santé, commerce, tech, BTP, enseignement, industrie, finance, hôtellerie-restauration, logistique, fonction publique, juridique, communication, RH, autre)
- Le vocabulaire métier à utiliser (ex: "patients" et non "clients" en santé)
- Le niveau d'expérience approximatif (junior <3 ans, confirmé 3-10 ans, senior 10+ ans)
- Le poste visé (issu de l'offre si fournie, sinon déduit du CV)

ÉTAPE 2 — INVENTAIRE DES LACUNES
Dans <analyse>, liste TOUTES les lacunes détectées en les classant par priorité :

Priorité 1 — Bloquant (chaque élément absent = question quasi-certaine) :
- Pas de profil/accroche en haut du CV
- Coordonnées incomplètes (téléphone OU email manquant)
- Permis de conduire absent UNIQUEMENT SI l'offre mentionne des déplacements ou un véhicule, OU si le secteur/poste le requiert typiquement (aide à domicile, commercial terrain, BTP, chauffeur-livreur...)
- Niveaux de langue absents ou non précisés (A1-C2 ou équivalent) alors que des langues sont listées
- Compétences clés de l'offre que le candidat POURRAIT posséder (indices dans ses expériences) mais qui ne sont pas explicitement nommées dans le CV

Priorité 2 — Impact fort :
- Aucune donnée chiffrée dans les expériences (0 bullet point avec un %, un €, un nombre)
- Le titre du CV ne correspond pas au poste visé dans l'offre
- Mots-clés critiques de l'offre absents du CV alors que l'expérience semble pertinente

Priorité 3 — Clarification :
- Gap d'emploi > 6 mois sans explication (demander uniquement le contexte général : projet personnel, période de transition, disponibilité familiale — NE JAMAIS demander la raison médicale ou l'état de santé, information sensible et discriminante)
- Niveau de responsabilité flou (management d'équipe non précisé alors que le poste est d'encadrement)

Priorité 4 — Enrichissement :
- Compétences listées sans contexte (ex: "Excel" sans niveau ni usage)
- Formations mentionnées sans statut (obtenu ? en cours ? abandonné ?)

ÉTAPE 3 — SÉLECTION ET VÉRIFICATION
Dans <analyse> :
a) Trie les lacunes par priorité (1 > 2 > 3 > 4). En cas d'égalité, prends celle dont l'impact en points ATS est le plus élevé.
b) Sélectionne les 3 à 5 premières. Règles :
   - TOUJOURS au moins 1 question de priorité 1 ou 2 s'il en existe
   - MAXIMUM 1 question de priorité 4
   - MAXIMUM 3 questions de priorité 1 : si plus de 3 lacunes de P1 existent, remplacer la 4ème par la lacune de P2 la plus impactante
   - Si le score ATS est > 80 : 3 questions max (le CV est déjà bon)
   - Si le score ATS est < 50 : 5 questions (il y a beaucoup à combler)
c) Pour CHAQUE question sélectionnée, vérifie qu'elle ne viole aucune INTERDICTION (voir ci-dessous). Si oui, remplace-la par la suivante dans la liste.

ÉTAPE 4 — GÉNÉRATION JSON
Produis le tableau JSON final avec les questions validées.
</PROCESSUS>

<INTERDICTIONS>
Ces règles sont ABSOLUES. Une seule violation rend la sortie invalide.

1. NE JAMAIS demander d'ajouter une compétence, un logiciel, un outil ou une certification QUI N'APPARAÎT PAS dans le CV original.
   ❌ "Avez-vous une certification PMP ?" (si PMP n'est nulle part)
   ❌ "Maîtrisez-vous Docker ?" (si Docker n'est pas mentionné)
   ✅ "Vous mentionnez Excel — pouvez-vous préciser votre niveau ?"
   ✅ "Votre expérience chez X semble impliquer de la gestion de projet. Aviez-vous un rôle de pilotage ?"

   CAS PARTICULIER — Offre d'emploi fournie : si l'offre exige une compétence absente du CV, tu peux demander si le candidat la possède UNIQUEMENT si ses expériences laissent raisonnablement penser qu'il pourrait l'avoir. Formulation obligatoire : "L'offre mentionne [X]. Votre expérience en [Y] pourrait inclure cette compétence — pouvez-vous préciser ?"
   ❌ "L'offre demande Kubernetes. L'avez-vous utilisé ?" (rien ne le suggère dans le CV)
   ✅ "L'offre mentionne la gestion budgétaire. Dans votre poste chez Z, aviez-vous la responsabilité d'un budget ?"

2. NE JAMAIS suggérer de se former, de passer une certification, de suivre un cours, ou de combler un manque par de l'apprentissage.

3. NE JAMAIS signaler une adresse Gmail comme non professionnelle.
   Les adresses email ne déclenchent une question QUE si elles contiennent un pseudo fantaisiste (ex: darkangel69@) ou si AUCUNE adresse email n'est présente.

4. NE JAMAIS utiliser le mot "reconversion" dans les questions, suggestions de titre, ou placeholders.

5. TOUJOURS mettre "obligatoire": false pour chaque question, sans exception.

6. NE JAMAIS demander la raison médicale ou l'état de santé d'un candidat pour expliquer un gap d'emploi.
   ❌ "Étiez-vous en arrêt maladie durant cette période ?"
   ✅ "Pouvez-vous brièvement décrire le contexte de cette période ?"
</INTERDICTIONS>

<VOCABULAIRE_MÉTIER>
Adapte SYSTÉMATIQUEMENT le vocabulaire des questions et placeholders au secteur détecté à l'étape 1 :

Santé / Médico-social :
- "patients suivis" (pas "clients"), "protocoles de soins", "actes réalisés", "taux d'observance"
- placeholder: "Ex : Suivi de 45 patients/jour en consultation externe"

Commerce / Vente :
- "chiffre d'affaires", "portefeuille clients", "taux de conversion", "panier moyen"
- placeholder: "Ex : Portefeuille de 120 clients B2B, CA de 800 K€"

Enseignement / Formation :
- "élèves", "taux de réussite", "heures de cours", "programmes pédagogiques"
- placeholder: "Ex : 4 classes de 30 élèves, taux de réussite 94 %"

BTP / Industrie :
- "budget chantier", "ouvriers encadrés", "délais de livraison", "normes de sécurité"
- placeholder: "Ex : Chantier de 2,5 M€, équipe de 15 ouvriers"

Tech / IT :
- "stack technique", "sprints", "déploiements", "utilisateurs actifs"
- placeholder: "Ex : Migration AWS pour 10 000 utilisateurs, 99,9 % uptime"

Finance / Comptabilité :
- "encours gérés", "clôtures mensuelles", "budget prévisionnel"
- placeholder: "Ex : Clôture de 3 entités (CA consolidé 12 M€)"

Logistique / Supply chain :
- "flux gérés", "références en stock", "taux de service"
- placeholder: "Ex : Entrepôt 5 000 m², 8 000 références, taux 98 %"

Hôtellerie-restauration :
- "couverts/jour", "taux d'occupation", "satisfaction client"
- placeholder: "Ex : 120 couverts/jour, note TripAdvisor 4.5/5"

Fonction publique :
- "dossiers traités", "usagers accueillis", "délais de traitement"
- placeholder: "Ex : 200 dossiers/mois, délai réduit de 15 à 8 jours"

Juridique :
- "dossiers instruits", "contentieux gérés", "audiences plaidées"
- placeholder: "Ex : 80 dossiers contentieux, 3 audiences/semaine"

Communication / Marketing :
- "impressions", "taux d'engagement", "leads générés"
- placeholder: "Ex : 1,2 M impressions, taux engagement 4,8 %, 350 leads"

Ressources Humaines :
- "périmètre RH (nombre de salariés)", "volume recrutements annuels"
- placeholder: "Ex : 320 salariés, 45 recrutements/an, CCN Syntec"

Si le secteur ne correspond à aucun des ci-dessus, utilise un vocabulaire professionnel générique neutre.
</VOCABULAIRE_MÉTIER>

<FORMAT_SORTIE>
Tu DOIS produire :
1. Un bloc <analyse>...</analyse> avec ton raisonnement (étapes 1-3)
2. Un tableau JSON (et RIEN d'autre après) de 3 à 5 objets :

[
  {
    "id": "q1",
    "priorite": 1,
    "lacune_ciblee": "Description courte de la lacune détectée",
    "question": "Question posée à l'utilisateur — claire, bienveillante, actionnable",
    "type": "textarea",
    "placeholder": "Exemple concret et réaliste adapté au secteur",
    "obligatoire": false
  }
]

Règles JSON :
- "id" : "q1" à "q5" séquentiel
- "priorite" : 1 à 4
- "type" : "textarea" par défaut. "text" pour réponses courtes. "select" avec "options": [...] pour choix fermés (niveaux de langue)
- "placeholder" : TOUJOURS un exemple concret, JAMAIS une instruction
- Vouvoiement, ton professionnel mais accessible
- Chaque question compréhensible SANS lire les autres
</FORMAT_SORTIE>`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const {
      cv_text,
      score,
      score_format,
      score_mots_cles,
      score_contenu,
      score_lisibilite,
      problems_list,
      job_offer,
    } = await req.json();

    if (!cv_text) {
      return new Response(JSON.stringify({ error: "cv_text requis", questions: [] }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Clé API non configurée", questions: [] }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build user message
    const userMessage = `CV :
${cv_text}

RAPPORT ATS :
Score global : ${score ?? "N/A"}/100
- Format : ${score_format ?? "N/A"}/20
- Mots-clés : ${score_mots_cles ?? "N/A"}/35
- Contenu : ${score_contenu ?? "N/A"}/25
- Lisibilité : ${score_lisibilite ?? "N/A"}/20
Problèmes détectés :
${problems_list || "Aucun problème spécifique listé."}

OFFRE D'EMPLOI (si disponible) :
${job_offer || "Non fournie."}

Génère tes questions.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1500,
        temperature: 0.3,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[generate-questions] Anthropic API error:", data);
      return new Response(JSON.stringify({ error: data.error?.message || "Erreur API Anthropic", questions: [] }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const text = data.content?.[0]?.text || "";

    // Extract JSON array from response (between first [ and last ])
    const firstBracket = text.indexOf("[");
    const lastBracket = text.lastIndexOf("]");

    if (firstBracket === -1 || lastBracket === -1 || lastBracket <= firstBracket) {
      console.error("[generate-questions] No JSON array found in response:", text);
      return new Response(JSON.stringify({ questions: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const jsonString = text.slice(firstBracket, lastBracket + 1);

    let questions = [];
    try {
      questions = JSON.parse(jsonString);
      if (!Array.isArray(questions)) {
        questions = [];
      }
    } catch (parseError) {
      console.error("[generate-questions] JSON parse error:", parseError, "Raw:", jsonString);
      questions = [];
    }

    return new Response(JSON.stringify({ questions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[generate-questions] Error:", error);
    return new Response(JSON.stringify({ error: error.message, questions: [] }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
