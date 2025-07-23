export default {
  minify: true,
  sourcemap: "external" as const,
  format: "esm",
  target: "browser",
  splitting: false,
  packages: "bundle" as const,
  external: [],
  define: {
    "process.env.NODE_ENV": '"production"',
  },
} as Partial<Bun.BuildConfig>;
