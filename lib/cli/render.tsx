import React from "react";
import type { RenderToReadableStreamOptions } from "react-dom/server";

import type { Command } from "commander";
import path from "path";

import {
  pipeComponentToStdout,
  pipeComponentToCollectedString,
} from "@/server";
import Hydra from "@/server/models/Hydra";
import defaultErrorPage from "@/templates/waavy-error-page";
import type { RenderAction } from "@/types";
import { asOptionalNumber, load, logger } from "@/utils";
import {
  fetchLoaderProvProps,
  getPropsFromOptions,
  pipeComponentToNamedPipe,
  getWaavyRenderContext,
  getErrorPageMarkup,
} from "./utils";

import ComponentNotFoundError from "@/errors/ComponentNotFound";
import InvalidExtensionError from "@/errors/InvalidExtension";
import { handleError } from "@/errors";
import PropDataLoaderException from "@/errors/PropDataLoader";

const renderAction: RenderAction = async (pathToComponent, options) => {
  const {
    await: _await = false,
    bootstrap,
    cache = false,
    chunk,
    errorComponentName,
    errorComponentPath,
    maxTimeout,
    pcacheKey,
    selector,
    name,
    pipe,
    request = {},
    serialize = false,
    verbose = false,
  } = options;

  let signal,
    timeout,
    timeoutFired = false;

  try {
    const Component = await load(pathToComponent, name);
    if (Component == null) {
      throw new ComponentNotFoundError(pathToComponent, name || "default");
    }

    const waavyFileModules = await load(pathToComponent, "waavy");
    if (waavyFileModules == null) {
      /** Not using `waavy` exports pattern */
      verbose &&
        logger.extend("warn")(
          "%s is not using `waavy` exports modules.",
          pathToComponent,
        );
    }

    let props = getPropsFromOptions(options);
    let tprops = structuredClone(props);

    try {
      props = await fetchLoaderProvProps(waavyFileModules, props, request);
    } catch (e) {
      verbose &&
        logger.extend("error")(
          e instanceof PropDataLoaderException ? e?.message : e,
        );

      /** Reassign to safe copy */
      props = tprops;
    }

    const extension = path.extname(pathToComponent).replace(".", "");
    if (!["js", "ts", "jsx", "tsx"].includes(extension)) {
      throw new InvalidExtensionError(
        "[renderAction]: An Exception was thrown: Invalid file extension - " +
          extension,
      );
    }

    let errorPage = defaultErrorPage;

    if (errorComponentPath) {
      try {
        const customErrorPage = await getErrorPageMarkup(
          {
            errorPagePath: errorComponentPath,
            errorPageComponentName: errorComponentName,
          },
          {},
          {},
        );
        if (customErrorPage) {
          errorPage = customErrorPage;
        }
      } catch (e) {
        /** Swallow error page loading exceptions */
      }
    }

    const waavyScriptContent = Hydra.createWindowAssignmentInlineScript({
      props,
      propsCacheKey: pcacheKey,
      selector,
    });

    const renderOptions: RenderToReadableStreamOptions = {
      bootstrapModules: bootstrap,
      bootstrapScriptContent: waavyScriptContent,
      onError(error, errorInfo) {},
      progressiveChunkSize: asOptionalNumber(chunk),
    };

    const timeoutDuration = asOptionalNumber(maxTimeout);
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
      await pipeComponentToNamedPipe(options, Component, props, renderOptions);

      return;
    }

    await pipeComponentToStdout(<Component {...props} />, renderOptions);
    return;
  } catch (error) {
    handleError(error, verbose);
  } finally {
    if (signal && !timeoutFired && typeof timeout !== "undefined") {
      try {
        clearTimeout(timeout);
      } catch (_) {}
    }
  }
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
    .option("v, --verbose", "Enables verbose log output", false)
    .option(
      "--max-timeout <number>",
      "Number of seconds to wait before aborting server-rendering, flushing the remaining markup to the client, and defaulting to client side rendering",
    )
    .option(
      "--chunk",
      "Progressive chunk size, see <https://github.com/facebook/react/blob/14c2be8dac2d5482fda8a0906a31d239df8551fc/packages/react-server/src/ReactFizzServer.js#L210-L225>",
    )
    .action(renderAction);

  return program;
}

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/try...catch#the_finally_block
 * NOTE
 * We probably never want to use finally to return, and since this is a void async function,
 * we likely won't run into errors here. We should attempt to cleanup any timeouts/unresolved states
 * before yielding back to the calling scope.
 */
