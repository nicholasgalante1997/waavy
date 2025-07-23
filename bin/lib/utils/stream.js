import { createReadStream, createWriteStream } from "fs";
import { pipeline } from "stream/promises";

const defaultInputOptions = {
  autoClose: true,
  emitClose: true,
  encoding: "utf8",
};

const defaultOutputOptions = {
  ...defaultInputOptions,
  mode: 755,
};

export async function streamFile(source, destination) {
  const input = createReadStream(source, defaultInputOptions);
  const output = createWriteStream(destination, defaultOutputOptions);
  return await pipeline(input, output);
}
