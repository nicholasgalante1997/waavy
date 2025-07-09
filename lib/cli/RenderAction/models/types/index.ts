import type {
  CacheEntry,
  CacheEntryWithRenderOutput,
} from "../../utils/cache/types";

export default interface IRenderCache {
  [Symbol.dispose](): void;
  cache(cacheableRenderOutput: string): Promise<boolean>;
  find(): Promise<CacheEntry | null>;
  delete(ce: CacheEntry): Promise<boolean>;
}
