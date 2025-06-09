interface ServerContext {}

interface CreateHydrationBundleOptions<Props = {}> {
  /**
   * An absolute or relative path to the file to load the Component from
   */
  pathToFile: string;

  /**
   * The name of the module to import
   * @default 'default'
   */
  import?: "default" | string;

  loaders?: {
    props?: (ctx?: ServerContext, request?: Request) => Props | Promise<Props>;
  };
}

export async function createHydrationBundle(options: CreateHydrationBundleOptions) {
  const pathToFile = options?.pathToFile;
}
