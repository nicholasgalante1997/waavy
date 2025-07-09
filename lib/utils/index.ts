import path from "path";

export async function load(filepath: string, name: string = "default") {
  const resolved = path.resolve(
    filepath.startsWith("/") ? filepath : path.join(process.cwd(), filepath),
  );
  const loadedModule = await import(resolved);
  return loadedModule[name] || null;
}

export const noop = () => {};

export * from "./log";
export * from "./numbers";
export * from "./objects";
export * from "./pkg";
export * from "./telemetry";
