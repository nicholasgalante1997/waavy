import debug from "debug";
import { createReadStream, createWriteStream } from "fs";
import path from "path";
import { performance } from "perf_hooks";
import { createGzip } from "zlib";
import { pipeline } from "stream/promises";
import config from "../config";

const log = debug("waavy:compress:gzip");
const outdir = path.join(process.cwd(), "out");

const executables = config.build.targets.map((t) =>
  path.resolve(outdir, t.name),
);

async function compress() {
  await Promise.all(
    executables.map(async function (executable) {
      const gzip = createGzip({ level: 9, memLevel: 9 });
      const filepath = executable.includes("windows")
        ? executable + ".exe"
        : executable;
      const gzipPath = `${filepath}.gz`;
      const input = createReadStream(filepath);
      const output = createWriteStream(gzipPath);
      return await pipeline(input, gzip, output);
    }),
  );
}

const start = performance.now();

compress()
  .then(() =>
    log(
      "Compression completed successfully in %d ms",
      Math.round(performance.now() - start),
    ),
  )
  .catch((error) => {
    const err = log.extend("error");
    err("Compression failed:", error);
    err("Failed in %d ms", Math.round(performance.now() - start));
    process.exit(1);
  });
