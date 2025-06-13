import path from "path";
import { fileURLToPath } from "url";

export async function $load(filepath: string, name: string = "default") {
  const resolved = path.resolve(
    filepath.startsWith("/") ? filepath : path.join(process.cwd(), filepath),
  );
  const loadedModule = await import(resolved);
  return loadedModule[name] || null;
}

export function $relative(
  targetPath: string,
  fromUrl: string = import.meta.url,
): string {
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
