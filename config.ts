export default {
  build: {
    sources: {
      cli: {
        main: "lib/index.ts",
        worker: "lib/_worker.tsx",
      },
      exports: {
        server: "lib/exports/server.ts",
        browser: "lib/exports/browser.ts",
      },
    },
    targets: [
      {
        name: "waavy-linux-x64-modern",
        target: "bun-linux-x64-modern",
        platform: "Linux x64 (modern)",
      },
      {
        name: "waavy-linux-x64-baseline",
        target: "bun-linux-x64-baseline",
        platform: "Linux x64 (baseline)",
      },
      {
        name: "waavy-macos-x64",
        target: "bun-darwin-x64",
        platform: "macOS x64",
      },
      {
        name: "waavy-macos-arm64",
        target: "bun-darwin-arm64",
        platform: "macOS ARM64",
      },
      {
        name: "waavy-linux-arm64",
        target: "bun-linux-arm64",
        platform: "Linux ARM64",
      },
      {
        name: "waavy-windows-x64-modern",
        target: "bun-windows-x64-modern",
        platform: "Windows x64 (modern)",
      },
      {
        name: "waavy-windows-x64-baseline",
        target: "bun-windows-x64-baseline",
        platform: "Windows x64 (baseline)",
      },
    ],
    defaultBuildOptions: (external: string[], outdir: string) => ({
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
};
