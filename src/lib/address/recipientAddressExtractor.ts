export type AddressCountry = "FR" | "CH";

export type RecipientAddress = {
  recipientName: string;
  companyName?: string;
  addressLine?: string;
  cityLine?: string;
  confidence: {
    company: number;
    address: number;
    city: number;
    overall: number;
  };
  fallbackUsed: boolean;
  rejectedLines: Array<{
    line: string;
    reason: string;
  }>;
  lines: string[];
};

type Candidate = {
  line: string;
  score: number;
  index: number;
};

const DEFAULT_RECIPIENT_NAME = "Service Recrutement";

const SWISS_CITIES = [
  "Lausanne",
  "Genève",
  "Geneve",
  "Fribourg",
  "Neuchâtel",
  "Neuchatel",
  "Sion",
  "Berne",
  "Zurich",
  "Bâle",
  "Bale",
  "Lucerne",
  "Saint-Gall",
  "Lugano",
  "Delémont",
  "Delemont",
  "Yverdon",
  "Montreux",
  "Vevey",
  "Nyon",
  "Morges",
  "Aigle",
  "Monthey",
  "Sierre",
  "Martigny",
  "La Chaux-de-Fonds",
  "Porrentruy",
];

const SWISS_CANTONS = [
  "VD",
  "GE",
  "FR",
  "VS",
  "NE",
  "JU",
  "BE",
  "ZH",
  "BS",
  "BL",
  "LU",
  "SG",
  "TI",
  "AG",
  "TG",
  "SO",
  "SH",
  "AR",
  "AI",
  "GL",
  "GR",
  "SZ",
  "UR",
  "OW",
  "NW",
  "ZG",
];

const INSTITUTIONAL_KEYWORDS = [
  "Hôpital",
  "Hopital",
  "Clinique",
  "Institut",
  "École",
  "Ecole",
  "Université",
  "Universite",
  "Groupe",
  "Cabinet",
  "Centre",
  "Fondation",
  "Association",
  "Établissement",
  "Etablissement",
  "Service",
  "Direction",
  "Département",
  "Departement",
  "Entreprise",
];

const LEGAL_ENTITIES: Record<AddressCountry, string[]> = {
  FR: ["SA", "SARL", "SAS", "SASU", "EURL", "SCI", "SNC", "SCA"],
  CH: ["SA", "Sàrl", "Sarl", "AG", "GmbH"],
};

const STREET_TOKEN_REGEX =
  /\b(rue|avenue|av\.?|boulevard|bd\.?|place|impasse|chemin|allée|allee|cours|route|quai)\b/i;
const HTML_ENTITY_REGEX = /&#x?[0-9a-f]+;?|&(lt|gt|amp|quot|apos);/i;
const HTML_TAG_REGEX = /<[^>]+>|<\/?(div|p|span|section|article|br|ul|ol|li|strong|em|a)\b[^>]*>/i;
const URL_REGEX = /(https?:\/\/|www\.|:\/\/|[\w-]+\.(?:ch|fr|com|org|net)\b)/i;
const DATE_PATTERN_REGEX =
  /(\d{1,2}[/. -]\d{1,2}[/. -]\d{2,4}|\d{1,2}\s+(janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre)\s+\d{4}|date de publication|publié le|publie le|mise à jour|mise a jour)/i;
const EMPLOYEE_COUNT_REGEX =
  /(\d+\s*[-–]\s*\d+\s*(employ|salari|collaborateur)|\b\d{1,3}[\s\u00a0]\d{3,}\b)/i;
const NOISE_KEYWORD_REGEX =
  /\b(offres?|employé\.?e\.?s?|employes?|salariés?|salaries?|collaborateurs?|salaire|contrat|jobup|indeed|linkedin|monster|apec|pole-emploi|pôle emploi|voir plus|postuler|candidature en ligne|cliquez ici|en savoir plus|détails|details|description|profil recherché|profil recherche|mission|responsabilités|responsabilites|tâches|taches|compétences requises|competences requises|cdi|cdd|temps partiel|temps plein|rémunération|remuneration|brut|net|chf)\b/i;
