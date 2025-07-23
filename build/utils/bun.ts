import fs from "fs/promises";
import path from "path";
import config from "@pkg/config";
import type { BuildBunRuntimeOutputOptions } from "../types";

import { handleBunBuildOutput } from "./handler";
import log from "./log";

const defaultBunOutputPath = path.resolve(
  config.build.output.directory,
  "commands",
  "bun",
);

export async function buildBunRuntimeOutput(
  options: BuildBunRuntimeOutputOptions,
) {
  const {
    entrypoint,
    external,
    root = "./lib",
    verbose = false,
    overrides = {
      outdir: defaultBunOutputPath,
    },
  } = options;
  let succeeded = true;
  const startTime = performance.now();
  try {
    const outdir = overrides.outdir || defaultBunOutputPath;

    if (!(await fs.exists(outdir))) {
      await fs.mkdir(outdir, { recursive: true });
    }

    const defaultBuildOptions = config.build.defaultBuildOptions(
      external,
      outdir,
    );

    const result = await Bun.build({
      ...defaultBuildOptions,
      ...overrides,
      root,
      target: "bun",
      entrypoints: [entrypoint],
      format: "esm",
    });

    handleBunBuildOutput(result, startTime, verbose);
  } catch (error) {
    log.extend("error")(`Node build failed: ${error}`);
    succeeded = false;
  }

  return succeeded;
}

export async function buildBunRuntimeCommands(verbose = false) {
  /**
   * The render command cannot be run with a node runtime,
   * it can only be run with `bun` or as a platform executable,
   * so we only build the render command for a `bun` output format
   */
  const commands = Object.entries(config.build.sources.cli)
    .filter(([key]) => key === "render")
    .map(([, source]) => source);

  const buildPromises = commands.map((command) =>
    buildBunRuntimeOutput({
      entrypoint: command,
      external: config.build.dependencies.external,
      root: "./lib/commands",
      verbose,
      overrides: {
        outdir: path.resolve(config.build.output.directory, "commands", "bun"),
      },
    }),
  );

  const passed = (await Promise.all(buildPromises)).reduce(
    (prev, next) => prev && next,
    true,
  );

  return passed;
}
