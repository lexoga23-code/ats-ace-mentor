import { extractRecipientAddress, type AddressCountry } from "../address/recipientAddressExtractor";

export const RECIPIENT_FALLBACK = "\u00C0 l'attention du Service Recrutement";

const COMPANY_TOKEN_REGEX = /\b(entreprise|societe|société|groupe|clinique|chu|hopital|hôpital|cabinet|association|sas|sarl|sa|sàrl|ag|gmbh)\b/i;
const STREET_TOKEN_REGEX = /\b(rue|avenue|av\.?|boulevard|bd\.?|chemin|route|impasse|allee|allée|place|quai|cours)\b/i;
const CONTACT_TOKEN_REGEX = /\b(madame|monsieur|mme|m\.|contact)\b/i;
const METADATA_NOISE_REGEX = /\b(poste|mission|profil|experience|expérience|competence|compétence|salaire|contrat|cdi|cdd|offres?|jobup|indeed|linkedin|monster|apec|date de publication|postuler|voir plus)\b/i;

const cleanLine = (value: string): string => value.replace(/\s+/g, " ").trim();

const splitContactLines = (offerDetails: string): string[] =>
  offerDetails
    .split(/\r?\n|\s+\|\s+/)
    .map(cleanLine)
    .filter(Boolean);

const findContactLine = (offerDetails: string): string | undefined =>
  splitContactLines(offerDetails).find((line) =>
    CONTACT_TOKEN_REGEX.test(line) &&
    !METADATA_NOISE_REGEX.test(line) &&
    line.length <= 80
  );

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

  const looksLikeCompany = COMPANY_TOKEN_REGEX.test(cleaned) && !STREET_TOKEN_REGEX.test(cleaned) && !/\d{4,5}\s+/.test(cleaned);
  if (looksLikeCompany) {
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

export const parseRecipientDetails = (
  offerDetails?: string,
  country: AddressCountry = "FR"
): ParsedRecipientDetails => {
  if (!offerDetails || !offerDetails.trim()) {
    return { recipientName: RECIPIENT_FALLBACK };
  }

  const extracted = extractRecipientAddress(offerDetails, country);
  const contactLine = findContactLine(offerDetails);

  return {
    recipientName: contactLine || RECIPIENT_FALLBACK,
    recipientDept: extracted.companyName,
    recipientAddress: extracted.addressLine,
    recipientCityZip: extracted.cityLine,
  };
};