const MONEY_REGEX = /[€]|(?:\bCHF\b)/i;
const COMPANY_TITLE_REGEX = /\boffre d['’]?emploi\s+(?:chez|de)\s+([^|\n\r-]{2,100})/i;
const CHEZ_COMPANY_REGEX = /\bchez\s+([^|\n\r-]{2,100})/i;

const normalizeWhitespace = (value: string): string => value.replace(/\s+/g, " ").trim();

const normalizeKey = (value: string): string =>
  normalizeWhitespace(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const isGenericDepartmentLine = (line: string): boolean => {
  const key = normalizeKey(line);
  return /^(service|direction|departement)\s+(rh|ressources humaines|recrutement|du recrutement|des ressources humaines)$/.test(key);
};

const capitalizeFirst = (value: string): string => {
  const cleaned = normalizeWhitespace(value);
  if (!cleaned) return cleaned;
  return cleaned.charAt(0).toLocaleUpperCase("fr-FR") + cleaned.slice(1);
};

const isPostalCity = (line: string, country: AddressCountry): boolean => {
  const digits = country === "CH" ? 4 : 5;
  return new RegExp(`\\b\\d{${digits}}\\s+[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ' -]{1,}\\b`).test(line);
};

const isSwissCityOnly = (line: string): boolean => {
  const key = normalizeKey(line);
  return SWISS_CITIES.some((city) => normalizeKey(city) === key);
};

const isSwissCantonOnly = (line: string): boolean => SWISS_CANTONS.includes(line.trim().toUpperCase());

const legalEntityRegex = (country: AddressCountry): RegExp => {
  const entities = LEGAL_ENTITIES[country].map((entity) => entity.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return new RegExp(`\\b(${entities.join("|")})\\b`, "i");
};

const hasInstitutionalKeyword = (line: string): boolean => {
  const key = normalizeKey(line);
  return INSTITUTIONAL_KEYWORDS.some((keyword) => key.includes(normalizeKey(keyword)));
};

const hasMultipleCapitalizedWords = (line: string): boolean => {
  const words = line.match(/\b[A-ZÀ-Ý][A-Za-zÀ-ÿ'’-]{2,}\b/g) ?? [];
  return words.length >= 2;
};

const noiseReason = (line: string): string | undefined => {
  if (!line) return "empty";
  if (HTML_ENTITY_REGEX.test(line) || HTML_TAG_REGEX.test(line)) return "html_entity";
  if (URL_REGEX.test(line)) return "url";
  if (DATE_PATTERN_REGEX.test(line)) return "date_pattern";
  if (/\d+\s*[-–]\s*\d+\s*(employ|salari|collaborateur)/i.test(line)) return "employee_count";
  if (EMPLOYEE_COUNT_REGEX.test(line)) return "large_number";
  if (MONEY_REGEX.test(line)) return "salary";
  if (NOISE_KEYWORD_REGEX.test(line)) return "noise_keyword";
  if (line.length > 140) return "too_long";
  return undefined;
};

const splitLines = (jobText: string): string[] => {
  const seen = new Set<string>();
  const lines = jobText
    .split(/\r?\n|\s+\|\s+/)
    .map(normalizeWhitespace)
    .filter(Boolean);

  return lines.filter((line) => {
    const key = line.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const extractCompanyFromTitle = (jobText: string): string | undefined => {
  const cleaned = normalizeWhitespace(jobText);
  const match = cleaned.match(COMPANY_TITLE_REGEX) ?? cleaned.match(CHEZ_COMPANY_REGEX);
  const candidate = match?.[1] ? normalizeWhitespace(match[1]) : "";
  if (!candidate || noiseReason(candidate)) return undefined;
  return candidate;
};

const scoreCompany = (
  line: string,
  country: AddressCountry,
  index: number,
  cityIndexes: Set<number>
): number => {
  if (cityIndexes.has(index) || STREET_TOKEN_REGEX.test(line) || isPostalCity(line, country)) return 0;
  if (isGenericDepartmentLine(line)) return 0;
  if (country === "FR" && /\binc\.?$/i.test(line)) return 0;

  let score = 0;
  if (legalEntityRegex(country).test(line)) score += 40;
  if (hasInstitutionalKeyword(line)) score += 40;
  if (hasMultipleCapitalizedWords(line)) score += 20;

  const nextToCity = cityIndexes.has(index + 1) || cityIndexes.has(index - 1);
  if (nextToCity && score > 0) score += 5;

  return Math.min(score, 100);
};

const scoreAddress = (line: string, country: AddressCountry): number => {
  if (isPostalCity(line, country)) return 0;

  let score = 0;
  if (/\b(CS|BP)\s*\d+/i.test(line) || /\bcedex\b/i.test(line)) score += 40;
  if (STREET_TOKEN_REGEX.test(line) && /\d/.test(line)) score += 40;
  if (/^\d{1,4}[,\s]/.test(line) && STREET_TOKEN_REGEX.test(line)) score += 40;

  return Math.min(score, 100);
};

const scoreCity = (line: string, country: AddressCountry): number => {
  if (isPostalCity(line, country)) return country === "CH" ? 60 : 50;
  if (country === "CH" && (isSwissCityOnly(line) || isSwissCantonOnly(line))) return 50;
  return 0;
};

const pickBest = (candidates: Candidate[], threshold: number): Candidate | undefined =>
  candidates
    .filter((candidate) => candidate.score >= threshold)
    .sort((a, b) => b.score - a.score || a.index - b.index)[0];

export function extractRecipientAddress(jobText: string, country: AddressCountry): RecipientAddress {
  const rawLines = splitLines(jobText);
  const rejectedLines: RecipientAddress["rejectedLines"] = [];
  const usableLines: Array<{ line: string; index: number }> = [];

  rawLines.forEach((line, index) => {
    const reason = noiseReason(line);
    if (reason) {
      rejectedLines.push({ line, reason });
      return;
    }
    usableLines.push({ line, index });
  });

  const cityCandidates = usableLines.map(({ line, index }) => ({
    line: isSwissCityOnly(line) ? capitalizeFirst(line) : line,
    score: scoreCity(line, country),
    index,
  }));
  const validCityIndexes = new Set(cityCandidates.filter((candidate) => candidate.score > 0).map((candidate) => candidate.index));

  const addressCandidates = usableLines.map(({ line, index }) => ({
    line,
    score: scoreAddress(line, country),
    index,
  }));
  const companyCandidates = usableLines.map(({ line, index }) => ({
    line: hasInstitutionalKeyword(line) ? capitalizeFirst(line) : line,
    score: scoreCompany(line, country, index, validCityIndexes),
    index,
  }));

  const titleCompany = extractCompanyFromTitle(jobText);
  if (titleCompany) {
    companyCandidates.push({
      line: titleCompany,
      score: scoreCompany(titleCompany, country, -1, validCityIndexes),
      index: -1,
    });
  }

  const company = pickBest(companyCandidates, 40);
  const address = pickBest(addressCandidates, 40);
  const city = pickBest(cityCandidates, 50);

  const lines = [company?.line, address?.line, city?.line].filter(Boolean) as string[];
  const confidence = {
    company: company?.score ?? 0,
    address: address?.score ?? 0,
    city: city?.score ?? 0,
    overall: Math.round(((company?.score ?? 0) * 0.4) + ((address?.score ?? 0) * 0.25) + ((city?.score ?? 0) * 0.35)),
  };

  return {
    recipientName: DEFAULT_RECIPIENT_NAME,
    companyName: company?.line,
    addressLine: address?.line,
    cityLine: city?.line,
    confidence,
    fallbackUsed: lines.length === 0,
    rejectedLines,
    lines,
  };
}
