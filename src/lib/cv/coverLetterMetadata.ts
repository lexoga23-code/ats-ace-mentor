export const RECIPIENT_FALLBACK = "À l'attention du Service Recrutement";

const COMPANY_TOKEN_REGEX = /\b(entreprise|societe|société|groupe|clinique|chu|hopital|hôpital|cabinet|association|sas|sarl|sa)\b/i;
const STREET_TOKEN_REGEX = /\b(rue|avenue|av\.?|boulevard|bd\.?|chemin|route|impasse|allee|allée|place|quai|cours)\b/i;
const POSTAL_CITY_REGEX = /\b\d{4,5}\s+[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ' -]{1,}\b/;
const CONTACT_TOKEN_REGEX = /\b(madame|monsieur|mme|m\.|contact|attention)\b/i;
const NOISY_JOB_WORDS_REGEX = /\b(poste|mission|profil|experience|expérience|competence|compétence|salaire|contrat|cdi|cdd)\b/i;

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

const splitOfferLines = (offerDetails: string): string[] => {
  const rawLines = offerDetails
    .split(/\r?\n/)
    .flatMap((line) => line.split(/\s*[|;]\s*/))
    .map(cleanLine)
    .filter(Boolean);

  return unique(
    rawLines.filter((line) =>
      line.length <= 140 &&
      !/^https?:\/\//i.test(line) &&
      !/@/.test(line)
    )
  );
};

const isLikelyAddressLine = (line: string): boolean =>
  STREET_TOKEN_REGEX.test(line) || /^\d{1,4}[,\s-]/.test(line) || POSTAL_CITY_REGEX.test(line);

export const extractCityFromLine = (line: string): string => {
  const cleaned = cleanLine(line);
  if (!cleaned) return "";

  const postalCityMatch = cleaned.match(/\b\d{4,5}\s+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ' -]{1,})\b/);
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
  if (lines.length === 0) {
    return { recipientName: RECIPIENT_FALLBACK };
  }

  const contactLine = lines.find((line) => CONTACT_TOKEN_REGEX.test(line));

  let companyLine = lines.find((line) =>
    COMPANY_TOKEN_REGEX.test(line) && !NOISY_JOB_WORDS_REGEX.test(line)
  );

  const cityLine = lines.find((line) => POSTAL_CITY_REGEX.test(line));
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
