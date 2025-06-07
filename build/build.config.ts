type BunBuildConfig = Parameters<typeof Bun.build>[0];

export const base: BunBuildConfig = {
    entrypoints: ['lib/cli.tsx'],
    outdir: './out',
    target: 'bun',
    format: 'esm',
    splitting: false,
    minify: true,
    external: ['react', 'react-dom']
};