import { handleError } from "@/errors";
import {
  pipeComponentToCollectedString,
  pipeComponentToStdout,
} from "@/server";
import defaultErrorPage from "@/templates/waavy-error-page";
import type { RenderAction, RenderActionOptions } from "@/types";
import {
  WorkerMessageDataAction,
  type CacheRenderOutputMessagePayload,
} from "@/types/worker";
import PeerDependencyManager from "@/utils/models/PeerDependencyManager";
import Workers, { createWorkerMessageData } from "@/workers";

import CacheManager from "./models/CacheManager";
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
} from "./utils";

const renderAction: RenderAction = async (pathToComponent, options, wm) => {
  const strategy = getOutputStrategy(options);

  const {
    await: _await = false,
    bootstrap,
    cache = false,
    cacheKey,
    cacheType,
    errorComponentName,
    errorComponentPath,
    pcacheKey,
    selector,
    name = "default",
    verbose = false,
  } = options;

  let cacheableRenderOutput: string | null = null;
  let errorPage = defaultErrorPage;
  let signal,
    timeout,
    timeoutFired = false;

  try {
    /**
     * First, try and load React into scope.
     *
     * If React cannot be resolved via Bun's module resolution algorithm,
     * it is likely not installed within the project's working directory,
     * and since we cannot bundle react, react-dom into the lib,
     * we need an external peer dependency version of React, ReactDOM,
     * or we need to throw an error and stop the process here.
     *
     */
    const __React = await PeerDependencyManager.useReact();
    const __ReactDOMServer = await PeerDependencyManager.useReactDOMServer();

    validateComponentExtension(pathToComponent);

    const cacheIsActive = cache && cacheKey && cacheType;
    const props = await getComponentProps(pathToComponent, options);

    if (cacheIsActive) {
      const useCachedOptions = {
        cache: {
          key: cacheKey,
          type: cacheType,
        },
        component: {
          name,
          props,
          path: pathToComponent,
        },
        output: strategy,
      };
      const didUseCached = await useCached(useCachedOptions);
      if (didUseCached) return;
    }

    const Component = await loadComponent(pathToComponent, name);
    const ErrorComponent = await getErrorComponentOrNull(
      errorComponentPath,
      errorComponentName,
      options,
    );

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

    await handleRenderAndOutput(
      {
        Component,
        props,
        commandOptions: options,
        renderOptions,
        strategy,
      },
      (cacheableRenderOutput ||= ""),
    );

    if (cacheIsActive && cacheableRenderOutput) {
      const writeToCacheOptions: CacheRenderOutputMessagePayload = {
        cachedRenderOutput: cacheableRenderOutput,
        cacheKey,
        cacheType,
        cname: name,
        cpath: pathToComponent,
        props,
      };
      try {
        await writeToCache(wm, writeToCacheOptions);
      } catch (e) {}
    }

    return;
  } catch (error) {
    handleError(error, strategy, verbose, errorPage);
  } finally {
    if (signal && !timeoutFired && typeof timeout !== "undefined") {
      try {
        clearTimeout(timeout);
      } catch (_) {}
    }

    if (strategy !== OutputStrategy.NamedPipe) {
      /**
       * Flush stdout
       */
      if (process.stdout.writableNeedDrain) {
        process.stdout.emit("drain");
      }
    }
  }
};

type HandleRenderAndOutputOptions = {
  /** This needs to be a valid React component */
  Component: any;
  props: any;
  commandOptions: RenderActionOptions;
  /** This needs to be ReactDOMServer.RenderToReadableStreamOptions */
  renderOptions: any;
  strategy: OutputStrategy;
};

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
 *
 * */

async function handleRenderAndOutput(
  options: HandleRenderAndOutputOptions,
  cacheableRenderOutput: string,
) {
  const Component: any = options.Component;
  const props = options.props;

  switch (options.strategy) {
    case OutputStrategy.SerializedJson: {
      const html = await pipeComponentToCollectedString(
        <Component {...props} />,
        options.renderOptions,
      );
      if (options.commandOptions.cache) {
        cacheableRenderOutput = html;
      }
      process.stdout.write(JSON.stringify({ html, exitCode: 0, props }));
      break;
    }
    case OutputStrategy.StdoutString: {
      const html = await pipeComponentToCollectedString(
        <Component {...props} />,
        options.renderOptions,
      );
      if (options.commandOptions.cache) {
        cacheableRenderOutput = html;
      }
      process.stdout.write(html);
      break;
    }
    case OutputStrategy.StdoutStream: {
      if (options.commandOptions.cache) {
        const updateCacheableRenderOutput = (chunk: string) => {
          if (cacheableRenderOutput == null) cacheableRenderOutput = "";
          cacheableRenderOutput += chunk;
        };
        const listeners = [updateCacheableRenderOutput];
        await pipeComponentToStdout(
          <Component {...props} />,
          options.renderOptions,
          listeners,
        );
      } else {
        await pipeComponentToStdout(
          <Component {...props} />,
          options.renderOptions,
        );
      }
      break;
    }
    case OutputStrategy.NamedPipe: {
      await pipeComponentToNamedPipe(
        options,
        Component,
        props,
        options.renderOptions,
      );
      break;
    }
  }
}

type UseCachedOptions = {
  cache: {
    key: string;
    type: string;
  };
  component: {
    path: string;
    name: string;
    props: unknown;
  };
  output: OutputStrategy;
};

async function useCached(options: UseCachedOptions): Promise<boolean> {
  const hasCached = CacheManager.isInCache(
    options.component.path,
    options.component.name,
    options.component.props,
  );
  if (hasCached) {
    const cm = new CacheManager({
      key: options.cache.key,
      type: options.cache.type as any,
      component: options.component,
    });
    const ce = await cm.find();
    if (ce) {
      const { cachedRenderOutput } = ce;
      switch (options.output) {
        case OutputStrategy.StdoutStream:
        case OutputStrategy.StdoutString:
          !process.stdout.write(cachedRenderOutput) &&
            process.stdout.emit("drain");
          return true;
        case OutputStrategy.SerializedJson:
          !process.stdout.write(
            JSON.stringify({
              html: cachedRenderOutput,
              exitCode: 0,
              props: options.component.props,
            }),
          ) && process.stdout.emit("drain");
          return true;
      }
    }
  }

  return false;
}

async function writeToCache(
  wm: Workers,
  data: CacheRenderOutputMessagePayload,
) {
  const worker = wm.createWorker();
  const message = createWorkerMessageData<CacheRenderOutputMessagePayload>(
    WorkerMessageDataAction.Cache,
    data,
  );
  worker.postMessage(message);
}

export default renderAction;
