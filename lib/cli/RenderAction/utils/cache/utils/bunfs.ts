import fs from "fs/promises";
import path from "path";
import { DEFAULT_WAAVY_RENDER_CACHE_FILEPATH } from "@/constants";
import type { CacheEntry, ComponentRepresentation } from "../types";
import { abtosab } from "./buffers";
import { buffersAreEqual, deserialize } from "./serde";

/**
 * Creates a normalized directory name,
 * from component representation using SHA256 hash
 *
 * Format: hash of "resolved_path::component_name"
 */
export function cacheDirname([
  pathToComponent,
  componentName,
]: ComponentRepresentation): string {
  return new Bun.CryptoHasher("sha256")
    .update(path.resolve(pathToComponent).concat("::", componentName))
    .digest("hex");
}

/**
 * Gets the full path to the cache directory for a specific component
 */
export function getPathToCachedRenderEntries(
  componentRep: ComponentRepresentation,
): string {
  return path.resolve(
    process.cwd(),
    DEFAULT_WAAVY_RENDER_CACHE_FILEPATH,
    cacheDirname(componentRep),
  );
}

/**
 * Checks if cache entries exist for a given component representation
 * Returns array of cache entries or null if no cache exists
 */
export async function checkCacheForEntries(
  componentRep: ComponentRepresentation,
): Promise<CacheEntry[] | null> {
  const pathToCached = getPathToCachedRenderEntries(componentRep);
  const exists = await fs.exists(pathToCached);

  if (!exists) return null;

  const dirEntries = await fs.readdir(pathToCached, {
    encoding: "utf-8",
    withFileTypes: true,
  });

  const entryTracker: Record<string, Partial<CacheEntry>> = {};

  /**
   * Render Operation Cache Results have three components
   */
  for (const de of dirEntries) {
    const normalPath = path.resolve(de.parentPath, de.name);
    const extension = path.extname(de.name);
    const renderOutputId = de.name.replace(extension, "");

    if (!Object.getOwnPropertyNames(entryTracker).includes(renderOutputId)) {
      entryTracker[renderOutputId] = {
        id: renderOutputId,
      };
    }

    if (extension === ".json") {
      const metadata = await Bun.file(normalPath).json();
      entryTracker[renderOutputId] = {
        ...entryTracker[renderOutputId],
        createdAt: metadata?.createdAt || new Date(),
      };
    }

    if (extension === ".rout") {
      const renderOutputSerialized = await Bun.file(normalPath).arrayBuffer();
      const renderOutput = deserialize(abtosab(renderOutputSerialized));
      entryTracker[renderOutputId] = {
        ...entryTracker[renderOutputId],
        cachedRenderOutput: renderOutput,
      };
    }

    if (extension === ".pout") {
      const propsArrayBuffer = await Bun.file(normalPath).arrayBuffer();
      const propsNormalized = deserialize(abtosab(propsArrayBuffer));
      entryTracker[renderOutputId] = {
        ...entryTracker[renderOutputId],
        props: propsNormalized,
      };
    }
  }

  const cacheEntries = Object.values(entryTracker).filter(
    (pce) => pce.id && pce.cachedRenderOutput && pce.props !== undefined,
  );
  if (cacheEntries.length) return cacheEntries as CacheEntry[];

  return null;
}

/**
 * Finds a matching cache entry based on props comparison
 */
function findMatchInCachedEntries(
  matchPropsTo: SharedArrayBuffer,
  entries: CacheEntry[],
): CacheEntry | null {
  return (
    entries.find((cacheEntry) =>
      buffersAreEqual(matchPropsTo, cacheEntry.props),
    ) || null
  );
}
