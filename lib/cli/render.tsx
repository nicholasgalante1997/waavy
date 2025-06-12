import React from "react";
import type { RenderToReadableStreamOptions } from "react-dom/server";
import type { Command } from "commander";
import fs from "fs";

import {
  pipeComponentToStdout,
  pipeComponentToNodeStream,
  pipeComponentToCollectedString,
} from "@/server";
import type { RenderOptions } from "@/types";
import { $load, $relative } from "@/utils";

type RenderAction = (pathToComponent: string, options: RenderActionOptions) => void;
type RenderActionOptions = {
  /**
   * The name of the component, if left blank, it assumes a default export
   * @default "default"
   */
  name?: "default" | string;

  /**
   * The props to pass to the component. If used in conjunction with a loader, it provides the initial props object and the result of the loader fn is merged in after.
   * @default {}
   */
  props?: string | object;

  /**
   * The path to the file containing the loader function, See our section on using loaders.
   */
  loader?: string;

  /**
   * The request object to pass to the loader function.
   */
  request?: Partial<Request>;

  /**
   * Instead of piping the rendered component to stdout, it will pipe the component to a supplied named pipe. Pretty experimental currently.
   */
  pipe?: string;

  /**
   * If true, the result of the render operation will be collected as streamed,
   * and then passed in a final state to stdout, equivocal to an all or none op.
   */
  await?: boolean;

  /**
   * Whether to include a client side javascript bundle.
   * This calls import('react-dom/client').hydrateRoot on your component,
   * in a module javascript bundle that is embedded into our server generated markup.
   */
  hydrate?: boolean;

  /**
   * Write to stdout in a serialized structured format
   * Currently supports JSON
   */
  serialize?: "json";

  /**
   * The selector to use when hydrating the component.
   * @default "#app"
   */
  selector?: string;
};

const renderAction: RenderAction = async (pathToComponent, options) => {
  const Component = await $load(pathToComponent, options.name);
  let props = await getLoaderProvisionedProps(options, getPropsFromOptions(options));

  if (options?.await || options?.serialize) {
    const markup = await pipeComponentToCollectedString(<Component {...props} />);

    if (options?.serialize) {
      if (options.serialize === "json") {
        process.stdout.write(JSON.stringify({ html: markup, exitCode: 0, props }));
        return;
      }
    }

    if (options?.await) {
      process.stdout.write(markup);
      return;
    }
  }

  if (options?.pipe) {
    return await pipeComponentToNamedPipe(options, Component, props);
  }

  return await pipeComponentToStdout(<Component {...props} />);
};

export function setupRenderAction(program: Command) {
  program
    .command("render")
    .description("Render a React component into a stdout stream")
    .argument("<path-to-component>", "The path to the file containing the component to render")
    .option(
      "-p, --props <props>",
      "The props to pass to the component. If used in conjunction with a loader, it provides the initial props object and the result of the loader fn is merged in after.",
      "{}",
    )
    .option(
      "-l, --loader <path-to-loader>",
      "The path to the file containing the loader function, See our section on using loaders.",
    )
    .option(
      "-n, --name <name>",
      "The name of the component, if left blank, it assumes a default export",
      "default",
    )
    .option(
      "-h, --hydrate",
      "Whether to include a client side javascript bundle. This calls import('react-dom/client').hydrateRoot on your component in a module javascript bundle that is embedded into our server generated markup.",
      true,
    )
    .option(
      "--pipe <path-to-pipe>",
      "Instead of piping the rendered component to stdout, it will pipe the component to a supplied named pipe. Pretty experimental currently.",
    )
    .option("--request <request>", "The request object to pass to the loader function.", "{}")
    .option(
      "--await",
      "If true, the result of the render operation will be collected as streamed, and then passed in a final state to stdout, equivocal to an all or none op.",
      false,
    )
    .option(
      "--serialize <format>",
      "Write to stdout in a serialized structured format Currently supports JSON",
      false,
    )
    .action(renderAction);

  return program;
}

function getLoaderFnContext() {
  return {};
}

function getPropsFromOptions(options: RenderActionOptions) {
  options.props ||= {};
  return typeof options?.props === "string" ? JSON.parse(options?.props) : options.props;
}

async function getLoaderProvisionedProps(options: RenderActionOptions, props = {}) {
  if (options?.loader) {
    let loaderFn = null;
    let pathToLoader = options.loader;
    if (pathToLoader.endsWith(":props")) {
      pathToLoader = pathToLoader.slice(0, -":props".length);
      loaderFn = await $load(pathToLoader, "props");
    } else {
      loaderFn = await $load(pathToLoader);
    }
    if (loaderFn) {
      const loadedProps = await Promise.resolve(loaderFn(getLoaderFnContext(), options?.request));
      if (loadedProps && typeof loadedProps === "object") {
        props = { ...props, ...loadedProps };
      }
    }
  }
  return props;
}

async function pipeComponentToNamedPipe<Props extends React.JSX.IntrinsicAttributes = {}>(
  options: RenderActionOptions,
  Component: React.ComponentType,
  props: Props = {} as Props,
  renderToReadableStreamOptions: RenderToReadableStreamOptions = {},
) {
  const pipePath = $relative(options.pipe!, import.meta.url);
  const writable = fs.createWriteStream($relative(options.pipe!, import.meta.url));
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
