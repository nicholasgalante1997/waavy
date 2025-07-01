import fs from "fs/promises";
import type { SerializableObject } from "@/types";
import { serialize } from "./utils/serde";
import type { CacheEntry, WriteEntryToCacheOptions } from "./types";
import { getPathToCachedRenderEntries } from "./utils/bunfs";

function createCacheEntry<Props extends SerializableObject = {}>(
  renderOutput: string,
  props: Props,
): CacheEntry {
  const timestamp = new Date();
  const id = Bun.randomUUIDv7("hex", timestamp);
  return {
    id,
    cachedRenderOutput: serialize(renderOutput),
    props: serialize(props),
    createdAt: new Intl.DateTimeFormat("em-US", {
      dateStyle: "full",
      timeStyle: "long",
      timeZone: "America/Denver",
    }).format(timestamp),
  };
}

/**
 * Writes a new cache entry for the given component and props
 */
export async function writeEntryToCache<Props extends SerializableObject>(
  options: WriteEntryToCacheOptions<Props>,
): Promise<void> {
  const { cacheType } = options;

  if (cacheType === "bunfs") {
    await handleWriteEntryToBunFsCache(options);
  } else if (cacheType === "sqlite3") {
    await handleWriteEntryToSqlite3DbCache(options);
  }

  // TODO: Implement cache writing logic
  // - Ensure directory exists
  // - Generate unique ID for cache entry
  // - Serialize props and render output
  // - Write metadata and cache files
}

async function handleWriteEntryToBunFsCache<Props extends SerializableObject>(
  options: WriteEntryToCacheOptions<Props>,
) {
  const cacheDirPath = getPathToCachedRenderEntries(
    options.componentRepresentation,
  );

  if (!(await fs.exists(cacheDirPath))) {
    await fs.mkdir(cacheDirPath, { recursive: true });
  }

  const ce = createCacheEntry(options.renderOutput, options.props);
}

async function handleWriteEntryToSqlite3DbCache<
  Props extends SerializableObject,
>(options: WriteEntryToCacheOptions<Props>) {}

// ============================================================================
// Cache Strategy Notes
// ============================================================================

/**
 * Cache Strategy:
 *
 * We need a unique identifier that associates a props object as a blob to a rendered Component.
 *
 * Approach:
 * - Hash of [normalized path to file, name of component] as containing directory
 * - If that directory exists, we can stamp a timestamp that the rendered markup & its props share
 * - Or use a UUID (doesn't matter which approach)
 *
 * File structure:
 * - uuid.metadata.json - { ... }
 * - uuid.prout
 * - uuid.crout
 */
