export type BundleOptions = {
  dir?: string;
  file?: string;
  out?: string;
  clean?: boolean;
  configuration?: Partial<Bun.BuildConfig>;
};

export type BundleAction = (
  options: Omit<BundleOptions, "configuration">,
) => Promise<void>;
