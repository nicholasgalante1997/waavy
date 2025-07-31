import debug from "debug";
import { createReadStream, createWriteStream } from "fs";
import fs, { access, stat } from "fs/promises";
import path from "path";
import { performance } from "perf_hooks";
import { createGzip } from "zlib";
import { pipeline } from "stream/promises";
import config from "@pkg/config";

const log = debug("waavy:compress:gzip");
const outdir = path.join(process.cwd(), "out", "executables");
const executables = config.build.targets.map((t) => path.resolve(outdir, t.name));
const start = performance.now();

await waitForFiles();
await compressRenderCommandExecutables()
  .then(() => log("Compression completed successfully in %d ms", Math.round(performance.now() - start)))
  .catch((error) => {
    const err = log.extend("error");
    err("Compression failed:", error);
    err("Failed in %d ms", Math.round(performance.now() - start));
    process.exit(1);
  });

async function compressRenderCommandExecutables() {
  await Promise.all(
    executables.map(async function (executable) {
      const gzip = createGzip({ level: 9, memLevel: 9 });
      const filepath = executable.includes("windows") ? executable + ".exe" : executable;
      const gzipPath = `${filepath}.gz`;
      const input = createReadStream(filepath);
      const output = createWriteStream(gzipPath);
      return await pipeline(input, gzip, output);
    }),
  );
}

async function waitForFiles() {
  const files = [...executables];
  while (files.length > 0) {
    log(`Waiting for ${files.length} files to be ready...`);
    
    const file = files.shift()!;
    const filename = file.includes("windows") ? `${file}.exe` : file;

    log(`Waiting for ${file} to be ready...`);
    try {
      await access(filename, fs.constants.R_OK);
      log(`Found ${filename}!`);
    } catch (error) {
      console.warn(`Unable to access file: ${filename}`);
      console.error(`Encountered error: ${error}`);
      await Bun.sleep(100);
      files.push(file);
    }

    try {
      const stats = await stat(filename);
      log(`File size: ${stats.size} bytes`);
      if (stats.size === 0) {
        console.warn(`${filename} is empty, continuing`);
        throw new Error(`Missing ${filename}`);
      }
    } catch(e) {
      console.warn(`Unable to stat file: ${filename}`);
      console.error('Encountering error: ' + e);
      await Bun.sleep(100);
      files.push(file);
    }
  }
}
