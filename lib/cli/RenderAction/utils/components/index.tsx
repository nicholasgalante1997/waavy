import React from "react";
import path from "path";
import {
  ComponentNotFoundError,
  InvalidExtensionError,
  PropDataLoaderException,
} from "@/errors";
import { load, logger } from "@/utils";
import type { LoaderFn, RenderActionOptions } from "@/types";

export function validateComponentExtension(pathToComponent: string) {
  /**
   * Pre (Validation)
   *
   * Ensure we can load/parse the provided file.
   *
   * This function throws an InvalidExtensionError if the file to be loaded is not one of
   * [js, jsx, ts, tsx]
   */
  const extension = path.extname(pathToComponent).replace(".", "");
  if (!["js", "ts", "jsx", "tsx"].includes(extension)) {
    throw new InvalidExtensionError(
      "[waavy::renderAction::validateComponentExtension]: An Exception was thrown: Invalid file extension - " +
        extension,
    );
  }
}

export async function loadComponent(
  pathToComponent: string,
  name?: string,
): Promise<React.ComponentType<any>> {
  /**
   * 1. Component Loading from Local Filesystem
   */
  const Component = await load(pathToComponent, name);
  if (Component == null) {
    throw new ComponentNotFoundError(pathToComponent, name || "default");
  }
  return Component as React.ComponentType<any>;
}

/**
 * 2. Re-use provided path to load any potential Waavy module (loaders).
 */
export async function getWaavyModules(
  pathToFile: string,
  options?: RenderActionOptions,
) {
  const waavyFileModules = await load(pathToFile, "waavy");
  if (waavyFileModules == null) {
    /** Not using `waavy` exports pattern */
    options?.verbose &&
      logger.extend("warn")(
        "%s is not using `waavy` exports modules.",
        pathToFile,
      );

    return null;
  }

  return waavyFileModules;
}

export async function getComponentProps<Props extends {} = {}>(
  pathToComponent: string,
  options: RenderActionOptions,
) {
  const waavyFileModules = await getWaavyModules(pathToComponent, options);

  let props = getPropsFromOptions(options); /** Initial or default props */
  const tprops =
    structuredClone(
      props,
    ); /** Backup copy in case we corrupt props in the loader phase */

  try {
    /** Try to fetch any per request props */
    props = await fetchLoaderProvProps(
      waavyFileModules,
      props,
      options.request,
    );
  } catch (e) {
    options.verbose &&
      logger.extend("error")(
        e instanceof PropDataLoaderException ? e?.message : e,
      );

    /** Reassign to safe copy */
    props = tprops;
  }

  return props as Props;
}

/**
 * Loads props from options or sets props to the default value, an empty object.
 */
export function getPropsFromOptions(
  options: RenderActionOptions,
): Record<string, unknown> {
  options.props ||= {};
  return typeof options?.props === "string"
    ? JSON.parse(options?.props)
    : options.props;
}

export function getWaavyRenderContext(request?: Partial<Request>) {
  return {};
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
