import { PasswordService } from './password.service';

describe('PasswordService', () => {
  const service = new PasswordService();

  it('hashes and verifies a correct password', async () => {
    const hash = await service.hash('Str0ngPassphrase');
    expect(hash).not.toContain('Str0ngPassphrase');
    expect(await service.verify(hash, 'Str0ngPassphrase')).toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await service.hash('Str0ngPassphrase');
    expect(await service.verify(hash, 'wrong-password')).toBe(false);
  });

  it('returns false for a malformed hash instead of throwing', async () => {
    expect(await service.verify('not-a-real-hash', 'anything')).toBe(false);
  });
});
