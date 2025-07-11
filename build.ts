import { program } from "commander";
import debug from "debug";
import { mkdir } from "fs/promises";
import path from "path";
import util from "util";

import config from "./config";
import Package from "./package.json";

const log = debug("waavy:build");
const outdir = path.join(process.cwd(), "out");
const external = Object.keys(Package.peerDependencies);
const sources = config.build.sources;
const targets = config.build.targets;
const defaultBuildOptions: Partial<Bun.BuildConfig> =
  config.build.defaultBuildOptions(external, outdir);

type Options = {
  js?: boolean;
  executables?: boolean;
  all?: boolean;
  target?: string;
  verbose?: boolean;
  help?: boolean;
};

program.addHelpText(
  "before",
  `
Usage: bun run build.ts [options]

Options:
  --js              Build JavaScript bundle only
  --executables     Build executables only  
  --all             Build both JavaScript and executables (default)
  --target=<name>   Build specific target (e.g. --target=linux-x64)
  --verbose, -v     Verbose logging
  --help, -h        Show this help

Available targets:
${targets.map((t) => `  ${t.name.padEnd(30)} ${t.platform}`).join("\n")}

Examples:
  bun run build.ts                    # Build everything
  bun run build.ts --js               # JS bundle only
  bun run build.ts --executables      # Executables only
  bun run build.ts --target=linux     # Linux targets only
  bun run build.ts --target=macos-arm64 --verbose  # Specific target with verbose logging
`,
);

program
  .option("--js", "Build JavaScript bundle only")
  .option("--executables", "Build executables only")
  .option("--all", "Build both JavaScript and executables (default)")
  .option("--target <name>", "Build specific target (e.g. --target=linux-x64)")
  .option("--verbose, -v", "Verbose logging")
  .option("--help, -h", "Show this help")
  .action(build);

program.parse(process.argv);

async function ensureOutDir() {
  try {
    await mkdir(outdir, { recursive: true });
    log.extend("debug")(`Created output directory: ${outdir}`);
  } catch (error) {
    log.extend("warn")(
      `Output directory already exists or couldn't be created: ${error}`,
    );
  }
}

async function buildSources(verbose = false) {
  const nodeRuntimeOutputs = [sources.exports.browser, sources.exports.server];

  let succeeded = true;

  log("Starting node runtime output generation...");
  for (const nodeOutput of nodeRuntimeOutputs) {
    const startTime = performance.now();
    try {
      const result = await Bun.build({
        ...defaultBuildOptions,
        root: "./lib/exports",
        entrypoints: [nodeOutput],
        target: nodeOutput.includes("browser") ? "browser" : "node",
        format: "esm",
      });
      handleBunBuildOutput(result, startTime, verbose);
    } catch (error) {
      log.extend("error")(`Node build failed: ${error}`);
      succeeded = false;
    }
  }

  return succeeded;
}

async function buildExecutable(
  targetConfig: (typeof targets)[0],
  verbose = false,
) {
  const startTime = performance.now();
  const outfile = path.join(outdir, targetConfig.name);

  try {
    /**
     * Currently, there is no Javascript API for Bun's "Single File Executable"
     * And so in order to build the executable, we have to use the CLI based build api
     * @see https://bun.sh/docs/bundler/executables
     */
    const buildCommand: string[] = [
      "bun",
      "build",
      "--compile",
      "--minify",
      "--sourcemap",
      `--target=${targetConfig.target}`,
      ...external.map((pkg) => `--external=${pkg}`),
      sources.cli.main,
      sources.cli.worker,
      `--outfile=${outfile}`,
    ];

    log.extend("debug")(`Running: ${buildCommand.join(" ")}`);

    const proc = Bun.spawn(buildCommand, {
      stdout: verbose ? "inherit" : "pipe",
      stderr: "pipe",
    });

    const exitCode = await proc.exited;

    if (exitCode === 0) {
      const duration = Math.round(performance.now() - startTime);

      try {
        const stat = Bun.file(outfile).size;
        const sizeInMB = (stat / (1024 * 1024)).toFixed(1);
        log(
          `${targetConfig.platform} executable built in ${duration}ms (${sizeInMB}MB)`,
        );
      } catch {
        log(`${targetConfig.platform} executable built in ${duration}ms`);
      }
    } else {
      log.extend("error")(
        `Failed to build ${targetConfig.platform} executable (exit code: ${exitCode})`,
      );
      const stderr = await new Response(proc.stderr).text();
      if (stderr) console.error(stderr);
      return false;
    }
  } catch (error) {
    log.extend("error")(
      `Failed to build ${targetConfig.platform} executable: ${error}`,
    );
    return false;
  }

  return true;
}

async function buildExecutables(specificTarget?: string, verbose = false) {
  const matches = specificTarget
    ? targets.filter(
        (t) =>
          t.name.includes(specificTarget) || t.target.includes(specificTarget),
      )
    : targets;

  if (matches.length === 0) {
    log.extend("error")(`No targets found matching: ${specificTarget}`);
    return false;
  }

  if (specificTarget) {
    log(
      `Building specific target(s): ${targets.map((t) => t.platform).join(", ")}`,
    );
  }

  let successCount = 0;

  for (let i = 0; i < targets.length; i++) {
    const success = await buildExecutable(matches[i], verbose);
    if (success) successCount++;
  }

  if (successCount === targets.length) {
    log(`All ${targets.length} executables built successfully!`);
    return true;
  } else {
    log.extend("error")(
      `${targets.length - successCount}/${targets.length} executable builds failed`,
    );
    return false;
  }
}

function handleBunBuildOutput(
  output: Awaited<ReturnType<typeof Bun.build>>,
  startTime?: number,
  verbose = false,
) {
  if (output.success) {
    const duration = Math.round(performance.now() - (startTime || 0));
    log(`JavaScript bundle built in ${duration}ms`);
    if (verbose) {
      output.outputs.forEach((output) => {
        log.extend("debug")(
          `Generated: ${output.path} (${Math.round(output.size / 1024)}KB)`,
        );
      });
    }
  } else {
    log.extend("error")("JavaScript build failed:");
    output.logs.forEach((buildLog) => console.error(buildLog));
    throw new Error("JavaScript build failed");
  }
}

async function build(options: Options) {
  const shouldBuildExecutables = options.executables || options.all;
  const shouldBuildJS = options.js || options.all || !options.executables;

  const verbose = options.verbose;
  const specificTarget = options.target;

  if (verbose) {
    debug.enable("waavy:*");
    log(`Verbose logging enabled!`);
    log(util.inspect(options, true, 4, true));
    log(util.inspect(targets, true, 4, true));
  }

  const buildStartTime = performance.now();
  log("🚀 Starting Waavy build process...");

  ensureOutDir();

  let allSuccessful = true;

  if (shouldBuildJS) {
    allSuccessful = (await buildSources(verbose)) && allSuccessful;
  }

  if (shouldBuildExecutables) {
    allSuccessful =
      (await buildExecutables(specificTarget, verbose)) && allSuccessful;
  }

  const totalDuration = Math.round(performance.now() - buildStartTime);

  if (allSuccessful) {
    log(`🎉 Build completed successfully in ${totalDuration}ms`);
    process.exit(0);
  } else {
    log.extend("error")(`💥 Build failed after ${totalDuration}ms`);
    process.exit(1);
  }
}
