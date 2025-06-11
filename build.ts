import { program } from "commander";
import debug from "debug";
import { mkdir } from "fs/promises";
import path from "path";
import util from "util";

const log = debug("waavy:build");

type Options = {
  js?: boolean;
  executables?: boolean;
  all?: boolean;
  target?: string;
  verbose?: boolean;
  help?: boolean;
};

const baseConfig = {
  entrypoints: ["lib/cli.tsx"],
  outdir: "out",
  minify: true,
  sourcemap: "linked" as const,
  bytecode: true,
  splitting: false,
  root: "./lib",
  packages: "bundle" as const,
  external: ["react", "react-dom", "@tanstack/react-query"],
};

const targets = [
  {
    name: "waavy-linux-x64-modern",
    target: "bun-linux-x64-modern",
    platform: "Linux x64 (modern)",
    format: null,
  },
  {
    name: "waavy-linux-x64-baseline",
    target: "bun-linux-x64-baseline",
    platform: "Linux x64 (baseline)",
    format: null,
  },
  {
    name: "waavy-macos-x64",
    target: "bun-darwin-x64",
    platform: "macOS x64",
    format: null,
  },
  {
    name: "waavy-macos-arm64",
    target: "bun-darwin-arm64",
    platform: "macOS ARM64",
    format: null,
  },
  {
    name: "waavy-linux-arm64",
    target: "bun-linux-arm64",
    platform: "Linux ARM64",
    format: null,
  },
  {
    name: "waavy-windows-x64-modern",
    target: "bun-windows-x64-modern",
    platform: "Windows x64 (modern)",
    format: null,
  },
  {
    name: "waavy-windows-x64-baseline",
    target: "bun-windows-x64-baseline",
    platform: "Windows x64 (baseline)",
    format: null,
  },
  {
    name: "waavy.js",
    target: "bun",
    platform: "*",
    format: "esm",
  },
];

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
`
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
    await mkdir(baseConfig.outdir!, { recursive: true });
    log.extend("debug")(`Created output directory: ${baseConfig.outdir}`);
  } catch (error) {
    log.extend("warn")(
      `Output directory already exists or couldn't be created: ${error}`
    );
  }
}

async function buildBunRuntimeOutput(verbose = false) {
  const startTime = performance.now();

  try {
    const result = await Bun.build({
      ...baseConfig,
      entrypoints: [...baseConfig.entrypoints!],
      bytecode: false,
      target: 'bun',
      format: 'esm',
    });

    if (result.success) {
      const duration = Math.round(performance.now() - startTime);
      log(`JavaScript bundle built in ${duration}ms`);
      if (verbose) {
        result.outputs.forEach((output) => {
          log.extend("debug")(
            `Generated: ${output.path} (${Math.round(output.size / 1024)}KB)`
          );
        });
      }
    } else {
      log.extend("error")("JavaScript build failed:");
      result.logs.forEach((buildLog) => console.error(buildLog));
      return false;
    }
  } catch (error) {
    log.extend("error")(`JavaScript build failed: ${error}`);
    return false;
  }

  return true;
}

async function buildExecutable(
  targetConfig: (typeof targets)[0],
  verbose = false
) {
  const startTime = performance.now();
  const outfile = path.join(baseConfig.outdir!, targetConfig.name);

  try {
    // Build the executable using Bun's CLI --compile flag
    const buildCommand: string[] = [
      "bun",
      "build",
      "--compile",
      "--minify",
      "--sourcemap",
      "--bytecode",
      `--target=${targetConfig.target}`,
      `--outfile=${outfile}`,
      // Add external packages
      ...baseConfig.external!.map((pkg) => `--external=${pkg}`),
      baseConfig.entrypoints?.at(0) as string, // Entry point goes last
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
          `${targetConfig.platform} executable built in ${duration}ms (${sizeInMB}MB)`
        );
      } catch {
        log(`${targetConfig.platform} executable built in ${duration}ms`);
      }
    } else {
      log.extend("error")(
        `Failed to build ${targetConfig.platform} executable (exit code: ${exitCode})`
      );
      const stderr = await new Response(proc.stderr).text();
      if (stderr) console.error(stderr);
      return false;
    }
  } catch (error) {
    log.extend("error")(
      `Failed to build ${targetConfig.platform} executable: ${error}`
    );
    return false;
  }

  return true;
}

async function buildExecutables(specificTarget?: string, verbose = false) {
  const matches = specificTarget
    ? targets.filter(
        (t) =>
          t.name.includes(specificTarget) || t.target.includes(specificTarget)
      )
    : targets;

  if (matches.length === 0) {
    log.extend("error")(`No targets found matching: ${specificTarget}`);
    return false;
  }

  if (specificTarget) {
    log(
      `Building specific target(s): ${targets.map((t) => t.platform).join(", ")}`
    );
  }

  let successCount = 0;

  for (let i = 0; i < targets.length - 1; i++) {
    const success = await buildExecutable(matches[i], verbose);
    if (success) successCount++;
  }

  if (successCount === targets.length - 1) {
    log(`All ${targets.length} executables built successfully!`);
    return true;
  } else {
    log.extend("error")(
      `${targets.length - successCount}/${targets.length} executable builds failed`
    );
    return false;
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
    log(util.inspect(baseConfig, true, 4, true));
    log(util.inspect(targets, true, 4, true));
  }

  const buildStartTime = performance.now();
  log("🚀 Starting Waavy build process...");

  ensureOutDir();

  let allSuccessful = true;

  if (shouldBuildJS) {
    allSuccessful = (await buildBunRuntimeOutput(verbose)) && allSuccessful;
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
};
