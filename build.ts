export {};

await Bun.build({
  entrypoints: ['lib/cli.ts'],
  outdir: 'out',
  target: 'bun',
  format: 'esm',
  packages: 'bundle',
  splitting: false,
  sourcemap: 'linked',
  minify: true,
  root: './lib',
  external: []
});
