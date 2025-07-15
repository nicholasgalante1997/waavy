import { type Command } from "commander";
import Features from "@/utils/models/Features";
import ssgAction from "./Action";

export function setupStaticSiteGenAction(program: Command) {
  const enabled = Features.isEnabled("COMMAND_LINE_ACTIONS_SSG");
  if (!enabled) return;

  program
    .command("ssg")
    .description("Static Site Generation with Waavy")
    .action(async (options) => {
      try {
        await ssgAction({});
      } catch (e) {}
    });
}
