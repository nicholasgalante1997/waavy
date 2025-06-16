import type { Command } from "commander";

export function setupProgramMetadata(program: Command, version: string) {
  program
    .name("waavy")
    .version(version)
    .description(
      "A library to support rendering React components in non-javascript server environments",
    );

  return program;
}

export function setupProgramActions(
  program: Command,
  setupActionFns: Array<(program: Command) => void>,
) {
  for (const setupActionFn of setupActionFns) {
    setupActionFn(program);
  }

  return program;
}
