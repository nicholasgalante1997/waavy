import type { RenderActionOptions } from "@/types";
import { createDeterministicStructure } from "@/utils";

import type {
  CacheEntry,
  CacheEntryWithRenderOutput,
} from "../utils/cache/types";

import CacheEncryption from "./CacheEncryption";
import CacheSerializer from "./CacheSerializer";
import CacheBunFs from "./CacheBunFs";
import CacheBunSqlite3 from "./CacheSqlite3";

type CacheType = Exclude<RenderActionOptions["cacheType"], undefined>;

type CacheManagerConstructorOptions = {
  type: CacheType;
  key: string;
  component: {
    name: string;
    path: string;
    props: unknown;
  };
};

export default class CacheManager {
  private static _header_cache = new Map<string, Set<string>>();
  private static _enc_keys = new Map();

  private id: string;
  private type: CacheType;
  private cpath: string;
  private cname: string;
  private cprops: unknown;
  private cacheKey: string;

  constructor(options: CacheManagerConstructorOptions) {
    this.id = Bun.randomUUIDv7();
    this.type = options.type;
    this.cacheKey = options.key;
    this.cname = options.component.name;
    this.cpath = options.component.path;
    this.cprops = options.component.props;
  }

  public static isInCache(cpath: string, cname: string, props: unknown) {
    /**
     * isInCache should not have to be o(n) because in such a case,
     * we should just call find() and perform a single operation.
     * However, if isInCache can be o(1) then it's a negligible check.
     *
     * Use a Map that cacheManagers have shared access to (Some singleton context)
     * to store a hash of the cname,cpath,cprops
     * convert cprops to deterministic structure
     */
    if (!CacheSerializer.serializable(props)) return false;
    if (typeof props !== "object") return false;

    return Boolean(
      CacheManager._header_cache
        .get(CacheManager.createHeaderCacheKey(cpath, cname))
        ?.has(CacheManager.transformPropsToDeterministicString(props)),
    );
  }

  private static createHeaderCacheKey(cpath: string, cname: string) {
    return CacheEncryption.sha256Hash(cpath.concat("::", cname));
  }

  private static transformPropsToDeterministicString(props: unknown) {
    return CacheEncryption.sha256Hash(
      JSON.stringify(createDeterministicStructure(props as object)),
    );
  }

  async cache(renderOutput: string) {
    const cacheEntry = this.createCacheEntryWithRenderOutput(renderOutput);
    if (cacheEntry) {
      using _cache =
        this.type === "bunfs"
          ? new CacheBunFs(cacheEntry)
          : new CacheBunSqlite3(cacheEntry);
      const didCache = await _cache.cache(cacheEntry.cachedRenderOutput);
      if (didCache) {
        this.addToHeaderCache();
      }
    }
  }

  async find(): Promise<CacheEntryWithRenderOutput | null> {
    const cacheEntry = this.createCacheEntry();
    if (cacheEntry) {
      using _cache =
        this.type === "bunfs"
          ? new CacheBunFs(cacheEntry)
          : new CacheBunSqlite3(cacheEntry);

      const found = await _cache.find();
      if (found) return found;
    }
    return null;
  }

  private createCacheEntryWithRenderOutput(
    cacheableRenderOutput: string,
  ): CacheEntryWithRenderOutput | null {
    if (!CacheSerializer.serializable(this.cprops)) return null;
    const timestamp = new Date();
    const id = Bun.randomUUIDv7("hex", timestamp);
    return {
      id: id,
      cname: this.cname,
      cpath: this.cpath,
      createdAt: timestamp,
      cachedRenderOutput: cacheableRenderOutput,
      props: JSON.stringify(this.cprops),
      cacheKey: this.cacheKey,
    };
  }

  private createCacheEntry(): CacheEntry | null {
    if (!CacheSerializer.serializable(this.cprops)) return null;
    const timestamp = new Date();
    const id = Bun.randomUUIDv7("hex", timestamp);
    return {
      id: id,
      cname: this.cname,
      cpath: this.cpath,
      createdAt: timestamp,
      props: JSON.stringify(this.cprops),
      cacheKey: this.cacheKey,
    };
  }

  private addToHeaderCache(): boolean {
    if (!CacheSerializer.serializable(this.cprops)) return false;

    const key = CacheManager.createHeaderCacheKey(this.cpath, this.cname);
    if (!CacheManager._header_cache.has(key)) {
      CacheManager._header_cache.set(key, new Set());
    }

    const value = CacheManager.transformPropsToDeterministicString(this.cprops);
    CacheManager._header_cache.get(key)!.add(value);
    return true;
  }
}
