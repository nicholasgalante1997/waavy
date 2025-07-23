import type { WriteStream } from "fs";
import { Readable } from "stream";
import PeerDependencyManager from "@/utils/models/PeerDependencyManager";

export async function transformComponentToString(
  component: any,
  options: any = {},
) {
  const React = await PeerDependencyManager.useReact();
  const ReactDOMServer = await PeerDependencyManager.useReactDOMServer();
  return ReactDOMServer.renderToString(component, options);
}

export async function transformComponentToReadableStream(
  component: any,
  options: any = {},
) {
  const React = await PeerDependencyManager.useReact();
  const ReactDOMServer = await PeerDependencyManager.useReactDOMServer();
  return ReactDOMServer.renderToReadableStream(component, options);
}

export async function pipeComponent<W extends WritableStream<T>, T = any>(
  component: any,
  writable: W,
  options: any = {},
) {
  const stream = await transformComponentToReadableStream(component, options);
  await stream.pipeTo(writable);
}

/**
 * TODO look into replacing all usages of `pipeComponentToWritableCallback` with this function
 */
export async function pipeComponentToWritableCallbacks(
  component: any,
  cbs: ((chunk: string) => void | Promise<void>)[],
  options: any = {},
) {
  const stream = await transformComponentToReadableStream(component, options);
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let result: Bun.ReadableStreamDefaultReadResult<any> = {
    value: undefined,
    done: false,
  };
  while (!result.done) {
    result = await reader.read();
    const chunk = decoder.decode(result.value);
    for (const cb of cbs) {
      await Promise.resolve(cb(chunk));
    }
  }
}

/**
 * @deprecated
 */
export async function pipeComponentToWritableCallback(
  component: any,
  cb: (chunk: string) => void,
  options: any = {},
) {
  const stream = await transformComponentToReadableStream(component, options);
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let result: Bun.ReadableStreamDefaultReadResult<any> = {
    value: undefined,
    done: false,
  };
  while (!result.done) {
    result = await reader.read();
    const chunk = decoder.decode(result.value);
    cb(chunk);
  }
}

export async function pipeComponentToCollectedString(
  component: any,
  options: any = {},
  listeners: ((chunk: string) => void | Promise<void>)[] = [],
  init?: string,
) {
  let stream = init || "";
  await pipeComponentToWritableCallbacks(
    component,
    [
      (chunk) => {
        stream += chunk;
      },
      ...listeners,
    ],
    options,
  );
  return stream;
}

export async function pipeComponentToStdout(
  component: any,
  options: any = {},
  listeners: ((chunk: string) => void | Promise<void>)[] = [],
) {
  await pipeComponentToWritableCallbacks(
    component,
    [
      (chunk) => {
        process.stdout.write(chunk);
      },
      ...listeners,
    ],
    options,
  );
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

export async function pipeComponentToNodeStream(
  component: any,
  nodeWriteStream: WriteStream,
  options: any = {},
) {
  const webStream = await transformComponentToReadableStream(
    component,
    options,
  );
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
