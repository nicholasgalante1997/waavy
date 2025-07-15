import { input, select } from "@inquirer/prompts";
import { type Command } from "commander";
import Features from "@/utils/models/Features";
import createAction from "./Action";

export function setupCreateAction(program: Command) {
  const enabled = Features.isEnabled("COMMAND_LINE_ACTIONS_CREATE");
  if (!enabled) return;

  program
    .command("create")
    .description("Create a new waavy project")
    .action(async () => {
      /**
       * Use @inquirer/prompt to get info about project generation
       */

      await createAction({});
    });
}
