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
  getErrorPageMarkup,
  loadErrorComponent,
  getOutputStrategy,
} from "./utils";

import ComponentNotFoundError from "@/errors/ComponentNotFound";
import InvalidExtensionError from "@/errors/InvalidExtension";
import PropDataLoaderException from "@/errors/PropDataLoader";
import { handleError } from "@/errors";

const renderAction: RenderAction = async (pathToComponent, options) => {
  const strategy = getOutputStrategy(options);

  const {
    await: _await = false,
    bootstrap,
    cache = false,
    chunk,
    errorComponentName,
    errorComponentPath,
    failSilently,
    maxTimeout,
    pcacheKey,
    selector,
    name,
    pipe,
    request = {},
    serialize = false,
    verbose = false,
  } = options;

  let errorPage = defaultErrorPage;
  let signal,
    timeout,
    timeoutFired = false;

  try {
    /**
     * Pre (Validation)
     *
     * Ensure we can load/parse the provided file
     */
    const extension = path.extname(pathToComponent).replace(".", "");
    if (!["js", "ts", "jsx", "tsx"].includes(extension)) {
      throw new InvalidExtensionError(
        "[renderAction]: An Exception was thrown: Invalid file extension - " +
          extension,
      );
    }

    /**
     * 1. Component Loading from Local Filesystem
     */
    const Component = await load(pathToComponent, name);
    if (Component == null) {
      throw new ComponentNotFoundError(pathToComponent, name || "default");
    }

    /**
     * 2. Re-use provided path to load any potential Waavy module (loaders).
     */
    const waavyFileModules = await load(pathToComponent, "waavy");
    if (waavyFileModules == null) {
      /** Not using `waavy` exports pattern */
      verbose &&
        logger.extend("warn")(
          "%s is not using `waavy` exports modules.",
          pathToComponent,
        );
    }

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
      props = await fetchLoaderProvProps(waavyFileModules, props, request);
    } catch (e) {
      verbose &&
        logger.extend("error")(
          e instanceof PropDataLoaderException ? e?.message : e,
        );

      /** Reassign to safe copy */
      props = tprops;
    }

    /**
     * 4. Create a client side window assignment script
     * This is useful to props can remain equal across the server render
     * and the client side hydration render.
     */
    const waavyScriptContent = Hydra.createWindowAssignmentInlineScript({
      props,
      propsCacheKey: pcacheKey,
      selector,
    });

    /**
     * 5. Error Page Construction
     * If provided, load a custom error page Component
     */
    let ErrorComponent = null;
    if (errorComponentPath) {
      try {
        ErrorComponent = await loadErrorComponent({
          errorPagePath: errorComponentPath,
          errorPageComponentName: errorComponentName,
        });
      } catch (e) {
        verbose &&
          logger.extend("error")(
            "An error was thrown trying to load the supplied error Component: %e",
            e,
          );
        /** Swallow error page loading exceptions */
        ErrorComponent = null;
      }
    }

    /**
     * 6. Create renderOptions that will be used to configure the ReactDOM render behavior
     */
    const renderOptions: RenderToReadableStreamOptions = {
      bootstrapModules: bootstrap,
      bootstrapScriptContent: waavyScriptContent,
      onError(error, errorInfo) {
        if (verbose) {
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
      progressiveChunkSize: asOptionalNumber(chunk),
    };

    /**
     * 7. If a user has supplied a render timeout,
     * force client side rendering after the duration has elapsed
     * using the AbortController signal pattern
     */
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

    /**
     * From this point on,
     * we commit to an OutputStrategy,
     *
     * If that render for that given OutputStrategy fails during AppShell Render,
     * and an error is thrown,
     * both the renderOptions#onError callback will fire,
     * AND the catch block will fire.
     * @see https://react.dev/reference/react-dom/server/renderToReadableStream#recovering-from-errors-inside-the-shell
     *
     * However, if the render of the AppShell succeeds,
     * and an error is thrown in a subsequent part of the render cycle, (Streaming more content as it loads)
     * React will fail almost silently and default to client side rendering
     * In this case the server onError will fire,
     * but the catch block will not fire and rendering will attempt to continue.
     * @see https://react.dev/reference/react-dom/server/renderToReadableStream#recovering-from-errors-outside-the-shell
     */

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
    if (!failSilently) {
      handleError(error, verbose, errorPage);
    }
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
    .option("-v, --verbose", "Enables verbose log output", false)
    .option(
      "--max-timeout <number>",
      "Number of seconds to wait before aborting server-rendering, flushing the remaining markup to the client, and defaulting to client side rendering",
    )
    .option(
      "--chunk",
      "Progressive chunk size, see <https://github.com/facebook/react/blob/14c2be8dac2d5482fda8a0906a31d239df8551fc/packages/react-server/src/ReactFizzServer.js#L210-L225>",
    )
    .option(
      "--fail-silently",
      "Whether or not to render an Error page to the provided OutputStrategy if an Error occurs, or to fail silently",
      false,
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
 *
 * @see https://react.dev/reference/react-dom/server/renderToReadableStream#recovering-from-errors-inside-the-shell
 * NOTE
 * How do we want to handle errors?
 */
