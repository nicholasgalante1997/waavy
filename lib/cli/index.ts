import type { Command } from "commander";

export function setupProgramMetadata(program: Command) {
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
