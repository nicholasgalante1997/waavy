import chalk from "chalk";
import type { Command } from "commander";
import _ from "@pkg/config";

export function setupProgramMetadata(
  program: Command,
  version: string,
): Command {
  return program
    .name(chalk.bold(chalk.blueBright(_.name)))
    .version(version)
    .description(chalk.dim(_.description));
}

export function setupProgramActions(
  program: Command,
  setupCommands: Array<(program: Command) => void>,
) {
  setupCommands.forEach((setupCmd) => setupCmd(program));
  return program;
}
