export type BundleOptions = {
  dir?: string;
  out?: string;
  clean?: boolean;
  config?: Partial<Bun.BuildConfig>;
  verbose?: boolean;
  dryRun?: boolean;
};

export type BundleAction = (options: BundleOptions) => Promise<void>;
