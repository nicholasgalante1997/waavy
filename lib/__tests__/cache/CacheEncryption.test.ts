import { test, expect, describe, beforeAll } from "bun:test";
import { SecureEncryption } from "@/cli/RenderAction/models/CacheEncryption";

describe("SecureEncryption (AES-256-GCM)", () => {
  const testCases = [
    { name: "simple string", input: "Hello, World!" },
    { name: "empty string", input: "" },
    { name: "unicode characters", input: "🚀 Hello 世界! 🌍" },
    { name: "long text", input: "A".repeat(1000) },
    {
      name: "json data",
      input: JSON.stringify({ key: "value", number: 42, array: [1, 2, 3] }),
    },
    { name: "special characters", input: "!@#$%^&*()_+-=[]{}|;':\",./<>?" },
    { name: "multiline text", input: "Line 1\nLine 2\r\nLine 3\tTabbed" },
  ];

  test.each(testCases)(
    "should encrypt and decrypt $name",
    async ({ input }) => {
      const password = "test-password-123";

      const encrypted = await SecureEncryption.encrypt(input, password);
      expect(encrypted).toBeTypeOf("string");
      expect(encrypted.length).toBeGreaterThan(0);
      expect(encrypted).not.toBe(input);

      const decrypted = await SecureEncryption.decrypt(encrypted, password);
      expect(decrypted).toBe(input);
    },
  );

  test("should produce different ciphertexts for same input", async () => {
    const input = "Same input text";
    const password = "same-password";

    const encrypted1 = await SecureEncryption.encrypt(input, password);
    const encrypted2 = await SecureEncryption.encrypt(input, password);

    expect(encrypted1).not.toBe(encrypted2);

    const decrypted1 = await SecureEncryption.decrypt(encrypted1, password);
    const decrypted2 = await SecureEncryption.decrypt(encrypted2, password);

    expect(decrypted1).toBe(input);
    expect(decrypted2).toBe(input);
  });

  test("should fail with wrong password", async () => {
    const input = "Secret message";
    const correctPassword = "correct-password";
    const wrongPassword = "wrong-password";

    const encrypted = await SecureEncryption.encrypt(input, correctPassword);

    await expect(
      SecureEncryption.decrypt(encrypted, wrongPassword),
    ).rejects.toThrow();
  });

  test("should fail with corrupted data", async () => {
    const input = "Secret message";
    const password = "test-password";

    const encrypted = await SecureEncryption.encrypt(input, password);

    // Corrupt the encrypted data by changing a character
    const corruptedEncrypted = encrypted.slice(0, -5) + "XXXXX";

    await expect(
      SecureEncryption.decrypt(corruptedEncrypted, password),
    ).rejects.toThrow();
  });

  test("should fail with invalid base64", async () => {
    const password = "test-password";
    const invalidData = "not-valid-base64!@#$";

    await expect(
      SecureEncryption.decrypt(invalidData, password),
    ).rejects.toThrow();
  });

  test("should fail with truncated data", async () => {
    const input = "Secret message";
    const password = "test-password";

    const encrypted = await SecureEncryption.encrypt(input, password);
    const truncated = encrypted.slice(0, encrypted.length / 2);

    await expect(
      SecureEncryption.decrypt(truncated, password),
    ).rejects.toThrow();
  });

  test("should handle different password types", async () => {
    const input = "Test message";
    const passwords = [
      "simple",
      "with spaces and symbols!@#",
      "unicode-密码-🔐",
      "very-long-password-".repeat(10),
      "1234567890",
    ];

    for (const password of passwords) {
      const encrypted = await SecureEncryption.encrypt(input, password);
      const decrypted = await SecureEncryption.decrypt(encrypted, password);
      expect(decrypted).toBe(input);
    }
  });
});

describe("Performance and edge cases", () => {
  test("should handle large data efficiently", async () => {
    const largeInput = "Large data test ".repeat(10000); // ~150KB
    const password = "performance-test-password";

    const startTime = performance.now();
    const encrypted = await SecureEncryption.encrypt(largeInput, password);
    const encryptTime = performance.now() - startTime;

    const decryptStartTime = performance.now();
    const decrypted = await SecureEncryption.decrypt(encrypted, password);
    const decryptTime = performance.now() - decryptStartTime;

    expect(decrypted).toBe(largeInput);
    expect(encryptTime).toBeLessThan(1000); // Should complete within 1 second
    expect(decryptTime).toBeLessThan(1000);
  });

  test("should handle concurrent operations", async () => {
    const input = "Concurrent test message";
    const password = "concurrent-password";

    const promises = Array.from({ length: 10 }, async (_, i) => {
      const testInput = `${input} ${i}`;
      const encrypted = await SecureEncryption.encrypt(testInput, password);
      const decrypted = await SecureEncryption.decrypt(encrypted, password);
      return { original: testInput, decrypted };
    });

    const results = await Promise.all(promises);

    results.forEach(({ original, decrypted }) => {
      expect(decrypted).toBe(original);
    });
  });

  test("should handle binary-like data", async () => {
    // Create some binary-like data as string
    const binaryLikeData = Array.from({ length: 256 }, (_, i) =>
      String.fromCharCode(i),
    ).join("");

    const password = "binary-test-password";

    const encrypted = await SecureEncryption.encrypt(binaryLikeData, password);
    const decrypted = await SecureEncryption.decrypt(encrypted, password);

    expect(decrypted).toBe(binaryLikeData);
  });
});
