import { program } from 'commander';

import { mkdir } from "fs/promises";
import path from "path";

type Config = Partial<Bun.BuildConfig>;
type Options = {
    js?: boolean;
    executables?: boolean;
    all?: boolean;
    target?: string;
    verbose?: boolean;
    help?: boolean;
};

const baseConfig: Config = {
  entrypoints: ['lib/cli.tsx'],
  outdir: 'out',
  minify: true,
  sourcemap: 'linked' as const,
  bytecode: true,
  splitting: false,
  root: './lib',
  packages: 'bundle',
  external: ['react', 'react-dom', '@tanstack/react-query'],
};

const targets = [
  { 
    name: 'waavy-linux-x64-modern', 
    target: 'bun-linux-x64-modern',
    platform: 'Linux x64 (modern)',
    format: null,
  },
  { 
    name: 'waavy-linux-x64-baseline', 
    target: 'bun-linux-x64-baseline',
    platform: 'Linux x64 (baseline)',
    format: null
  },
  { 
    name: 'waavy-macos-x64', 
    target: 'bun-darwin-x64',
    platform: 'macOS x64',
    format: null
  },
  { 
    name: 'waavy-macos-arm64', 
    target: 'bun-darwin-arm64',
    platform: 'macOS ARM64',
    format: null,
  },
  { 
    name: 'waavy-linux-arm64', 
    target: 'bun-linux-arm64',
    platform: 'Linux ARM64',
    format: null,
  },
  { 
    name: 'waavy-windows-x64-modern', 
    target: 'bun-windows-x64-modern',
    platform: 'Windows x64 (modern)',
    format: null
  },
  { 
    name: 'waavy-windows-x64-baseline', 
    target: 'bun-windows-x64-baseline',
    platform: 'Windows x64 (baseline)',
    format: null
  },
  {
    name: 'waavy.js',
    target: 'bun',
    platform: '*',
    format: 'esm'
  }
] as const;

program.addHelpText('before', `
Usage: bun run build.ts [options]

Options:
  --js              Build JavaScript bundle only
  --executables     Build executables only  
  --all             Build both JavaScript and executables (default)
  --target=<name>   Build specific target (e.g. --target=linux-x64)
  --verbose, -v     Verbose logging
  --help, -h        Show this help

Available targets:
${targets.map(t => `  ${t.name.padEnd(30)} ${t.platform}`).join('\n')}

Examples:
  bun run build.ts                    # Build everything
  bun run build.ts --js               # JS bundle only
  bun run build.ts --executables      # Executables only
  bun run build.ts --target=linux     # Linux targets only
  bun run build.ts --target=macos-arm64 --verbose  # Specific target with verbose logging
`);

program
  .option('--js', 'Build JavaScript bundle only')
  .option('--executables', 'Build executables only')
  .option('--all', 'Build both JavaScript and executables (default)')
  .option('--target <name>', 'Build specific target (e.g. --target=linux-x64)')
  .option('--verbose, -v', 'Verbose logging')
  .option('--help, -h', 'Show this help')
  .action(async (options: Options) => {})

program.parse(process.argv);

// *********************************** Below is from Claude

const args = process.argv.slice(2);

const shouldBuildExecutables = args.includes('--executables') || args.includes('--all');
const shouldBuildJS = args.includes('--js') || args.includes('--all') || args.length === 0;

const verbose = args.includes('--verbose') || args.includes('-v');
const specificTarget = args.find(arg => arg.startsWith('--target='))?.split('=')[1];


// Helper functions
async function ensureOutDir() {
  try {
    await mkdir(BUILD_CONFIG.outdir, { recursive: true });
    log.debug(`Created output directory: ${BUILD_CONFIG.outdir}`);
  } catch (error) {
    log.warn(`Output directory already exists or couldn't be created: ${error}`);
  }
}

async function buildJS() {
  log.step(1, shouldBuildExecutables ? TARGETS.length + 1 : 1, "Building JavaScript bundle...");
  
  const startTime = performance.now();
  
  try {
    const result = await Bun.build({
      entrypoints: [BUILD_CONFIG.entrypoint],
      outdir: BUILD_CONFIG.outdir,
      target: 'bun',
      format: 'esm',
      packages: 'bundle',
      splitting: false,
      sourcemap: BUILD_CONFIG.sourcemap,
      minify: BUILD_CONFIG.minify,
      root: './lib',
      external: BUILD_CONFIG.external,
    });

    if (result.success) {
      const duration = Math.round(performance.now() - startTime);
      log.success(`JavaScript bundle built in ${duration}ms`);
      if (verbose) {
        result.outputs.forEach(output => {
          log.debug(`Generated: ${output.path} (${Math.round(output.size / 1024)}KB)`);
        });
      }
    } else {
      log.error("JavaScript build failed:");
      result.logs.forEach(buildLog => console.error(buildLog));
      return false;
    }
  } catch (error) {
    log.error(`JavaScript build failed: ${error}`);
    return false;
  }
  
  return true;
}

