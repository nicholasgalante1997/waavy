import { type Command } from "commander";
import Features from "@/utils/models/Features";
import upgradeAction from "./Action";

export function setupUpgradeAction(program: Command) {
  const enabled = Features.isEnabled("COMMAND_LINE_ACTIONS_UPGRADE");
  if (!enabled) return;

  program
    .command("upgrade")
    .description("Update the global waavy executable to the latest version")
    .option(
      "-r, --requested-version <version>",
      "Optional, the version to upgrade to. Defaults to latest.",
    )
    .action(async (options) => {
      try {
        await upgradeAction({
          currentVersion: "",
          latestVersion: "",
          requestedVersion: "",
        });
      } catch (e) {}
    });
}
