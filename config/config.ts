import path from "path";
import PackageJson from "@pkg/metadata";

const __externalDeps = Object.keys(PackageJson.peerDependencies);
const __requiredDeps = Object.keys(PackageJson.dependencies);
const __devDeps = Object.keys(PackageJson.devDependencies);
const __outdir = path.resolve(path.join(process.cwd(), "out"));

export default {
  name: "waavy",
  description: `A library for rendering React components in non-javascript server runtimes.

For more information, visit: https://github.com/nicholasgalante1997/waavy`,
  build: {
    sources: {
      cli: {
        bundle: "lib/commands/bundle.ts" as const,
        dev: "lib/commands/dev.ts" as const,
        help: "lib/commands/help.ts" as const,
        prerender: "lib/commands/prerender.ts" as const,
        render: "lib/commands/render.ts" as const,
        ssg: "lib/commands/ssg.ts" as const,
        upgrade: "lib/commands/upgrade.ts" as const,
      },
      exports: {
        server: "lib/exports/server.ts" as const,
        browser: "lib/exports/browser.ts" as const,
      },
    },
    targets: [
      {
        name: "waavy-linux-x64-modern",
        target: "bun-linux-x64-modern",
        platform: "linux",
        arch: "x64",
      },
      {
        name: "waavy-linux-x64-baseline",
        target: "bun-linux-x64-baseline",
        platform: "linux",
        arch: "x64",
      },
      {
        name: "waavy-linux-arm64",
        target: "bun-linux-arm64",
        platform: "linux",
        arch: "arm64",
      },
      {
        name: "waavy-macos-x64",
        target: "bun-darwin-x64",
        platform: "darwin",
        arch: "x64",
      },
      {
        name: "waavy-macos-arm64",
        target: "bun-darwin-arm64",
        platform: "darwin",
        arch: "arm64",
      },
      {
        name: "waavy-windows-x64-modern",
        target: "bun-windows-x64-modern",
        platform: "win32",
        arch: "x64",
      },
    ] as const,
    dependencies: {
      development: __devDeps,
      external: __externalDeps,
      required: __requiredDeps,
    },
    output: {
      directory: __outdir,
    },
    defaultBuildOptions: (
      external: string[] = __externalDeps,
      outdir: string = __outdir,
    ): Partial<Bun.BuildConfig> => ({
      external,
      outdir,
      minify: true,
      sourcemap: "linked" as const,
      splitting: false,
      root: "./lib",
      packages: "bundle" as const,
      define: {
        "process.env.NODE_ENV": '"production"',
      },
    }),
  },
  features: {
    COMMAND_LINE_ACTIONS_BUNDLE: true,
    COMMAND_LINE_ACTIONS_CREATE: false,
    COMMAND_LINE_ACTIONS_PRERENDER: false,
    COMMAND_LINE_ACTIONS_RENDER: true,
    COMMAND_LINE_ACTIONS_SSG: false,
    COMMAND_LINE_ACTIONS_UPGRADE: false,
  },
};
