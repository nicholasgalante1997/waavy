export function warnUnsupportedPlatformAndExit() {
  console.error(`Unsupported platform: ${platform} ${arch}
    
    Waavy only supports the following platforms:
    - Linux (x64, arm64)
    - macOS (x64, arm64)
    - Windows (x64)

    If you are on a different platform and you want to use waavy, please come drop a note in the GitHub repository:

      https://github.com/nicholasgalante1997/waavy/issues/new/
    
    If you are on a supported platform and still see this message, please check your Node.js version and ensure it is up to date.
    Supported Node.js versions: 20.x, 22.x, 24.x
    Supported Bun versions: 1.x
  `);
  process.exit(1);
}

/**
 * @name warnUnsupportedCommandAndExit
 * @param {string} command
 */
export function warnUnsupportedCommandAndExit(command) {
  console.error(`Unsupported command: ${command}
    
    Waavy only supports the following commands:

    - bundle
    - create
    - prerender
    - render
    - ssg
    - upgrade

    If you are trying to run experimental or pre-release commands, please check your version to ensure they are available and supported.
  `);

  process.exit(1);
}
