import { VINTED_COUNTRIES } from 'vinted-core';

export const countriesResource = {
  uri: 'vinted://countries',
  name: 'Vinted Countries',
  description: 'List of all 19 Vinted country domains with currency and language info',
  mimeType: 'application/json',
};

export function getCountriesData(): string {
  const countries = Object.values(VINTED_COUNTRIES).map(c => ({
    code: c.code,
    domain: c.domain,
    currency: c.currency,
    language: c.language,
    name: c.name,
  }));

  return JSON.stringify(countries, null, 2);
}
