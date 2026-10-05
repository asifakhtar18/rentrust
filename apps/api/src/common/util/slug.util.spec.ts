import { normalizeName, slugify } from './slug.util';

describe('slug utils', () => {
  it('slugifies names', () => {
    expect(slugify('Prestige Lakeside Habitat')).toBe('prestige-lakeside-habitat');
    expect(slugify('  HSR   Layout!! ')).toBe('hsr-layout');
    expect(slugify('Café Résidence')).toBe('cafe-residence');
  });

  it('normalises names for dedupe', () => {
    expect(normalizeName('Prestige   Lakeside')).toBe('prestige lakeside');
    expect(normalizeName('PRESTIGE lakeside ')).toBe('prestige lakeside');
  });
});
