import { type Command } from "commander";
import path from "path";
import colors from "picocolors";

import Features from "@/utils/models/Features";

import bundleAction from "./Action";
import { description, command, options } from "./index.metadata";

// https://tldp.org/LDP/abs/html/exitcodes.html
const WAAVY_BUNDLE_EXIT_CODE = 1 as const;

export function setupBundleAction(program: Command) {
  const enabled = Features.isEnabled("COMMAND_LINE_ACTIONS_BUNDLE");
  if (!enabled) return;
  const cmd = program.command(command).description(description);
  options.forEach((option) => cmd.option(option.flags, option.description, option.default));
  cmd.action(async ({ config, ...options }) => {
    try {
      const exists = config && (await Bun.file(config).exists());
      if (exists) {
        const ext = path.extname(config);
        if (ext === ".ts" || ext === ".js" || ext === ".mjs" || ext === ".cjs") {
          try {
            const overrides = (await import(config).then((m) => m?.default)) || {};
            options.config = overrides;
          } catch (e) {
            options.config = {};
          }
        } else if (ext === ".json") {
          try {
            options.config = (await Bun.file(config).json()) || {};
          } catch(e) {
            options.config = {};
          }
        } else {
          options.config = {};
        }
      }

      await bundleAction({ ...options });
    } catch (e) {
      console.error(colors.bold(colors.red(`"waavy bundle" failed, the following error was thrown\n\n\t${e}`)));
      process.exit(WAAVY_BUNDLE_EXIT_CODE);
    }
  });
}
