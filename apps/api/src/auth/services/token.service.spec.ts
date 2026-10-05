import { parseDurationMs } from './token.service';

describe('parseDurationMs', () => {
  it.each([
    ['900s', 900_000],
    ['15m', 900_000],
    ['12h', 43_200_000],
    ['30d', 2_592_000_000],
    ['1000', 1_000_000],
  ])('parses %s', (input, expected) => {
    expect(parseDurationMs(input)).toBe(expected);
  });

  it('throws on garbage input', () => {
    expect(() => parseDurationMs('abc')).toThrow();
  });
});
