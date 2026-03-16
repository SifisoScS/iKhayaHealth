const crypto = require('crypto');
const EncryptionService = require('../../security/encryption/aes');

describe('EncryptionService', () => {
  let service;

  beforeEach(() => {
    // Use a fixed 32-byte key for deterministic tests
    const key = crypto.randomBytes(32);
    service = new EncryptionService(key);
  });

  test('encrypts and decrypts a string correctly', () => {
    const plaintext = 'Sipho Dlamini';
    const { encrypted, iv, authTag } = service.encrypt(plaintext);

    expect(encrypted).not.toBe(plaintext);
    const decrypted = service.decrypt(encrypted, iv, authTag);
    expect(decrypted).toBe(plaintext);
  });

  test('produces different ciphertext for the same input (unique IVs)', () => {
    const plaintext = 'Nompumelelo Zulu';
    const first = service.encrypt(plaintext);
    const second = service.encrypt(plaintext);

    expect(first.encrypted).not.toBe(second.encrypted);
    expect(first.iv).not.toBe(second.iv);
  });

  test('throws when decrypting with wrong authTag', () => {
    const { encrypted, iv } = service.encrypt('test data');
    const wrongTag = crypto.randomBytes(16).toString('hex');
    expect(() => service.decrypt(encrypted, iv, wrongTag)).toThrow();
  });

  test('throws when decrypting with wrong IV', () => {
    const { encrypted, authTag } = service.encrypt('test data');
    const wrongIv = crypto.randomBytes(16).toString('hex');
    expect(() => service.decrypt(encrypted, wrongIv, authTag)).toThrow();
  });
});
