import { writeFile, unlink, mkdtemp, rmdir } from "fs/promises";
import { tmpdir } from "os";
import path, { join } from "path";
import { fileURLToPath } from "url";

import browserBuildConf from "../config/build.browser";

export async function $load(filepath: string, name: string = "default") {
  const resolved = path.resolve(
    filepath.startsWith("/") ? filepath : path.join(process.cwd(), filepath),
  );
  const loadedModule = await import(resolved);
  return loadedModule[name] || null;
}

export function $relative(targetPath: string, fromUrl: string = import.meta.url): string {
  // Convert URL to file path
  const fromFilePath = fileURLToPath(fromUrl);
  const fromDir = path.dirname(fromFilePath);

  // Resolve target path if it's relative
  const resolvedTarget = path.isAbsolute(targetPath)
    ? targetPath
    : path.resolve(fromDir, targetPath);

  // Return relative path
  return path.relative(fromDir, resolvedTarget);
}

interface BundleInlineOptions {
  loader: "js" | "jsx" | "ts" | "tsx";
  target?: "browser" | "node" | "bun";
  format?: "esm" | "cjs" | "iife";
  minify?: boolean;
}

export async function bundleInlineCode(
  code: string,
  options: BundleInlineOptions = { loader: "tsx" },
) {
  const extensions = {
    js: ".js",
    jsx: ".jsx",
    ts: ".ts",
    tsx: ".tsx",
  };

  // Create temp directory
  const tempDir = await mkdtemp(join(tmpdir(), "waavy"));
  const tempFile = join(tempDir, `bundle${extensions[options?.loader]}`);

  try {
    // Write code to temp file
    await writeFile(tempFile, code, "utf8");

    // Bundle it
    const result = await Bun.build({
      ...browserBuildConf,
      entrypoints: [tempFile],
    });

    if (!result.success) {
      throw new Error(`Bundle failed: ${result.logs.map((log) => log.message).join("\n")}`);
    }

    return result;
  } finally {
    // Cleanup temp files
    try {
      await unlink(tempFile);
      await rmdir(tempDir);
    } catch (cleanupError) {
      // Log but don't throw cleanup errors
      console.warn("Failed to cleanup temp files:", cleanupError);
    }
  }
}
