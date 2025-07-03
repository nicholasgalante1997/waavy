import React from "react";

import { handleError } from "@/errors";
import {
  pipeComponentToCollectedString,
  pipeComponentToStdout,
} from "@/server";
import defaultErrorPage from "@/templates/waavy-error-page";
import type { RenderAction } from "@/types";
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
    validateComponentExtension(pathToComponent);

    const props = await getComponentProps(pathToComponent, options);
    /** TODO 
     * we need to init CacheManager with existing cache data when a process is spawned 
     * otherwise hasCached will always end up being falsy
     * */
    const hasCached = CacheManager.isInCache(pathToComponent, name, props);

    if (cache && cacheKey && cacheType && hasCached) {
      const cm = new CacheManager({
        key: cacheKey,
        type: cacheType,
        component: {
          name,
          path: pathToComponent,
          props,
        },
      });
      const ce = await cm.find();
      if (ce) {
        const { cachedRenderOutput } = ce;
        switch (strategy) {
          case OutputStrategy.StdoutStream:
          case OutputStrategy.StdoutString:
            !process.stdout.write(cachedRenderOutput) &&
              process.stdout.emit("drain");
            return;
          case OutputStrategy.SerializedJson:
            !process.stdout.write(
              JSON.stringify({
                html: cacheableRenderOutput,
                exitCode: 0,
                props,
              }),
            );
            return;
        }
      }
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
     * Caching
     *
     * Caching can be enabled by passing the `--cache` flag.
     *
     * If you enable caching, Waavy will use a combination of the
     *
     * - path to the Component
     * - the name of the Component
     * - props
     *
     * to create a serialized cache entry after rendering the Component.
     *
     * On subsequent requests to render that Component,
     *
     * Waavy will check the cache and if an entry exists with equal props,
     * it will stream the cached render output instead of re-rendering the page.
     *
     * You should only use this if your React Component Pages are pure functions.
     *
     * Waavy has two approaches to caching.
     *
     * 1. Local File System Caching (bunfs)
     *
     * If you want us to cache the file, and you choose the `bunfs` option,
     *
     * - we will create a directory under node_modules/.cache/waavy
     * - we will create a CacheEntry object
     * - we will write the CacheEntry object to a directory under node_modules/.cache/waavy/hash-of-path-and-component-name/uuid.json
     *
     * And then on subsequent renders, we will check node_modules/.cache/waavy/hash-of-path-and-component-name/
     *
     * and compare props to provided props, and if we match, we will return the rendered output.
     *
     * 2. Local File System Database (bunsqlite3)
     *
     * If you want us to cache the file, and you choose the `bunsqlite3` option,
     *
     *
     */
    switch (strategy) {
      case OutputStrategy.SerializedJson: {
        const html = await pipeComponentToCollectedString(
          <Component {...props} />,
          renderOptions,
        );
        if (cache) {
          cacheableRenderOutput = html;
        }
        process.stdout.write(JSON.stringify({ html, exitCode: 0, props }));
        break;
      }
      case OutputStrategy.StdoutString: {
        const html = await pipeComponentToCollectedString(
          <Component {...props} />,
          renderOptions,
        );
        if (cache) {
          cacheableRenderOutput = html;
        }
        process.stdout.write(html);
        break;
      }
      case OutputStrategy.StdoutStream: {
        if (cache) {
          const updateCacheableRenderOutput = (chunk: string) => {
            if (cacheableRenderOutput == null) cacheableRenderOutput = "";
            cacheableRenderOutput += chunk;
          };
          const listeners = [updateCacheableRenderOutput];
          await pipeComponentToStdout(
            <Component {...props} />,
            renderOptions,
            listeners,
          );
        } else {
          await pipeComponentToStdout(<Component {...props} />, renderOptions);
        }
        break;
      }
      case OutputStrategy.NamedPipe: {
        await pipeComponentToNamedPipe(
          options,
          Component,
          props,
          renderOptions,
        );
        break;
      }
    }

    if (cache && cacheableRenderOutput && cacheType && cacheKey) {
      const cm = new CacheManager({
        key: cacheKey,
        type: cacheType,
        component: {
          name,
          props,
          path: pathToComponent,
        },
      });
      try {
        await cm.cache(cacheableRenderOutput);
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
  }
};

export default renderAction;
