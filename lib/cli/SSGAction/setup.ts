import { type Command } from "commander";
import ActionUtils from "../utils";
import ssgAction from "./Action";

export function setupStaticSiteGenAction(program: Command) {
  if (!ActionUtils.shouldInclude("ssg")) return;
  program
    .command("ssg")
    .description("Static Site Generation with Waavy")
    .action(async (options) => {
      /**
       * TODO implement logic for
       *
       * - determine current version
       * - determine latest version
       *
       */

      try {
        await ssgAction({});
      } catch (e) {
        /**
         * Report error if telemetry is enabled
         */
      }
    });
}
