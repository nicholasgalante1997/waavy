import type { BuildConfig } from "bun";

const WebClientConfiguration = {
  target: "browser",
  format: "esm",
  splitting: false,
  sourcemap: "linked",
  minify: true,
  root: process.cwd(),
  external: [],
  packages: "bundle",
  publicPath: "/",
} as Partial<BuildConfig>;

export default WebClientConfiguration;
