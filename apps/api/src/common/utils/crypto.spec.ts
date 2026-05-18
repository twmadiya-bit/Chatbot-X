import { encrypt, decrypt } from './crypto';

const KEY = 'test-key-for-unit-tests';
const ALT_KEY = 'different-key';

describe('crypto utils', () => {
  describe('encrypt / decrypt roundtrip', () => {
    it('recovers the original plaintext', () => {
      const plain = 'hello world';
      expect(decrypt(encrypt(plain, KEY), KEY)).toBe(plain);
    });

    it('handles empty string', () => {
      expect(decrypt(encrypt('', KEY), KEY)).toBe('');
    });

    it('handles unicode and special characters', () => {
      const plain = 'Bearer sk-ant-🔑 "special" & <chars>';
      expect(decrypt(encrypt(plain, KEY), KEY)).toBe(plain);
    });

    it('handles long payloads (JSON credentials)', () => {
      const plain = JSON.stringify({ shop: 'acme.myshopify.com', api_key: 'x'.repeat(200) });
      expect(decrypt(encrypt(plain, KEY), KEY)).toBe(plain);
    });
  });

  describe('ciphertext properties', () => {
    it('produces different ciphertext for the same plaintext each time (random IV)', () => {
      const c1 = encrypt('same', KEY);
      const c2 = encrypt('same', KEY);
      expect(c1).not.toBe(c2);
    });

    it('decrypting with the wrong key throws', () => {
      const ciphertext = encrypt('secret', KEY);
      expect(() => decrypt(ciphertext, ALT_KEY)).toThrow();
    });

    it('decrypting tampered ciphertext throws (auth tag check)', () => {
      const ciphertext = encrypt('secret', KEY);
      const tampered = ciphertext.slice(0, -4) + 'XXXX';
      expect(() => decrypt(tampered, KEY)).toThrow();
    });
  });
});
