import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { writeFile, mkdtemp, rmdir } from "fs/promises";
import { tmpdir } from "os";
import path, { join } from "path";
import { fileURLToPath } from "url";
import { $load, $relative, bundleInlineCode } from "@/utils"; // Adjust import path

describe("$load function", () => {
  let tempDir: string;
  let testFilePath: string;

  beforeEach(async () => {
    // Create temp directory for test files
    tempDir = await mkdtemp(join(tmpdir(), "test-load-"));
    testFilePath = join(tempDir, "test-module.mjs");
  });

  afterEach(async () => {
    // Cleanup temp directory
    try {
      await rmdir(tempDir, { recursive: true });
    } catch (error) {
      console.warn("Cleanup failed:", error);
    }
  });

  it("should load default export from absolute path", async () => {
    const testCode = 'export default { message: "hello world" };';
    await writeFile(testFilePath, testCode, "utf8");

    const result = await $load(testFilePath);
    expect(result).toEqual({ message: "hello world" });
  });

  it("should load named export", async () => {
    const testCode = 'export const myFunction = () => "test"; export default "default";';
    await writeFile(testFilePath, testCode, "utf8");

    const result = await $load(testFilePath, "myFunction");
    expect(typeof result).toBe("function");
    expect(result()).toBe("test");
  });

  it('should load default export when name is "default"', async () => {
    const testCode = 'export default { value: 42 }; export const other = "other";';
    await writeFile(testFilePath, testCode, "utf8");

    const result = await $load(testFilePath, "default");
    expect(result).toEqual({ value: 42 });
  });

  it("should return null for non-existent named export", async () => {
    const testCode = 'export default "test";';
    await writeFile(testFilePath, testCode, "utf8");

    const result = await $load(testFilePath, "nonExistent");
    expect(result).toBeNull();
  });

  it("should handle relative paths from cwd", async () => {
    // Create file relative to cwd
    const relativePath = path.relative(process.cwd(), testFilePath);
    const testCode = 'export default "relative test";';
    await writeFile(testFilePath, testCode, "utf8");

    const result = await $load(relativePath);
    expect(result).toBe("relative test");
  });

  it("should throw error for non-existent file", async () => {
    const nonExistentPath = join(tempDir, "does-not-exist.mjs");

    await expect($load(nonExistentPath)).rejects.toThrow();
  });

  it("should handle modules with syntax errors", async () => {
    const invalidCode = "export default { invalid syntax here";
    await writeFile(testFilePath, invalidCode, "utf8");

    await expect($load(testFilePath)).rejects.toThrow();
  });
});

describe("$relative function", () => {
  it("should return relative path from current file by default", () => {
    const targetPath = "/some/absolute/path/file.js";
    const result = $relative(targetPath);

    // Should return a relative path (will vary based on test file location)
    expect(typeof result).toBe("string");
    expect(result).not.toBe(targetPath); // Should be different from absolute path
  });

  it("should return relative path from specified URL", () => {
    const targetPath = "/project/src/utils/helper.js";
    const fromUrl = "file:///project/src/components/Component.js";

    const result = $relative(targetPath, fromUrl);
    expect(result).toBe("../utils/helper.js");
  });

  it("should handle relative target paths", () => {
    const targetPath = "./config/settings.js";
    const fromUrl = "file:///project/src/index.js";

    const result = $relative(targetPath, fromUrl);
    expect(typeof result).toBe("string");
    expect(result.includes("config/settings.js")).toBe(true);
  });

  it("should handle same directory paths", () => {
    const targetPath = "/project/src/file.js";
    const fromUrl = "file:///project/src/index.js";

    const result = $relative(targetPath, fromUrl);
    expect(result).toBe("file.js");
  });

  it("should handle parent directory navigation", () => {
    const targetPath = "/project/file.js";
    const fromUrl = "file:///project/src/components/Component.js";

    const result = $relative(targetPath, fromUrl);
    expect(result).toBe("../../file.js");
  });

  it("should handle Windows-style paths on Windows", () => {
    // This test will behave differently on different platforms
    // but ensures the function doesn't crash with various path formats
    const targetPath = path.resolve("/test/path/file.js");
    const fromUrl = fileURLToPath(import.meta.url);

    const result = $relative(targetPath, `file://${fromUrl}`);
    expect(typeof result).toBe("string");
  });
});

describe("Module integration", () => {
  it("should export all expected functions", () => {
    expect(typeof $load).toBe("function");
    expect(typeof $relative).toBe("function");
    expect(typeof bundleInlineCode).toBe("function");
  });
});
