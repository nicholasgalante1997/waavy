import React from "react";
import type { RenderToReadableStreamOptions } from "react-dom/server";
import fs from "fs";
import path from "path";

import PropDataLoaderError from "@/errors/PropDataLoader";
import {
  pipeComponentToNodeStream,
  transformComponentToString,
} from "@/server";
import type { LoaderFn, RenderActionOptions } from "@/types";
import { load } from "@/utils";

export function getPropsFromOptions(
  options: RenderActionOptions,
): Record<string, unknown> {
  options.props ||= {};
  return typeof options?.props === "string"
    ? JSON.parse(options?.props)
    : options.props;
}

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
    console.error(`Successfully rendered component to pipe: ${pipePath}`);
  } catch (error) {
    console.error(`Error piping to named pipe: ${error}`);
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

export function reportRenderError(error: unknown, errorInfo: any) {}
