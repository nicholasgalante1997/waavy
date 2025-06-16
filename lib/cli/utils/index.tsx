import React from "react";
import type { RenderToReadableStreamOptions } from "react-dom/server";
import fs from "fs";
import path from "path";

import { pipeComponentToNodeStream } from "@/server";
import { load } from "@/utils";
import type { RenderActionOptions } from "../render";

export function getPropsFromOptions(options: RenderActionOptions) {
  options.props ||= {};
  return typeof options?.props === "string"
    ? JSON.parse(options?.props)
    : options.props;
}

export function getLoaderFnContext() {
  return {};
}

export async function getLoaderProvisionedProps(
  options: RenderActionOptions,
  props = {},
) {
  if (options?.loader) {
    let loaderFn = null;
    let pathToLoader = options.loader;
    if (pathToLoader.endsWith(":props")) {
      pathToLoader = pathToLoader.slice(0, -":props".length);
      loaderFn = await load(pathToLoader, "props");
    } else {
      loaderFn = await load(pathToLoader);
    }
    if (loaderFn) {
      const loadedProps = await Promise.resolve(
        loaderFn(getLoaderFnContext(), options?.request),
      );
      if (loadedProps && typeof loadedProps === "object") {
        props = { ...props, ...loadedProps };
      }
    }
  }
  return props;
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
