import path from "path";
import {
  ComponentNotFoundError,
  InvalidExtensionError,
  PropDataLoaderException,
} from "@/errors";
import { load } from "@/utils";
import type { LoaderFn, RenderActionOptions } from "@/types";

export function validateComponentExtension(pathToComponent: string) {
  const extension = path.extname(pathToComponent).replace(".", "");
  if (!["js", "ts", "jsx", "tsx"].includes(extension)) {
    throw new InvalidExtensionError(
      "[waavy::renderAction::validateComponentExtension]: An Exception was thrown: Invalid file extension - " +
        extension,
    );
  }
}

/**
 * TODO figure out like what we're gonna do about this.
 */
type ComponentType<Props> = any;

export async function loadComponent<Props = {}>(
  pathToComponent: string,
  name?: string,
): Promise<ComponentType<Props>> {
  const Component = await load(pathToComponent, name);
  if (Component == null) {
    throw new ComponentNotFoundError(pathToComponent, name || "default");
  }
  return Component as ComponentType<Props>;
}

export async function getWaavyModules(pathToFile: string) {
  const waavyFileModules = await load(pathToFile, "waavy");

  if (waavyFileModules == null) {
    return null;
  }

  return waavyFileModules;
}

export async function getComponentProps<Props extends {} = {}>(
  pathToComponent: string,
  options: RenderActionOptions,
) {
  const waavyFileModules = await getWaavyModules(pathToComponent);

  let props = getPropsFromOptions(options);
  const tprops = structuredClone(props);

  try {
    props = await fetchLoaderProvProps(
      waavyFileModules,
      props,
      options.request,
    );
  } catch (e) {
    return tprops as Props;
  }

  return props as Props;
}

export function getPropsFromOptions(
  options: RenderActionOptions,
): Record<string, unknown> {
  options.props ||= {};
  try {
    return typeof options?.props === "string"
      ? JSON.parse(options?.props)
      : options.props;
  } catch (e) {
    return {};
  }
}

export function getWaavyRenderContext(request?: Partial<Request>) {
  return {
    path: request?.url ? new URL(request.url).pathname : null,
    search: request?.url ? new URL(request.url).searchParams : null,
    method: request?.method ?? null,
  };
}

export async function fetchLoaderProvProps<Props extends {} = {}>(
  waavyFileModules: any,
  props: Props,
  request: Partial<Request> = {},
) {
  if (
    waavyFileModules &&
    "dataLoader" in waavyFileModules &&
    typeof waavyFileModules?.dataLoader === "function"
  ) {
    try {
      const loader = waavyFileModules?.dataLoader as LoaderFn<typeof props>;
      const loaderResult = await Promise.resolve(
        await loader(request, getWaavyRenderContext()),
      );
      if (
        loaderResult &&
        loaderResult?.data &&
        typeof loaderResult?.data === "object"
      ) {
        props = { ...props, ...loaderResult?.data };
      }
    } catch (e) {
      throw e instanceof Error ? e : new PropDataLoaderException(String(e));
    }
  }

  return props as Props;
}
