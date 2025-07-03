import type { Command } from "commander";
import type Workers from "@/workers";

export function setupProgramMetadata(
  program: Command,
  version: string,
  workerManager?: Workers,
) {
  program
    .name("waavy")
    .version(version)
    .description(
      "A library to support rendering React components in non-javascript server environments",
    );

  if (workerManager) {
    Object.defineProperty(program, "_workerManager", {
      get(): Workers {
        return workerManager;
      },
      set(v) {
        /** No overwriting workerManager */
      },
    });
  }

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
