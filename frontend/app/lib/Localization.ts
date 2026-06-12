type TranslationFn = (key: string, params?: Record<string, string | number>) => string;

export function translateIndustry(t: TranslationFn, industry?: string): string {
  if (!industry) return "";

  const key = `industries.${industry}`;
  const translated = t(key);
  return translated === key ? industry : translated;
}
