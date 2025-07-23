import child_process from "child_process";
import path from "path";

/**
 * @typedef {"render" | "create" | "bundle" | "prerender" | "ssg" | "upgrade"} WaavyCommandLineAction
 */

/**
 * @typedef {"node" | "bun" | "executable"} Runtime
 */

/**
 * @typedef {"javascript" | "binary"} KnownExecutableFileTypes
 */

export class CommandRunnerBuilder {
  /**
   * @type {WaavyCommandLineAction | null}
   */
  command = null;

  /**
   * @type {Runtime | null}
   */
  runtime = null;

  /**
   * @type {NodeJS.Platform | null}
   */
  platform = null;

  /**
   * @type {NodeJS.Architecture | null}
   */
  arch = null;

  /**
   * @type {string[] | null}
   */
  args = null;

  /**
   * @type {Record<string, unknown> | null}
   */
  options = null;

  /**
   * @type {string | null}
   */
  waavyroot = null;

  /**
   * @param {WaavyCommandLineAction} command
   */
  setCommand(command) {
    this.command = command;
    return this;
  }

  /**
   * @param {Runtime} runWith
   */
  setRuntime(runtime) {
    if (this.command === "render") this.runtime = "executable";
    else this.runtime = runtime;
    return this;
  }

  /**
   * @param {string} waavyroot
   */
  setWaavyroot(waavyroot) {
    this.waavyroot = waavyroot;
    return this;
  }

  /**
   * @param {string[]} args
   */
  setArgs(args) {
    this.args = args;
    return this;
  }

  /**
   * @param {Record<string, unknown>} options
   */
  setOptions(options) {
    this.options = options;
    return this;
  }

  /**
   * @param {NodeJS.Platform} platform
   */
  setPlatform(platform) {
    this.platform = platform;
    return this;
  }

  /**
   * @param {NodeJS.Architecture} arch
   */
  setArch(arch) {
    this.arch = arch;
    return this;
  }

  /**
   * @throws {Error}
   * @return {CommandRunner}
   */
  build() {
    if (!this.#verify()) {
      throw new Error(
        "[waavy::CommandRunnerBuilder(class)]: Invalid configuration"
      );
    }
    return new CommandRunner(
      this.command,
      this.runtime,
      this.waavyroot,
      this.args,
      this.options,
      this.platform,
      this.arch
    );
  }

  #verify() {
    if (this.command == null) return false;
    if (this.runtime == null) return false;
    if (this.waavyroot == null) return false;
    return true;
  }
}

export class CommandRunner {
  /**
   * @type {WaavyCommandLineAction}
   */
  command;

  /**
   * @type {Runtime}
   */
  runtime;

  /**
   * @type {string[]}
   */
  args;

  /**
   * @type {Record<string, unknown>}
   */
  options;

  /**
   * @type {string}
   */
  waavyroot;

  /**
   * @type {NodeJS.Platform | null}
   */
  platform;

  /**
   * @type {NodeJS.Architecture | null}
   */
  arch;

  /**
   * @param {WaavyCommandLineAction} command
   * @param {Runtime} runtime
   * @param {string | null} waavyroot
   * @param {string[] | null} args
   * @param {Record<string, unknown> | null} options
   * @param {NodeJS.Platform | null} platform
   * @param {NodeJS.Architecture | null} arch
   */
  constructor(
    command,
    runtime,
    waavyroot = null,
    args = null,
    options = null,
    platform = null,
    arch = null
  ) {
    this.command = command;
    this.runtime = runtime;
    this.waavyroot = waavyroot;
    this.args = args || [];
    this.options = options || {};
    this.platform = platform || process.platform;
    this.arch = arch || process.arch;
  }

  /**
   * @param {string[]} args
   */
  setArgs(args) {
    this.args = args;
    return this;
  }

  /**
   * @param {Record<string, unknown>} options
   */
  setOptions(options) {
    this.options = options;
    return this;
  }

  /**
   * @param {string} waavyroot
   */
  setWaavyroot(waavyroot) {
    this.waavyroot = waavyroot;
    return this;
  }