async function buildExecutable(targetConfig: typeof TARGETS[0], stepNum: number, totalSteps: number) {
  log.step(stepNum, totalSteps, `Building ${targetConfig.platform} executable...`);
  
  const startTime = performance.now();
  const outfile = path.join(BUILD_CONFIG.outdir, targetConfig.name);
  
  try {
    // Build the executable using Bun's CLI --compile flag
    const buildCommand = [
      'bun', 'build',
      '--compile',
      '--minify',
      '--sourcemap', 
      '--bytecode',
      `--target=${targetConfig.target}`,
      `--outfile=${outfile}`,
      // Add external packages
      ...BUILD_CONFIG.external.map(pkg => `--external=${pkg}`),
      BUILD_CONFIG.entrypoint, // Entry point goes last
    ];

    log.debug(`Running: ${buildCommand.join(' ')}`);
    
    const proc = Bun.spawn(buildCommand, {
      stdout: verbose ? 'inherit' : 'pipe',
      stderr: 'pipe',
    });
    
    const exitCode = await proc.exited;
    
    if (exitCode === 0) {
      const duration = Math.round(performance.now() - startTime);
      
      // Get file size
      try {
        const stat = await Bun.file(outfile).size;
        const sizeInMB = (stat / (1024 * 1024)).toFixed(1);
        log.success(`${targetConfig.platform} executable built in ${duration}ms (${sizeInMB}MB)`);
      } catch {
        log.success(`${targetConfig.platform} executable built in ${duration}ms`);
      }
    } else {
      log.error(`Failed to build ${targetConfig.platform} executable (exit code: ${exitCode})`);
      const stderr = await new Response(proc.stderr).text();
      if (stderr) console.error(stderr);
      return false;
    }
  } catch (error) {
    log.error(`Failed to build ${targetConfig.platform} executable: ${error}`);
    return false;
  }
  
  return true;
}

async function buildExecutables() {
  const targets = specificTarget 
    ? TARGETS.filter(t => t.name.includes(specificTarget) || t.target.includes(specificTarget))
    : TARGETS;
    
  if (targets.length === 0) {
    log.error(`No targets found matching: ${specificTarget}`);
    return false;
  }
  
  if (specificTarget) {
    log.info(`Building specific target(s): ${targets.map(t => t.platform).join(', ')}`);
  }
  
  const baseStep = shouldBuildJS ? 2 : 1;
  const totalSteps = targets.length + (shouldBuildJS ? 1 : 0);
  
  let successCount = 0;
  
  for (let i = 0; i < targets.length; i++) {
    const success = await buildExecutable(targets[i], baseStep + i, totalSteps);
    if (success) successCount++;
  }
  
  if (successCount === targets.length) {
    log.success(`All ${targets.length} executables built successfully!`);
    return true;
  } else {
    log.error(`${targets.length - successCount}/${targets.length} executable builds failed`);
    return false;
  }
}

function printUsage() {
  console.log(`
Usage: bun run build.ts [options]

Options:
  --js              Build JavaScript bundle only
  --executables     Build executables only  
  --all             Build both JavaScript and executables (default)
  --target=<name>   Build specific target (e.g. --target=linux-x64)
  --verbose, -v     Verbose logging
  --help, -h        Show this help

Available targets:
${TARGETS.map(t => `  ${t.name.padEnd(30)} ${t.platform}`).join('\n')}

Examples:
  bun run build.ts                    # Build everything
  bun run build.ts --js               # JS bundle only
  bun run build.ts --executables      # Executables only
  bun run build.ts --target=linux     # Linux targets only
  bun run build.ts --target=macos-arm64 --verbose  # Specific target with verbose logging
`);
}

// Main execution
async function main() {
  if (args.includes('--help') || args.includes('-h')) {
    printUsage();
    process.exit(0);
  }
  
  const buildStartTime = performance.now();
  log.info("🚀 Starting Waavy build process...");
  
  if (verbose) {
    log.debug(`Configuration: ${JSON.stringify(BUILD_CONFIG, null, 2)}`);
    log.debug(`Build JS: ${shouldBuildJS}, Build Executables: ${shouldBuildExecutables}`);
  }
  
  await ensureOutDir();
  
  let allSuccessful = true;
  
  if (shouldBuildJS) {
    allSuccessful = await buildJS() && allSuccessful;
  }
  
  if (shouldBuildExecutables) {
    allSuccessful = await buildExecutables() && allSuccessful;
  }
  
  const totalDuration = Math.round(performance.now() - buildStartTime);
  
  if (allSuccessful) {
    log.success(`🎉 Build completed successfully in ${totalDuration}ms`);
    process.exit(0);
  } else {
    log.error(`💥 Build failed after ${totalDuration}ms`);
    process.exit(1);
  }
}

// Run the build
main().catch(error => {
  log.error(`Unexpected error: ${error}`);
  process.exit(1);
});