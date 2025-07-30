#!/usr/bin/env node

import cac from "cac";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { version } from "../package.json" with { type: "json" };
import {
  warnUnsupportedPlatformAndExit,
  warnUnsupportedCommandAndExit,
} from "./lib/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const __waavyd = path.dirname(__dirname);

const SUPPORTED_ARCHS = Object.freeze(["x64", "arm64"]);
const SUPPORTED_PLATFORMS = Object.freeze(["linux", "darwin", "win32"]);
const SUPPORTED_COMMAND_LINE_ARGS = Object.freeze([
  "bundle",
  "help",
  "prerender",
  "render",
  "ssg",
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

if (!SUPPORTED_COMMAND_LINE_ARGS.includes(command)) {
  warnUnsupportedCommandAndExit(command);
}

try {
  await import("react");
  await import("react-dom");
} catch(e) {
  console.warn(`[WAAVY::RUNTIME_EXCEPTION] Unable to resolve modules "react" and "react-dom" with the default module resolution algorithm!`);
  console.warn(`waavy is not a global executable and requires a peer installation of "react" and "react-dom" to function properly.`)
  console.error("Cannot find 'react', 'react-dom'. Are they installed locally?")
}

/**
 * TODO rename to just waavy or waavy.exe
 */
const executable = platform === "win32" ? "waavy.exe" : "waavy";
const execPath = path.join(__dirname, executable);

if (!fs.existsSync(execPath)) {
  console.error(
    "Binary not found. Try reinstalling the package. \nSearched for " + execPath,
  );
  process.exit(1);
}

const child = child_process.spawn(execPath, process.argv.slice(2), {
  stdio: "inherit",
  env: {
    ...process.env,
    NODE_ENV: "production",
    WAAVY_BIN: execPath,
    WAAVY_ROOT: __waavyd,
    WAAVY_VERSION: `v${version}`
  },
});

child.on("exit", (code) => {
  process.exit(code);
});