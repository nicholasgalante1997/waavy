import { type Command } from "commander";
import path from "path";

import Features from "@/utils/models/Features";

import bundleAction from "./Action";
import { description, command, options } from "./meta";

export function setupBundleAction(program: Command) {
  const enabled = Features.isEnabled("COMMAND_LINE_ACTIONS_BUNDLE");
  if (!enabled) return;

  program
    .command(command)
    .description(description)
    .option(options[0].flags, options[0].description, options[0].default)
    .option(options[1].flags, options[1].description, options[1].default)
    .option(options[2].flags, options[2].description, options[2].default)
    .option(options[3].flags, options[3].description, options[3].default)
    .option(options[4].flags, options[4].description, options[4].default)
    .option(options[5].flags, options[5].description, options[5].default)
    .action(async ({ config, ...options }) => {
      console.log({ config, ...options });

      try {
        const exists = await Bun.file(config).exists();
        const ext = path.extname(config);

        if (exists && ext === ".ts") {
          try {
            const overrides =
              (await import(config).then((m) => m?.default)) || {};
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
