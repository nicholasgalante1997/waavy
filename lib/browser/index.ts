import { $relative, bundleInlineCode } from "@/utils";

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
  selector?: string;
}

export async function createHydrationBundle(options: CreateHydrationBundleOptions) {
  const code = template(options.pathToFile, options?.import, options?.props, options?.selector);
  const result = await bundleInlineCode(code, { loader: "tsx" });
  if (result.success) {
    return result.outputs.map((output) => output);
  }
  return null;
}

function template<Props extends React.JSX.IntrinsicAttributes = Record<string, unknown>>(
  pathToFile: string,
  name: "default" | string = "default",
  props?: Props,
  selector: string = "#app",
) {
  return `import React from 'react';
  import { hydrateRoot } from 'react-dom/client';
  import ${name === "default" ? "App" : `{ ${name} }`} from '${$relative(pathToFile)}';

  const element = document.querySelector('${selector}');
  const props = JSON.parse("${JSON.stringify(props)}");
  hydrateRoot(element, <${name === "default" ? "App" : name} {...props} />);
  `;
}
