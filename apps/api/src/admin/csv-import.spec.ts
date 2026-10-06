import { parsePropertyCsv } from './csv-import';

describe('parsePropertyCsv', () => {
  it('parses a valid file', () => {
    const csv = [
      'display_name,property_type,developer,year_built,latitude,longitude,aliases',
      'Prestige Lakeside,APARTMENT,Prestige Group,2018,12.9279,77.6271,Lakeside|PLH',
      'Green PG,PG,,,,,',
    ].join('\n');
    const result = parsePropertyCsv(csv);
    expect(result.errors).toHaveLength(0);
    expect(result.valid).toHaveLength(2);
    expect(result.valid[0].aliases).toEqual(['Lakeside', 'PLH']);
    expect(result.valid[0].yearBuilt).toBe(2018);
    expect(result.valid[1].propertyType).toBe('PG');
  });

  it('reports missing required headers', () => {
    const result = parsePropertyCsv('name,type\nFoo,APARTMENT');
    expect(result.valid).toHaveLength(0);
    expect(result.errors[0].errors[0]).toContain('Missing required headers');
  });

  it('reports per-row validation errors without aborting the file', () => {
    const csv = [
      'display_name,property_type,year_built',
      'Good Place,APARTMENT,2019',
      'X,NOT_A_TYPE,3000',
    ].join('\n');
    const result = parsePropertyCsv(csv);
    expect(result.valid).toHaveLength(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].row).toBe(2);
    expect(result.errors[0].errors.some((e) => e.includes('property_type'))).toBe(true);
    expect(result.errors[0].errors.some((e) => e.includes('year_built'))).toBe(true);
  });

  it('handles quoted fields containing commas', () => {
    const csv = ['display_name,property_type', '"Habitat, Phase 2",VILLA'].join('\n');
    const result = parsePropertyCsv(csv);
    expect(result.valid[0].displayName).toBe('Habitat, Phase 2');
  });

  it('rejects out-of-range coordinates', () => {
    const csv = ['display_name,property_type,latitude', 'Foo,APARTMENT,200'].join('\n');
    const result = parsePropertyCsv(csv);
    expect(result.errors[0].errors.some((e) => e.includes('latitude'))).toBe(true);
  });
});
