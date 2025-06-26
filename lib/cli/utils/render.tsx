import React from "react";
import type { RenderToReadableStreamOptions } from "react-dom/server";
import fs from "fs";
import path from "path";
import {
  DEFAULT_WAAVY_PROPS_CACHE_KEY,
  DEFAULT_WAAVY_HYDRATION_SELECTOR,
} from "@/constants";
import {
  ComponentNotFoundError,
  InvalidExtensionError,
  PropDataLoaderException,
} from "@/errors";
import PropDataLoaderError from "@/errors/PropDataLoader";
import {
  pipeComponentToNodeStream,
  transformComponentToString,
} from "@/server";
import type { LoaderFn, RenderActionOptions } from "@/types";
import { asOptionalNumber, getVersion, load, logger } from "@/utils";

type HydraWindowAssignmentScriptOptions<Props> = {
  props: Props;
  propsCacheKey?: string;
  selector?: string;
};

type CreateRenderOptionsConfig = {
  bootstrap?: string[];
  ErrorComponent?: React.ComponentType<{ error: unknown }> | null;
  errorPage?: string;
  raOptions?: RenderActionOptions;
  signal?: AbortController["signal"];
  timeout?: NodeJS.Timeout;
  timeoutFired?: boolean;
  waavyScriptContent?: string;
};

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
      "[renderAction]: An Exception was thrown: Invalid file extension - " +
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
  const waavyFileModules = getWaavyModules(pathToComponent, options);

  /**
   * 3. Generate Props
   */
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

/**
 * 4. Create a client side window assignment script
 * This is useful to props can remain equal across the server render
 * and the client side hydration render.
 */
export function createWindowAssignmentInlineScript<Props>(
  options: HydraWindowAssignmentScriptOptions<Props>,
) {
  return (
    "window.waavy = {};" +
    `window.waavy.version = ${getVersion()};` +
    "window.waavy.keys = {};" +
    `window.waavy.keys.pcache = "${options.propsCacheKey || DEFAULT_WAAVY_PROPS_CACHE_KEY}";` +
    `window.waavy.keys.domselector = "${options.selector || DEFAULT_WAAVY_HYDRATION_SELECTOR}";` +
    `window[window.waavy.keys.pcache] = ${JSON.stringify(options.props)};` +
    `window.waavy.__$stash__.props = ${JSON.stringify(options.props)};`
  );
}

export async function getErrorComponentOrNull(
  errorComponentPath?: string,
  errorComponentName?: string,
  options?: RenderActionOptions,
): Promise<React.ComponentType<{ error: unknown }>> {
  let ErrorComponent = null;
  if (errorComponentPath) {
    try {
      ErrorComponent = await loadErrorComponent({
        errorPagePath: errorComponentPath,
        errorPageComponentName: errorComponentName,
      });
    } catch (e) {
      options?.verbose &&
        logger.extend("error")(
          "An error was thrown trying to load the supplied error Component: %e",
          e,
        );
      /** Swallow error page loading exceptions */
      ErrorComponent = null;
    }
  }

  return ErrorComponent as React.ComponentType<{ error: unknown }>;
}

export function createRenderOptions({
  bootstrap,
  ErrorComponent,
  errorPage,
  raOptions,
  signal,
  timeout,
  timeoutFired,
  waavyScriptContent,
}: CreateRenderOptionsConfig) {
  /**
   * 6. Create renderOptions that will be used to configure the ReactDOM render behavior
   */
  const renderOptions: RenderToReadableStreamOptions = {
    bootstrapModules: bootstrap,
    bootstrapScriptContent: waavyScriptContent,
    onError(error, errorInfo) {
      if (raOptions?.verbose) {
        logger.extend("error")(
          "An error was thrown during server side rendering",
        );
      }

      if (ErrorComponent) {
        try {
          errorPage = getErrorPageMarkup(ErrorComponent, error, errorInfo);
        } catch (e) {}
      }
    },
    progressiveChunkSize: asOptionalNumber(raOptions?.chunk),
  };

  /**
   * 7. If a user has supplied a render timeout,
   * force client side rendering after the duration has elapsed
   * using the AbortController signal pattern
   */
  const timeoutDuration = asOptionalNumber(raOptions?.maxTimeout);
  if (!!timeoutDuration) {
    const controller = new AbortController();
    /**
     * We request maxTimeout in seconds
     */
    const duration = timeoutDuration * 1000;
    timeout = setTimeout(() => {
      controller.abort();
      timeoutFired = true;
    }, duration);

    signal = controller.signal;
    renderOptions.signal = signal;
  }

  return renderOptions as RenderToReadableStreamOptions;
}

/**
 * Opens up a filehandle to a named pipe file
 * Creates a writable stream to the pipe file,
 * Streams the rendering of the component to the writer (file handle)
 */
export async function pipeComponentToNamedPipe<
  Props extends React.JSX.IntrinsicAttributes = Record<string, any>,
>(
  options: RenderActionOptions,
  Component: React.ComponentType,
  props: Props = {} as Props,
  renderToReadableStreamOptions: RenderToReadableStreamOptions = {},
) {
  const pipePath = path.relative(options.pipe!, import.meta.url);
  const writable = fs.createWriteStream(
    path.relative(options.pipe!, import.meta.url),
  );
  try {
    await pipeComponentToNodeStream(
      <Component {...props} />,
      writable,
      renderToReadableStreamOptions,
    );
  } catch (error) {
    /** Think about constructing a specific subclass of Error for this */
    throw error;
  } finally {
    writable.end();
  }
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
      throw e instanceof Error ? e : new PropDataLoaderError(String(e));
    }
  }

  return props as Props;
}

type ErrorPageConfiguration = {
  errorPagePath: string;
  errorPageComponentName?: "default" | string;
};

export function getErrorPageMarkup(
  ErrorComponent: React.ComponentType<any>,
  error: unknown,
  errorInfo?: unknown,
) {
  const page = transformComponentToString(<ErrorComponent error={error} />);
  return page;
}

export async function loadErrorComponent(config: ErrorPageConfiguration) {
  const { errorPagePath, errorPageComponentName } = config;
  const npath = path.isAbsolute(errorPagePath)
    ? errorPagePath
    : path.resolve(process.cwd(), errorPagePath);
  const ErrorComponent = await load(npath, errorPageComponentName);
  return ErrorComponent;
}

export enum OutputStrategy {
  NamedPipe,
  SerializedJson,
  StdoutString,
  StdoutStream,
}

/**
 * What is considered an "Output Strategy"?
 *
 * Waavy cannot take advantage (yet) of being directly invoked in arbitrary runtimes.
 *
 * We are working on the ffi, but right now, our means of invocation is limited to spawning
 * processes and listening for output from those processes, or agreeing on a predetermined pipe
 * to use for streaming output to.
 *
 * Primarily, we support:
 *
 * - Rendering a Component as a stream of data to stdout, and listening to the stdout stream
 * to collect the component and then once it's been collected as a string in the calling environment,
 * returned as a response.
 * - Rendering a Component as a stream of data to a named pipe (Pipe file)
 * -
 *
 * In the future, we want to support:
 * - Static Server Side Generation (Static SSG for Static React Pages)
 */
export function getOutputStrategy(
  options: RenderActionOptions,
): OutputStrategy {
  if (options.serialize) return OutputStrategy.SerializedJson;
  if (options.await) return OutputStrategy.StdoutString;
  if (options.pipe) return OutputStrategy.NamedPipe;
  return OutputStrategy.StdoutStream;
}
