import type { WriteStream } from "fs";
import React from "react";
import * as ReactDOMServer from "react-dom/server";

import { Readable } from "stream";

export function transformComponentToString(
  component: React.ReactElement,
  options: ReactDOMServer.ServerOptions = {},
) {
  return ReactDOMServer.renderToString(component, options);
}

export async function transformComponentToReadableStream(
  component: React.ReactElement,
  options: ReactDOMServer.RenderToReadableStreamOptions = {},
) {
  return ReactDOMServer.renderToReadableStream(component, options);
}

export async function pipeComponent<W extends WritableStream<T>, T = any>(
  component: React.ReactElement,
  writable: W,
  options: ReactDOMServer.RenderToReadableStreamOptions = {},
) {
  const stream = await transformComponentToReadableStream(component, options);
  await stream.pipeTo(writable);
}

export async function pipeComponentToWritableCallback(
  component: React.ReactElement,
  cb: (chunk: string) => void,
  options: ReactDOMServer.RenderToReadableStreamOptions = {},
) {
  const stream = await transformComponentToReadableStream(component, options);
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let result: Bun.ReadableStreamDefaultReadResult<any> = { value: undefined, done: false };
  while (!result.done) {
    result = await reader.read();
    let chunk = decoder.decode(result.value);
    cb(chunk);
  }
}

export async function pipeComponentToCollectedString(
  component: React.ReactElement,
  options: ReactDOMServer.RenderToReadableStreamOptions = {},
  init?: string,
) {
  let stream = init || "";
  await pipeComponentToWritableCallback(component, (chunk) => (stream += chunk), options);
  return stream;
}

export async function pipeComponentToStdout(
  component: React.ReactElement,
  options: ReactDOMServer.RenderToReadableStreamOptions = {},
) {
  await pipeComponentToWritableCallback(component, (chunk) => process.stdout.write(chunk), options);
}

// Convert Web ReadableStream to Node.js Readable stream
function webStreamToNodeStream(webStream: ReadableStream): Readable {
  const reader = webStream.getReader();

  return new Readable({
    async read() {
      try {
        const { done, value } = await reader.read();
        if (done) {
          this.push(null); // End the stream
        } else {
          this.push(Buffer.from(value)); // Convert Uint8Array to Buffer
        }
      } catch (error) {
        this.destroy(error as Error);
      }
    },
  });
}

// New function to pipe to Node.js WriteStream (for named pipes)
export async function pipeComponentToNodeStream(
  component: React.ReactElement,
  nodeWriteStream: WriteStream,
  options: ReactDOMServer.RenderToReadableStreamOptions = {},
) {
  const webStream = await transformComponentToReadableStream(component, options);
  const nodeReadableStream = webStreamToNodeStream(webStream);

  return new Promise<void>((resolve, reject) => {
    nodeReadableStream.pipe(nodeWriteStream);

    nodeReadableStream.on("end", () => {
      resolve();
    });

    nodeReadableStream.on("error", (error) => {
      reject(error);
    });

    nodeWriteStream.on("error", (error) => {
      reject(error);
    });
  });
}
