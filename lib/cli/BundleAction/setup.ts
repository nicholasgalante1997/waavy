import { type Command } from "commander";
import ActionUtils from "../utils";
import bundleAction from "./Action";

export function setupBundleAction(program: Command) {
  if (!ActionUtils.shouldInclude("bundle")) return;

  program
    .command("bundle")
    .description("Bundle client side javascript into production assets.")
    .option("-f, --file <file>", "The input file to bundle")
    .option("-d, --dir <directory>", "The input directory to bundle")
    .option(
      "-o, --out <directory>",
      'Where to put the built output files. Default: "out"',
      "out",
    )
    .option(
      "-c, --config <file>",
      "A build config ts file that can be used to override default build settings.",
      "waavy.bundler.ts",
    )
    .option("--clean", "Clean the output directory before building.", false)
    .action(async ({ config, ...options }) => {
      /**
       * TODO implement logic for
       *
       * - load waavy.bundler.config.ts and pass config into bundleAction
       * - can re-use a lot of build.ts logic here
       *
       */

      try {
        await bundleAction({ ...options });
      } catch (e) {
        /**
         * Report error if telemetry is enabled
         */
      }
    });
}