  /**
   * @param {NodeJS.Platform} platform
   */
  setPlatform(platform) {
    this.platform = platform;
    return this;
  }

  /**
   * @param {NodeJS.Architecture} arch
   */
  setArch(arch) {
    this.arch = arch;
    return this;
  }

  /**
   * @throws {Error}
   * @returns {Promise<number>} exit code
   */
  async run() {
    if (!this.#verify()) {
      throw new Error("[waavy::CommandRunner]: Invalid configuration");
    }

    const commandPath = this.#commandFilePath;
    const isExecutable = this.runtime === "executable";

    if (isExecutable) {
      return this.#runBinaryFile(commandPath, this.args);
    } else {
      return this.#runJavascriptFile(commandPath, this.args);
    }
  }

  #verify() {
    if (this.command == null) return false;
    if (this.runtime == null) return false;
    if (this.waavyroot == null) return false;
    return true;
  }

  get #commandFilePath() {
    let filename = "";
    switch (this.command) {
      case "render":
        if (this.runtime === "bun") filename = "commands/bun/render.js";
        else filename = this.#getRenderBinaryFileName();
        break;
      case "bundle":
        filename = "commands/bundle.js";
        break;
      case "prerender":
        filename = "commands/prerender.js";
        break;
      case "ssg":
        filename = "commands/ssg.js";
        break;
      case "upgrade":
        filename = "commands/upgrade.js";
        break;
    }
    return path.resolve(path.join(this.waavyroot, "out", filename));
  }

  /**
   * Optimized version using util.promisify and better error handling
   * @param {string} binaryPath
   * @param {string[]} args
   * @returns {Promise<number>} exitCode
   */
  async #runBinaryFile(binaryPath, args) {
    return new Promise((resolve, reject) => {
      const child = child_process.spawn(
        binaryPath,
        ["render", ...args, ...this.#optionsToStringArray()],
        {
          stdio: "inherit",
          env: {
            ...process.env,
            NODE_ENV: "production",
            WAAVY_BIN: binaryPath,
          },
        }
      );

      child.on("error", reject);

      child.on("exit", (code, signal) => {
        if (signal) {
          reject(new Error(`Process terminated by signal: ${signal}`));
        } else {
          resolve(code ?? 0);
        }
      });
    });
  }

  /**
   * Optimized version using util.promisify and better error handling
   * @param {string} javascriptPath
   * @param {string[]} args
   * @returns {Promise<number>} exitCode
   */
  async #runJavascriptFile(javascriptPath, args) {
    const runtime = this.runtime === "bun" ? "bun" : "node";

    console.log(`${runtime} ${javascriptPath} ${this.command} ${args} ${this.#optionsToStringArray().join(" ")}`);

    return new Promise((resolve, reject) => {
      const child = child_process.spawn(
        runtime,
        [
          javascriptPath,
          this.command,
          ...args,
          ...this.#optionsToStringArray(),
        ],
        {
          stdio: "inherit",
          env: {
            ...process.env,
            NODE_ENV: "production",
            WAAVY_BIN: javascriptPath,
          },
        }
      );

      child.on("error", reject);

      child.on("exit", (code, signal) => {
        if (signal) {
          reject(new Error(`Process terminated by signal: ${signal}`));
        } else {
          resolve(code ?? 0);
        }
      });
    });
  }

  #getRenderBinaryFileName() {
    const platform = this.platform === "darwin" ? "macos" : this.platform;
    const useModern = this.platform === "linux" && this.arch === "x64";
    const archSuffix = useModern ? "-modern" : "";
    const extension = this.platform === "win32" ? ".exe" : "";
    return `bin/render/waavy-${platform}-${this.arch}${archSuffix}-render${extension}`;
  }

  #optionsToStringArray() {
    return Object.entries(this.options || {})
      .filter(([k, value]) => Boolean(value) && k !== "--")
      .map(([key, value]) => [`--${key}`, value])
      .reduce((prev, next) => prev.concat(...next), [])
      .flat();
  }
}
