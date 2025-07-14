import { type Command } from "commander";
import ActionUtils from "../utils";
import prerenderAction from "./Action";

export function setupPrerenderAction(program: Command) {
  if (!ActionUtils.shouldInclude("prerender")) return;
  program
    .command("prerender")
    .description("TODO")
    .action(async (options) => {
      /**
       * TODO implement logic for
       *
       * - determine current version
       * - determine latest version
       *
       */

      try {
        await prerenderAction({});
      } catch (e) {
        /**
         * Report error if telemetry is enabled
         */
      }
    });
}
