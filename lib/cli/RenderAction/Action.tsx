import React from "react";

import { handleError } from "@/errors";
import {
  pipeComponentToCollectedString,
  pipeComponentToStdout
} from "@/server";
import defaultErrorPage from "@/templates/waavy-error-page";
import type { RenderAction } from "@/types";

import {
  createRenderOptions,
  createWindowAssignmentInlineScript,
  getComponentProps,
  getErrorComponentOrNull,
  getOutputStrategy,
  loadComponent,
  pipeComponentToNamedPipe,
  OutputStrategy,
  validateComponentExtension,
} from './utils';

const renderAction: RenderAction = async (pathToComponent, options) => {
  const strategy = getOutputStrategy(options);

  const {
    await: _await = false,
    bootstrap,
    cache = false,
    cachePath,
    errorComponentName,
    errorComponentPath,
    pcacheKey,
    selector,
    name,
    verbose = false,
  } = options;

  let errorPage = defaultErrorPage;
  let signal,
    timeout,
    timeoutFired = false;

  try {
    validateComponentExtension(pathToComponent);
    const Component = await loadComponent(pathToComponent, name);
    const ErrorComponent = await getErrorComponentOrNull(
      errorComponentPath,
      errorComponentName,
      options,
    );
    const props = await getComponentProps(pathToComponent, options);
    const waavyScriptContent = createWindowAssignmentInlineScript({
      props,
      propsCacheKey: pcacheKey,
      selector,
    });

    const renderOptions = createRenderOptions({
      bootstrap,
      ErrorComponent,
      errorPage,
      raOptions: options,
      signal,
      timeout,
      timeoutFired,
      waavyScriptContent,
    });

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

    switch (strategy) {
      case OutputStrategy.NamedPipe: {
        await pipeComponentToNamedPipe(
          options,
          Component,
          props,
          renderOptions,
        );
        return;
      }
      case OutputStrategy.SerializedJson: {
        const markupAsString = await pipeComponentToCollectedString(
          <Component {...props} />,
          renderOptions,
        );
        process.stdout.write(
          JSON.stringify({ html: markupAsString, exitCode: 0, props }),
        );
        return;
      }
      case OutputStrategy.StdoutString: {
        const markupAsString = await pipeComponentToCollectedString(
          <Component {...props} />,
          renderOptions,
        );
        process.stdout.write(markupAsString);
        return;
      }
      case OutputStrategy.StdoutStream: {
        await pipeComponentToStdout(<Component {...props} />, renderOptions);
        return;
      }
    }
  } catch (error) {
    handleError(error, strategy, verbose, errorPage);
  } finally {
    if (signal && !timeoutFired && typeof timeout !== "undefined") {
      try {
        clearTimeout(timeout);
      } catch (_) {}
    }
  }
};

export default renderAction;