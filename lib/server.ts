import React from "react";
import * as ReactDOMServer from "react-dom/server";

import path from "path";

function transformComponentToString(component: React.ReactElement, options: ReactDOMServer.ServerOptions = {}) {
  return ReactDOMServer.renderToString(component, options);
}

async function transformComponentToReadableStream(component: React.ReactElement, options: ReactDOMServer.RenderToReadableStreamOptions = {}) {
  const stream = await ReactDOMServer.renderToReadableStream(component, options);
  return stream;
}

async function pipeComponent<W extends WritableStream<T>, T = any>(component: React.ReactElement, writable: W, options: ReactDOMServer.RenderToReadableStreamOptions = {}) {
  const stream = await transformComponentToReadableStream(component, options);
  stream.pipeTo(writable);
}

export async function loadModule(
  pathlike: string,
  name: string = "default"
) {
  const resolved = path.resolve(
    pathlike.startsWith("/") ? pathlike : path.join(process.cwd(), pathlike)
  );
  const loadedModule = await import(resolved);
  return loadedModule[name] || null;
}

export async function pipeComponentToWritableCallback(component: React.ReactElement, cb: (chunk: string) => void, options: ReactDOMServer.RenderToReadableStreamOptions = {}) {
  const stream = await transformComponentToReadableStream(component, options);
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let result: Bun.ReadableStreamDefaultReadResult<any> = { value: undefined, done: false };
  while (!result.done) {
    result = await reader.read()
    let chunk = decoder.decode(result.value);
    cb(chunk);
  }
}

export async function pipeComponentToStdout(component: React.ReactElement, options: ReactDOMServer.RenderToReadableStreamOptions = {}) {
  await pipeComponentToWritableCallback(component, (chunk) => process.stdout.write(chunk), options);
}
