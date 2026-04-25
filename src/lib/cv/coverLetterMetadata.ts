export const RECIPIENT_FALLBACK = "\u00C0 l'attention du Service Recrutement";

const COMPANY_TOKEN_REGEX = /\b(entreprise|societe|soci\u00e9t\u00e9|groupe|clinique|chu|hopital|h\u00f4pital|cabinet|association|sas|sarl|sa)\b/i;
const STREET_TOKEN_REGEX = /\b(rue|avenue|av\.?|boulevard|bd\.?|chemin|route|impasse|allee|all\u00e9e|place|quai|cours)\b/i;
const POSTAL_CITY_REGEX = /\b\d{4,5}\s+[A-Za-z\u00C0-\u00FF][A-Za-z\u00C0-\u00FF' -]{1,}\b/;
const CONTACT_TOKEN_REGEX = /\b(madame|monsieur|mme|m\.|contact|attention)\b/i;
const NOISY_JOB_WORDS_REGEX = /\b(poste|mission|profil|experience|exp\u00e9rience|competence|comp\u00e9tence|salaire|contrat|cdi|cdd)\b/i;
const OFFER_NOISE_REGEX = /(offre d['\u2019]?emploi|jobup|indeed|linkedin|hellowork|welcome to the jungle|welcometothejungle|monster|apec)/i;
const PUBLICATION_DATE_REGEX = /^\d{1,2}\s+(janvier|fevrier|f\u00e9vrier|mars|avril|mai|juin|juillet|aout|ao\u00fbt|septembre|octobre|novembre|decembre|d\u00e9cembre)\s+\d{4}$/i;
const EMPLOYEE_COUNT_REGEX = /^\d+\s*[-\u2013]\s*\d+\s+employ/i;
const STANDALONE_CITY_REGEX = /^(gen[\u00e8e]ve|lausanne|paris|lyon|marseille|bordeaux|toulouse|nantes|lille|strasbourg|nice|rennes|montpellier|grenoble|dijon|angers|reims|rouen|nancy|tours|annecy|fribourg|neuch[\u00e2a]tel|sion|nyon|morges|vevey|montreux)$/i;

const cleanLine = (value: string): string => value.replace(/\s+/g, " ").trim();

const unique = (items: string[]): string[] => {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const isNoiseLine = (line: string): boolean => {
  if (!line) return true;
  if (/^https?:\/\//i.test(line)) return true;
  if (/@/.test(line)) return true;
  if (line.length > 140) return true;
  if (PUBLICATION_DATE_REGEX.test(line)) return true;
  if (EMPLOYEE_COUNT_REGEX.test(line)) return true;
  if (/^\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}$/.test(line)) return true;
  if (OFFER_NOISE_REGEX.test(line)) return true;
  return false;
};

const splitOfferLines = (offerDetails: string): string[] => {
  const rawLines = offerDetails
    .split(/\r?\n/)
    .flatMap((line) => line.split(/\s*[|;]\s*/))
    .map(cleanLine)
    .filter(Boolean);

  return unique(rawLines.filter((line) => !isNoiseLine(line)));
};

const isStandaloneCityLine = (line: string): boolean =>
  STANDALONE_CITY_REGEX.test(cleanLine(line));

const isLikelyAddressLine = (line: string): boolean =>
  !EMPLOYEE_COUNT_REGEX.test(line) &&
  (STREET_TOKEN_REGEX.test(line) || /^\d{1,4}[,\s]/.test(line) || POSTAL_CITY_REGEX.test(line));

const extractCompanyFromOfferTitle = (offerDetails?: string): string | undefined => {
  if (!offerDetails) return undefined;
  const cleaned = offerDetails.replace(/\s+/g, " ");

  const offerMatch = cleaned.match(/offre d['\u2019]?emploi\s+(?:chez|de)\s+([^|\n-]{2,100})/i);
  if (offerMatch?.[1]) {
    const company = cleanLine(offerMatch[1]);
    if (company && !OFFER_NOISE_REGEX.test(company) && !NOISY_JOB_WORDS_REGEX.test(company)) {
      return company;
    }
  }

  const chezMatch = cleaned.match(/\bchez\s+([^|\n-]{2,100})/i);
  if (chezMatch?.[1]) {
    const company = cleanLine(chezMatch[1]);
    if (company && !OFFER_NOISE_REGEX.test(company) && !NOISY_JOB_WORDS_REGEX.test(company)) {
      return company;
    }
  }

  return undefined;
};

export const extractCityFromLine = (line: string): string => {
  const cleaned = cleanLine(line);
  if (!cleaned) return "";

  const postalCityMatch = cleaned.match(/\b\d{4,5}\s+([A-Za-z\u00C0-\u00FF][A-Za-z\u00C0-\u00FF' -]{1,})\b/);
  if (postalCityMatch) {
    return cleanLine(postalCityMatch[1]);
  }

  const parts = cleaned.split(",").map(cleanLine).filter(Boolean);
  if (parts.length > 1) {
    const lastPart = parts[parts.length - 1];
    if (lastPart.length <= 40 && !COMPANY_TOKEN_REGEX.test(lastPart)) {
      return lastPart;
    }
  }

  if (cleaned.length <= 40 && !COMPANY_TOKEN_REGEX.test(cleaned)) {
    return cleaned;
  }

  return "";
};

export const sanitizeSenderAddress = (rawLocation: string): string => {
  const cleaned = cleanLine(rawLocation);
  if (!cleaned) return "";

  if (COMPANY_TOKEN_REGEX.test(cleaned) && !isLikelyAddressLine(cleaned)) {
    return "";
  }

  return cleaned;
};

export interface ParsedRecipientDetails {
  recipientName: string;
  recipientDept?: string;
  recipientAddress?: string;
  recipientCityZip?: string;
}

export const parseRecipientDetails = (offerDetails?: string): ParsedRecipientDetails => {
  if (!offerDetails || !offerDetails.trim()) {
    return { recipientName: RECIPIENT_FALLBACK };
  }

  const lines = splitOfferLines(offerDetails);
  const companyFromTitle = extractCompanyFromOfferTitle(offerDetails);
  if (lines.length === 0 && !companyFromTitle) {
    return { recipientName: RECIPIENT_FALLBACK };
  }

  const contactLine = lines.find((line) => CONTACT_TOKEN_REGEX.test(line));

  let companyLine = lines.find((line) =>
    COMPANY_TOKEN_REGEX.test(line) && !NOISY_JOB_WORDS_REGEX.test(line)
  );

  if (!companyLine && companyFromTitle) {
    companyLine = companyFromTitle;
  }

  const cityLine = lines.find((line) => POSTAL_CITY_REGEX.test(line)) ||
    lines.find((line) => isStandaloneCityLine(line));
  let addressLine = lines.find((line) => isLikelyAddressLine(line) && line !== cityLine);

  if (!companyLine && cityLine) {
    const cityIndex = lines.indexOf(cityLine);
    if (cityIndex > 0) {
      const previous = lines[cityIndex - 1];
      if (isLikelyAddressLine(previous) && !addressLine) {
        addressLine = previous;
      } else if (!CONTACT_TOKEN_REGEX.test(previous) && !NOISY_JOB_WORDS_REGEX.test(previous)) {
        companyLine = previous;
      }
    }
  }

  if (!companyLine) {
    companyLine = lines.find((line) =>
      !CONTACT_TOKEN_REGEX.test(line) &&
      !NOISY_JOB_WORDS_REGEX.test(line) &&
      !isLikelyAddressLine(line) &&
      !isStandaloneCityLine(line) &&
      !PUBLICATION_DATE_REGEX.test(line) &&
      !OFFER_NOISE_REGEX.test(line) &&
      line.length <= 80
    );
  }

  return {
    recipientName: contactLine || RECIPIENT_FALLBACK,
    recipientDept: companyLine && companyLine !== contactLine ? companyLine : undefined,
    recipientAddress: addressLine,
    recipientCityZip: cityLine,
  };
};
