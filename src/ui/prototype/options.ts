export type PrototypeLanguage = 'el' | 'en';

/** One deterministic query choice; absent, repeated or malformed values use the default. */
function singleParameter(search: string, name: string): string | undefined {
  const values = new URLSearchParams(search).getAll(name);
  return values.length === 1 ? values[0] : undefined;
}

/** Prototype-only Greek default, including unsupported/repeated values. Legacy variant queries are ignored. */
export function parsePrototypeLanguage(search: string): PrototypeLanguage {
  return singleParameter(search, 'lang') === 'en' ? 'en' : 'el';
}
