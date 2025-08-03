import debug from "debug";
import fs from "fs";
import { access, constants, stat } from "fs/promises";
import path from "path";

import { type BundleAction } from "@/types/cli/bundle";
import defaults from "./utils/bundlerConfigDefaults";
import { handleBunBuildOutput } from "./utils/handleBunBuildOutput";

const verboseNamespace = "waavy:bundler:verbose";
const verbose = debug(verboseNamespace);

const bundleAction: BundleAction = async (options) => {
  console.log("Bundling...");

  if (options.verbose) {
    debug.enable(verboseNamespace);
  }

  verbose("Starting bundle...");
  const start = performance.now();

  const input = options.dir || "./www/src/browser";
  verbose(`Input directory: ${input}`);

  try {
    await access(input, constants.F_OK);
    verbose(`Input directory "${input}" exists.`);
    const stats = await stat(input);
    if (!stats.isDirectory()) {
      throw new Error(`Input directory "${input}" is not a directory.`);
    }
  } catch (e) {
    throw new Error(`Input directory "${input}" does not exist.`);
  }

  const entrypoints = mapDirToEntryPoints(input);

  if (entrypoints.length === 0) {
    throw new Error(`No entrypoints found in directory "${input}".`);
  }

  verbose(`Found ${entrypoints.length} entrypoints.`);

  const bunConfig: Bun.BuildConfig = {
    entrypoints,
    outdir: options.out || "./waavy-out",
    ...defaults,
    ...options.config,
  };

  verbose(`Bun config: ${JSON.stringify(bunConfig, null, 2)}`);

  if (options.dryRun) {
    for (const entrypoint of entrypoints) {
      console.log(`Would build: ${entrypoint}`);
    }
    return;
  }

  await Bun.build(bunConfig).then((buildOutput) => handleBunBuildOutput(buildOutput, start, options.verbose));
};

function mapDirToEntryPoints(dir: string) {
  const dirents = fs.readdirSync(dir, { withFileTypes: true });

  return dirents
    .filter((de) => de.isFile() && [".ts", ".tsx", ".js", ".jsx"].includes(path.extname(de.name)))
    .map((de) => path.relative(process.cwd(), path.resolve(de.parentPath, de.name)));
}

export default bundleAction;
