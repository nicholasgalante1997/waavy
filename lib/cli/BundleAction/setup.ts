import { type Command } from "commander";
import path from "path";

import Features from "@/utils/models/Features";

import bundleAction from "./Action";
import { description, command, options } from "./meta";

export function setupBundleAction(program: Command) {
  const enabled = Features.isEnabled("COMMAND_LINE_ACTIONS_BUNDLE");
  if (!enabled) return;
  const cmd = program.command(command).description(description);
  options.forEach((option) => cmd.option(option.flags, option.description, option.default));
  cmd.action(async ({ config, ...options }) => {
    try {
      const exists = config && (await Bun.file(config).exists());
      const ext = path.extname(config);

      if (exists && ext === ".ts") {
        try {
          const overrides = (await import(config).then((m) => m?.default)) || {};
          options.config = overrides;
        } catch (e) {
          options.config = {};
        }
      } else if (exists && ext === ".json") {
        options.config = (await Bun.file(config).json()) || {};
      } else {
        options.config = {};
      }

      await bundleAction({ ...options });
    } catch (e) {}
  });
}
