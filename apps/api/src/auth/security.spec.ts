import { hashPassword, verifyPassword, issueToken, verifyToken } from './security';

describe('security helpers', () => {
  it('hashes and verifies password without storing plaintext', async () => {
    const encoded = await hashPassword('a-very-long-test-password');
    expect(encoded).not.toContain('a-very-long-test-password');
    await expect(verifyPassword('a-very-long-test-password', encoded)).resolves.toBe(true);
    await expect(verifyPassword('incorrect-password', encoded)).resolves.toBe(false);
  });

  it('rejects passwords shorter than 12 chars', async () => {
    await expect(hashPassword('short')).rejects.toThrow();
  });

  it('issues and validates signed tokens', () => {
    const token = issueToken({ sub: 'u1', tenantId: 't1', role: 'ADMIN' }, 'x'.repeat(48));
    expect(verifyToken(token, 'x'.repeat(48))?.sub).toBe('u1');
    expect(verifyToken(token, 'y'.repeat(48))).toBeNull();
  });

  it('rejects malformed tokens', () => {
    expect(verifyToken('not-a-token', 'x'.repeat(48))).toBeNull();
  });
});
