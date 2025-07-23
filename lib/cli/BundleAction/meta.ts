export const description = `Bundle client side javascript into production assets.

The "waavy" bundle command is a thin wrapper around the "bun build" api, with sane defaults for working with React.

example:
    waavy bundle # bundles ./www/src/browser => ./waavy-out
    waavy bundle --dir ./pages # bundles ./pages => ./waavy-out
    waavy bundle --dir ./pages --out ./out # bundles ./pages => ./out
    waavy bundle --config ./waavy.bundler.ts --clean # bundles ./www/src/browser => ./waavy-out with merged config values from ./waavy.bundler.ts & removes ./waavy-out before building

For now this is intended to be an extremely simple Bundler API wrapper, with minimal frills.

For more information visit https://waavy.dev/bundler
`;

export const command = "bundle";

export const options = [
  {
    flags: "-d, --dir <input-directory>",
    description: "The input directory to bundle",
    default: "./www/src/browser",
  },
  {
    flags: "-o, --out <output-directory>",
    description: 'Where to put the built output files. Default: "waavy-out"',
    default: "./waavy-out",
  },
  {
    flags: "-c, --config <file>",
    description:
      "A build config ts file that can be used to override default build settings.",
    default: "waavy.bundler.ts",
  },
  {
    flags: "--clean",
    description: "Clean the output directory before building.",
    default: false,
  },
  {
    flags: "--verbose",
    description: "Verbose output.",
    default: false,
  },
  {
    flags: "--dry-run",
    description:
      "Only show what would be built, don't actually build anything.",
    default: false,
  },
] as const;
