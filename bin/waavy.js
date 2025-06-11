#!/usr/bin/env node
import child_process from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPPORTED_PLATFORMS = ["linux", "darwin", "win32"];
const SUPPORTED_ARCHS = ["x64", "arm64"];

const platform = process.platform;
const arch = process.arch;

if (
  !SUPPORTED_PLATFORMS.includes(platform) ||
  !SUPPORTED_ARCHS.includes(arch)
) {
  console.error(`
    Unsupported platform: ${platform} ${arch}
    
    Waavy only supports the following platforms:
    - Linux (x64, arm64)
    - macOS (x64, arm64)
    - Windows (x64)

    If you are on a different platform and you want to use waavy, please come drop a note in the GitHub repository:
    https://github.com/nicholasgalante1997/waavy/issues/new/
    If you are on a supported platform and still see this message, please check your Node.js version and ensure it is up to date.
    Supported Node.js versions: 20.x, 22.x, 24.x
    Supported Bun versions: ALL (BUN FOREVER 🥟)
    `);
  process.exit(1);
}

const binaryName =
  "waavy-" + platform + "-" + ((arch === "x64" && platform === "linux")
    ? "x64-modern"
    : arch + (platform === "win32" ? ".exe" : ""));

const binaryPath = path.join(__dirname, binaryName);

if (!fs.existsSync(binaryPath)) {
  console.error("Binary not found. Try reinstalling the package. \n" + binaryPath);
  process.exit(1);
}

const child = child_process.spawn(binaryPath, process.argv.slice(2), {
  stdio: "inherit",
  env: {
    ...process.env,
    NODE_ENV: "production",
    WAAVY_BIN: binaryPath,
  },
});

child.on("exit", (code) => {
  process.exit(code);
});
