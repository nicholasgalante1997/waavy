import React from "react";
import type { RenderToReadableStreamOptions } from "react-dom/server";

import type { Command } from "commander";
import path from "path";

import {
  pipeComponentToStdout,
  pipeComponentToCollectedString,
} from "@/server";
import { load } from "@/utils";
import {
  getPropsFromOptions,
  getWaavyRenderContext,
  pipeComponentToNamedPipe,
} from "./utils";

import type { RenderAction, LoaderFn } from "@/types";
import Hydra from "@/server/models/Hydra";

const renderAction: RenderAction = async (pathToComponent, options) => {
  const {
    await: _await = false,
    bootstrap,
    cache = false,
    errorComponentName,
    errorComponentPath,
    pcacheKey,
    selector,
    name,
    pipe,
    request = {},
    serialize = false,
  } = options;

  const Component = await load(pathToComponent, name);
  const waavyFileModules = await load(pathToComponent, "waavy");
  let props = getPropsFromOptions(options);

  if (
    waavyFileModules &&
    "dataLoader" in waavyFileModules &&
    typeof waavyFileModules?.dataLoader === "function"
  ) {
    try {
      const loader = waavyFileModules?.dataLoader as LoaderFn<typeof props>;
      const loaderResult = await Promise.resolve(
        loader(request, getWaavyRenderContext()),
      );
      if (
        loaderResult &&
        loaderResult?.data &&
        typeof loaderResult?.data === "object"
      ) {
        props = { ...props, ...loaderResult?.data };
      }
    } catch (e) {
      console.warn(
        "[waavy::render] A data loader fn has thrown the following error,",
        e,
      );
      props = props;
    }
  }

  const extension = path.extname(pathToComponent).replace(".", "");

  if (!["js", "ts", "jsx", "tsx"].includes(extension)) {
    throw new Error(
      "[renderAction]: An Exception was thrown: Invalid file extension - " +
        extension,
    );
  }

  const waavyScriptContent = Hydra.createWindowAssignmentInlineScript({
    props,
    propsCacheKey: pcacheKey,
    selector,
  });

  const renderOptions: RenderToReadableStreamOptions = {
    bootstrapModules: bootstrap,
    bootstrapScriptContent: waavyScriptContent,
  };

  if (_await || serialize) {
    const markup = await pipeComponentToCollectedString(
      <Component {...props} />,
      renderOptions,
    );

    if (serialize) {
      if (serialize === "json") {
        process.stdout.write(
          JSON.stringify({ html: markup, exitCode: 0, props }),
        );
        return;
      }
    }

    if (_await) {
      process.stdout.write(markup);
      return;
    }
  }

  if (pipe) {
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
    .description(
      "Render a React component into a stdout stream or to a provided pipe",
    )
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
      "-n, --name <name>",
      "The name of the component, if left blank, it assumes a default export",
      "default",
    )
    .option(
      "-b, --bootstrap [files-to-bootstrap...]",
      "Any files you want to bootstrap on the client. This is typically used for client side hydration of the React app.",
      [],
    )
    .option(
      "--cache",
      "If this flag is set to true, Waavy renderer will spawn a secondary non-blocking Worker thread to write the result of the render operation to a local file cache. This is recommended for production when it's very likely your components aren't changing if props are the same, and we can use a cached result of the render operation in such a case.",
      false,
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
    .option(
      "--error-page-path <path-to-error-file>",
      "A fallback page to render in the event that an error is thrown during server side rendering.",
    )
    .option(
      "--error-page-component-name <name>",
      "The name of the Error page component to import. Used in conjunction with --error-page-path",
      "default",
    )
    .option(
      "--selector",
      `The selector that you will mount your React component node to within the browser.
        If your application uses client side hydration, this is the selector for the element that you pass to ReactDOM.hydrateRoot
        If you are using the "waavy" client side function, this property is used for client side hydration.      
        If this property is left blank, it is assumed you are following the <Html /> React Page pattern,
        and we will attempt to use "document" as the selector in this case.`,
    )
    .option(
      "--pcache-key",
      `A string indicating what field you want Waavy to assign props to on the window object.
      if left default, Waavy will put the props in window._p`,
    )
    .action(renderAction);

  return program;
}
