import { flagContent } from './content-flagging';

describe('content flagging heuristics', () => {
  it('flags phone numbers', () => {
    const flags = flagContent({ comments: 'Call me on +91 98765 43210 anytime' });
    expect(flags.some((f) => f.category === 'PHONE_NUMBER')).toBe(true);
  });

  it('flags emails', () => {
    const flags = flagContent({ dislikedText: 'Reach the owner at owner@example.com' });
    expect(flags.some((f) => f.category === 'EMAIL')).toBe(true);
  });

  it('flags government IDs (PAN, Aadhaar)', () => {
    const flags = flagContent({ comments: 'His PAN is ABCDE1234F and Aadhaar 1234 5678 9012' });
    expect(flags.filter((f) => f.category === 'GOVERNMENT_ID').length).toBeGreaterThanOrEqual(2);
  });

  it('flags apartment/door numbers', () => {
    const flags = flagContent({ comments: 'They live in Flat 4B of the tower' });
    expect(flags.some((f) => f.category === 'STREET_ADDRESS')).toBe(true);
  });

  it('flags threats and unsupported criminal allegations', () => {
    const flags = flagContent({
      dislikedText: 'The landlord is a criminal and said he will hurt you',
    });
    expect(flags.some((f) => f.category === 'UNSUPPORTED_ALLEGATION')).toBe(true);
    expect(flags.some((f) => f.category === 'THREAT')).toBe(true);
  });

  it('does NOT flag an ordinary negative review (no false censorship)', () => {
    const flags = flagContent({
      dislikedText: 'Maintenance was slow and the deposit took three months to come back.',
      comments: 'Would not rent again, but the location is good.',
    });
    expect(flags).toHaveLength(0);
  });

  it('returns no flags for empty input', () => {
    expect(flagContent({})).toHaveLength(0);
  });
});
