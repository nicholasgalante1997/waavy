import { input, select } from "@inquirer/prompts";
import { type Command } from "commander";
import ActionUtils from "../utils";
import createAction from "./Action";

export function setupCreateAction(program: Command) {
  if (!ActionUtils.shouldInclude("create")) return;
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
