import path from "path";
import pkg from "@pkg/metadata";

export async function load(filepath: string, name: string = "default") {
  const resolved = path.resolve(
    filepath.startsWith("/") ? filepath : path.join(process.cwd(), filepath),
  );
  const loadedModule = await import(resolved);
  return loadedModule[name] || null;
}

export function getVersion() {
  return getPackageMetadata("version");
}

export function getPackageMetadata(field?: keyof typeof pkg) {
  if (!field) {
    return pkg;
  }

  if (field in pkg) {
    return pkg[field];
  }

  return null;
}

export function objectIsEmpty<O extends object = {}>(o: O) {
  return (
    Object.keys(o).length === 0 &&
    Object.values(o).length === 0 &&
    Object.getOwnPropertyNames(o).length === 0
  );
}
