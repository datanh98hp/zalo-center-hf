import { decryptJson, encryptJson } from './secret-box';
describe('integration secret encryption', () => {
  const old = process.env.INTEGRATION_ENCRYPTION_KEY;
  beforeEach(() => { process.env.INTEGRATION_ENCRYPTION_KEY = 'ab'.repeat(32); });
  afterAll(() => { if (old === undefined) delete process.env.INTEGRATION_ENCRYPTION_KEY; else process.env.INTEGRATION_ENCRYPTION_KEY = old; });
  it('round-trips credentials without storing plaintext', () => {
    const secret = { accessToken: 'super-secret', refreshToken: 'refresh-secret' };
    const encoded = encryptJson(secret);
    expect(encoded).not.toContain('super-secret');
    expect(decryptJson<typeof secret>(encoded)).toEqual(secret);
  });
  it('rejects tampered ciphertext', () => {
    const encoded = encryptJson({ token: 'a' });
    expect(() => decryptJson(encoded.slice(0, -2) + 'xx')).toThrow();
  });
});
