import React from "react";
import { type SerializableObject } from "./types";
import { WorkerEvents } from "./workers";

declare var self: Worker;

/**
 * Workers in Bun are not production ready yet,
 * @see https://bun.sh/docs/api/workers
 *
 * But that's okay, because we're not production ready yet.
 *
 * We spawn a worker in one seldom case currently,
 * as we're looking to limit our dependencies on them if we need to suddenly move off
 *
 * We spawn a worker to cache the result of a render operation.
 *
 * In theory, we need only do this once,
 * and Components that change on every render should not be cached,
 * skipping this process entirely.
 *
 * But on average, quite a few pages within a web application can be cached,
 * typically
 * - variations of the home page/lander
 * - about pages
 * - link directories
 * - blog pages
 * - media galleries
 * - dashboard skeletons
 *
 * It is our default behavior in such instances to want to cache.
 *
 * Bun has, exceptional file io, and in theory, (we'll test the shit out of this)
 * opening a stream to a file handle with bun should be much faster than having
 * React render the component on the server.
 *
 * Im (guessing) estimating that
 * - comparing byte chunks for a match, and streaming a matched file
 * will be faster than
 * - loading a file, loading a component, loading props, rendering a component with the ReactDOMServer engine
 *
 * We need only do this once.
 */

self.onmessage = async (message) => {
  const { data, type } = message;
  const action = data?.action;
  switch (action) {
    case "cache": {
      break;
    }
    default: {
      break;
    }
  }

  postMessage({ type: WorkerEvents.Destroy });
};

type CreateRenderOutputCacheEntry = {
  pathToComponent: string;
  componentName: string;
  props: SerializableObject;
  cacheStrategy?: "bunfs" | "sqlite3";
};

async function cacheRenderOutput() {}
