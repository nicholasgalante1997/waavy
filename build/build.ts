import debug from "debug";
import util from "util";
import config from "@pkg/config";

import type { WaavyBuildOptions } from "./types";
import { buildBunRuntimeCommands } from "./utils/bun";
import { ensureOutDir } from "./utils/dir";
import { buildRenderCommandPlatformExecutables } from "./utils/executable";
import { buildExports } from "./utils/exports";
import { buildJavascriptRuntimeCommands } from "./utils/node";

import log from "./utils/log";

export async function build(options: WaavyBuildOptions) {
  const verbose = options.verbose;
  const specificTarget = options.target;

  const targets = config.build.targets;
  const outdir = config.build.output.directory;

  if (verbose) {
    debug.enable("waavy:*");
    log(`Verbose logging enabled!`);
    log(util.inspect({ options, targets }, true, 4, true));
  }

  const buildStartTime = performance.now();
  log("🚀 Starting Waavy build process...");

  await ensureOutDir(outdir);

  /**
   * Build Library Exports => ./lib/exports => ./out/browser.js & ./out/server.js
   */
  const buildExportsPassed = await buildExports(verbose);

  /**
   * Build Executables => ./out/binaries/waavy-{platform}-{target}-render
   */
  const buildRenderCommandPlatformExecutablesPassed =
    await buildRenderCommandPlatformExecutables(specificTarget, verbose);

  /**
   * Build Node Runtime Commands => ./out/commands/*.js
   */
  const buildJavascriptRuntimeCommandsPassed =
    await buildJavascriptRuntimeCommands(verbose);

  /**
   * Build Bun Runtime Commands => ./out/commands/bun/*.js
   */
  const buildBunRuntimeCommandsPassed = await buildBunRuntimeCommands(verbose);

  const passed =
    buildExportsPassed &&
    buildRenderCommandPlatformExecutablesPassed &&
    buildJavascriptRuntimeCommandsPassed &&
    buildBunRuntimeCommandsPassed;

  const totalDuration = Math.round(performance.now() - buildStartTime);

  if (passed) {
    log(`🎉 Build completed successfully in ${totalDuration}ms`);
    process.exit(0);
  } else {
    log.extend("error")(`💥 Build failed after ${totalDuration}ms`);
    process.exit(1);
  }
}
