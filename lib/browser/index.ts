import { $relative } from "@/utils";

interface ServerContext {}

interface CreateHydrationBundleOptions<Props = Record<string, unknown>> {
  /**
   * An absolute or relative path to the file to load the Component from
   */
  pathToFile: string;

  /**
   * The name of the module to import
   * @default 'default'
   */
  import?: "default" | string;
  props?: Props;
  loaders?: {
    props?: (ctx?: ServerContext, request?: Request) => Props | Promise<Props>;
  };
}

export async function createHydrationBundle(options: CreateHydrationBundleOptions) {

}

function template<Props extends React.JSX.IntrinsicAttributes = Record<string, unknown>>(pathToFile: string, name?: 'default' | string = 'default', props?: Props) {
  return `import React from 'react';
  import { hydrateRoot } from 'react-dom/client';
  import ${name === 'default' ? 'App' : `{ ${name} }`} from '${$relative(pathToFile)}';

  const props = JSON.parse("${JSON.stringify(props)}");
  hydrateRoot();
  `
}