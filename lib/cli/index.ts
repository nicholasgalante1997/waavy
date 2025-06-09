import type { Command } from "commander";

export function setupProgramMetadata(program: Command) {
  program
    .name("@supra-dev/react")
    .version("1.0.0-alpha.1")
    .description("A library to support rendering React components in non-js server environments");

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
