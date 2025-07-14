import { type Command } from "commander";
import ActionUtils from "../utils";
import upgradeAction from "./Action";

export function setupUpgradeAction(program: Command) {
  if (!ActionUtils.shouldInclude("upgrade")) return;

  program
    .command("upgrade")
    .description("Update the global waavy executable to the latest version")
    .option(
      "-r, --requested-version <version>",
      "Optional, the version to upgrade to. Defaults to latest.",
    )
    .action(async (options) => {
      /**
       * TODO implement logic for
       *
       * - determine current version
       * - determine latest version
       *
       */

      try {
        await upgradeAction({
          currentVersion: "",
          latestVersion: "",
          requestedVersion: "",
        });
      } catch (e) {
        /**
         * Report error if telemetry is enabled
         */
      }
    });
}
