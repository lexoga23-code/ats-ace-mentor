const normalizeWhitespace = (value: string): string =>
  value.replace(/\s+/g, " ").trim();

const SALUTATION_PREFIX_REGEX = /^(madame,\s*monsieur,|madame\s+ou\s+monsieur,?|madame,|monsieur,)\s*/i;
const POLITESSE_PREFIX_REGEX = /(?:je vous prie d['’]agr(?:[ée]er|eer)|veuillez agr(?:[ée]er|eer)|je vous adresse).*/i;

export const sanitizeGeneratedLetterContent = (
  parsed: { objet: string; paragraphs: string[]; politesse: string }
): { objet: string; paragraphs: string[]; politesse: string } => {
  const paragraphs = parsed.paragraphs
    .map(normalizeWhitespace)
    .filter(Boolean);

  if (paragraphs[0]) {
    paragraphs[0] = paragraphs[0].replace(SALUTATION_PREFIX_REGEX, "").trim();
  }

  const politesse = normalizeWhitespace(parsed.politesse);
  const lastIndex = paragraphs.length - 1;
  if (lastIndex >= 0 && politesse) {
    paragraphs[lastIndex] = paragraphs[lastIndex]
      .replace(POLITESSE_PREFIX_REGEX, "")
      .trim();
  }

  return {
    objet: normalizeWhitespace(parsed.objet),
    paragraphs: paragraphs.filter(Boolean),
    politesse,
  };
};
