import React from "react";
import type { RenderToReadableStreamOptions } from "react-dom/server";
import fs from "fs";
import path from "path";

import { pipeComponentToNodeStream } from "@/server";
import type { RenderActionOptions } from "@/types";

export function getPropsFromOptions(options: RenderActionOptions) {
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
