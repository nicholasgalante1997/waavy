#!/usr/bin/env node

import cac from "cac";
import path from "path";
import { fileURLToPath } from "url";
import {
  CommandRunnerBuilder,
  warnUnsupportedPlatformAndExit,
  warnUnsupportedCommandAndExit,
} from "./lib/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const __waavyroot = path.dirname(__dirname);

const SUPPORTED_ARCHS = Object.freeze(["x64", "arm64"]);
const SUPPORTED_PLATFORMS = Object.freeze(["linux", "darwin", "win32"]);
const SUPPORTED_COMMAND_LINE_ARGS = Object.freeze([
  "bundle",
  "create",
  "dev",
  "help",
  "prerender",
  "render",
  "ssg",
  "upgrade",
]);

const platform = process.platform;
const arch = process.arch;

if (
  !SUPPORTED_PLATFORMS.includes(platform) ||
  !SUPPORTED_ARCHS.includes(arch)
) {
  warnUnsupportedPlatformAndExit();
}

const programArgs = cac("waavy").parse();
const command = programArgs.args[0] || "help";

console.log({
  programArgs,
  command,
  argv: process.argv,
});
process.exit();

if (!SUPPORTED_COMMAND_LINE_ARGS.includes(command)) {
  warnUnsupportedCommandAndExit(command);
}

if (command === "create") {
  await import("./create-waavy-app.js");
  process.exit(0);
}

try {
  const commandRunner = new CommandRunnerBuilder()
    .setCommand(command)
    .setArgs(programArgs.args.slice(1))
    .setOptions(programArgs.options)
    .setRuntime(command === "render" ? "executable" : "node")
    .setWaavyroot(__waavyroot)
    .setPlatform(platform)
    .setArch(arch)
    .build();
  const exitCode = await commandRunner.run();
  process.exit(exitCode);
} catch (e) {
  console.error(e);
  process.exit(33);
}
