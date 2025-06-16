import React from "react";
import type { RenderToReadableStreamOptions } from "react-dom/server";
import type { Command } from "commander";
import path from "path";

import {
  pipeComponentToStdout,
  pipeComponentToCollectedString,
} from "@/server";
import Hydra from "@/server/models/Hydra";
import { load } from "@/utils";
import {
  getLoaderProvisionedProps,
  getPropsFromOptions,
  pipeComponentToNamedPipe,
} from "./utils";

export type RenderAction = (
  pathToComponent: string,
  options: RenderActionOptions,
) => void | Promise<void>;
export type RenderActionOptions = {
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
   *
   * This is currently a work in progress, meaning there's been little progress and it does not work.
   *
   * 6/15/2025: Update, it might work
   */
  hydrate?: boolean;

  /**
   * Any files you want to bootstrap on the client.
   * This is typically used for client side hydration of the React app.
   */
  bootstrap?: string[];

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
  const Component = await load(pathToComponent, options.name);
  const props = await getLoaderProvisionedProps(
    options,
    getPropsFromOptions(options),
  );
  const extension = path.extname(pathToComponent).replace(".", "");

  if (!["js", "ts", "jsx", "tsx"].includes(extension)) {
    throw new Error(
      "[renderAction]: An Exception was thrown: Invalid file extension - " +
        extension,
    );
  }

  const renderOptions: RenderToReadableStreamOptions = {
    bootstrapModules: options?.bootstrap,
  };

  if (options?.hydrate) {
    const h = Hydra.create();
    h.setComponent(Component)
      .setPathToComponent(pathToComponent)
      .setImportNonDefaultComponent(options?.name)
      .setExtension(extension as any)
      .setProps(props)
      .setSelector(options?.selector);

    const bundle = await h.createBundle();
    renderOptions.bootstrapScriptContent = bundle;
  }

  if (options?.await || options?.serialize) {
    const markup = await pipeComponentToCollectedString(
      <Component {...props} />,
      renderOptions,
    );

    if (options?.serialize) {
      if (options.serialize === "json") {
        process.stdout.write(
          JSON.stringify({ html: markup, exitCode: 0, props }),
        );
        return;
      }
    }

    if (options?.await) {
      process.stdout.write(markup);
      return;
    }
  }

  if (options?.pipe) {
    return await pipeComponentToNamedPipe(
      options,
      Component,
      props,
      renderOptions,
    );
  }

  return await pipeComponentToStdout(<Component {...props} />, renderOptions);
};

export function setupRenderAction(program: Command) {
  program
    .command("render")
    .description("Render a React component into a stdout stream")
    .argument(
      "<path-to-component>",
      "The path to the file containing the component to render",
    )
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
      false,
    )
    .option(
      "-b, --bootstrap [files-to-bootstrap...]",
      "Any files you want to bootstrap on the client. This is typically used for client side hydration of the React app.",
      [],
    )
    .option(
      "--pipe <path-to-pipe>",
      "Instead of piping the rendered component to stdout, it will pipe the component to a supplied named pipe. Pretty experimental currently.",
    )
    .option(
      "--request <request>",
      "The request object to pass to the loader function.",
      "{}",
    )
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
