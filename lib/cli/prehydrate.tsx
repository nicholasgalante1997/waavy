import React from "react";
import type { Command } from "commander";

import type { Dirent } from "fs";
import fs from "fs/promises";
import path, { isAbsolute } from "path";

import Hydra from "@/server/models/Hydra";
import { load } from "@/utils";

type WaavyFileConfig = Partial<Omit<PrehydrateActionOptions, "config">>;

export type PrehydrateAction = (
  options: PrehydrateActionOptions,
) => void | Promise<void>;
export type PrehydrateActionOptions<Props = Record<string, unknown>> = {
  /**
   * A path to a waavy.json configuration file
   *
   * If you're project contains a waavy.json file in the root directory of the project,
   * this will be loaded and merged with any command line provided options by default
   */
  config?: WaavyFileConfig;

  /**
   * The path to the file containing the component you wish to bundle for client side hydration
   *
   * If the string provided ends in a double colon namespace delimiter pattern,
   * i.e.
   *
   * `"./src/pages/index.tsx::Dashboard"`,
   *
   * That file will be treated as using a named export pattern,
   * and instead of attempting to load the default export,
   * waavy will attempt to load the string supplied after the delimiter.
   *
   * Inline with waavy conventions,
   * If this file contains a `props` loader function,
   * or a `defaultProps` object, it will be loaded from the file and passed to the component
   */
  file?: string;

  /**
   * Props to be passed to the component.
   *
   * This option only works in conjunction with the `file` option
   *
   * This option is ignored entirely when the `dir` option is used, instead of the `file` option
   */
  props?: Props;

  /**
   * The path to a directory containing files you want to "prehydrate"
   *
   * When you pass a directory to waavy,
   * it assumes that each file contains a default export that is a valid React Component.
   *
   * Currently
   */
  dir?: string;

  /**
   * A path to the output directory that you want the result of the build operation to write to
   *
   * If not supplied, will default to node_modules/.cache/waavy
   * We can presume a waavy project will have node_modules somewhere in it's hierarchal module resolution tree
   * The reason being, we do not bundle react and react-dom, for singleton purposes,
   *
   * so at the very least the consumer will need to bring local copies of these dependencies,
   * which will presumably be in node_modules for import resolution to work properly
   */
  out?: string;

  /**
   * Use the waavy defaults,
   *
   * Sets:
   *
   * dir = "web/pages"
   * out = "node_modules_/.cache/waavy/browser/"
   */
  useDefaults?: boolean;
};

const DEFAULT_OUT_DIR = "node_modules/.cache/waavy/browser" as const;
const DEFAULT_INPUT_DIR = "web/pages" as const;
const DEFAULT_INPUT_FILE = "web/pages/bootstrap.tsx" as const;

const prehydrateAction: PrehydrateAction = async (options) => {
  let {
    config = undefined,
    dir = undefined,
    file = undefined,
    out = DEFAULT_OUT_DIR,
    useDefaults = false,
  } = options;

  if (useDefaults) {
    dir = DEFAULT_INPUT_DIR;
    out = DEFAULT_OUT_DIR;
  }

  if (!dir && config) {
    dir = config.dir;
  }

  if (!config && !dir && !file)
    throw new Error(
      `[waavy::prehydrate] Prehydration Failed. Must supply one of [a valid waavy config (waavy.json), dir option, file option]`,
    );

  try {
    if (dir) {
      await handlePrehydrateDirectory(dir, config || {}, out);
    }

    if (file) {
      await handlePrehydrateFile(file, config || {}, out);
    }
  } catch (e) {
    /**
     * TODO
     */
  }
};

export function setupPrehydrateAction(program: Command) {
  program
    .command("prehydrate")
    .description(
      `Bundles React Components into client side hydration scripts.
        This is particularly useful for speeding up handler times, as this will create a cache of hydration scripts that can either be served via your server as static files, or used for faster embedding of hydration javascript into the html your server responds with.
    `,
    )
    .option(
      "-c, --config [path-to-config-file]",
      "The path to the waavy configuration json file",
      undefined,
    )
    .option(
      "-f, --file [file]",
      "The path to the file to prehydrate/bundle",
      undefined,
    )
    .option("-p, --props [props]", "Props to pass to the component", undefined)
    .option(
      "-d, --dir [dir]",
      "The path to the directory of files you want to prehydrate/bundle",
      undefined,
    )
    .option("-o, --out [outdir]", "The directory to write to", undefined)
    .option("--use-defaults", "Use the waavy sane defaults", false)
    .action(prehydrateAction);

  return program;
}

async function handlePrehydrateDirectory(
  dir: string,
  config?: WaavyFileConfig,
  out?: string,
) {
  const ndir = path.isAbsolute(dir) ? dir : path.resolve(process.cwd(), dir);

  if (!(await fs.exists(ndir))) {
    throw new Error(
      `[waavy::prehydrate] Supplied Directory ${dir} does not exist.`,
    );
  }

  const dirents = (
    await fs.readdir(ndir, {
      withFileTypes: true,
      recursive: true,
      encoding: "utf8",
    })
  ).filter((de) => de.isFile());
  for (const file of dirents) {
    await handlePrehydrateFile(file, config, out);
  }
}

async function handlePrehydrateFile(
  file: string | Dirent<string>,
  config?: WaavyFileConfig,
  out?: string,
) {
  /**
   *
   */
  if (typeof file === "string") {
    await handlePrehydrateStringPath(file, config, out);
  } else {
    await handlePrehydrateDirent(file, config, out);
  }
}

async function handlePrehydrateDirent(
  file: Dirent<string>,
  config?: WaavyFileConfig,
  out?: string,
) {}

async function handlePrehydrateStringPath(
  file: string,
  config?: WaavyFileConfig,
  out?: string,
) {
  const npath = isAbsolute(file) ? file : path.resolve(process.cwd(), file);
  if (!(await fs.exists(npath)))
    throw new Error(
      `[waavy::prehydrate] Supplied file ${npath} does not exist.`,
    );
  const { component, defaultProps, extension, propsLoader } =
    await parseStringDelimiterPattern(file);
}

async function parseStringDelimiterPattern(file: string) {
  const extension = path.extname(file);
  let defaultProps = await load(file, "defaultProps");
  const propsLoader = await load(file, "propsLoader");

  if (defaultProps && !Array.isArray(defaultProps)) {
    defaultProps = [defaultProps];
  }

  /** Named export pattern */
  if (extension.includes("::")) {
    const [ext, name] = extension.split("::");
    const component = await load(file, name);
    return {
      defaultProps,
      extension: ext,
      file,
      component,
      propsLoader,
      imported: name,
    };
  } else {
    const component = await load(file, "default");
    return {
      defaultProps,
      extension,
      file,
      component,
      propsLoader,
      imported: "default",
    };
  }
}

function validateExtension(ext: string) {
  const valid = ["js", "ts", "jsx", "tsx", "wv"];
  if (!valid.includes(ext)) {
    throw new Error(`[waavy::prehydrate] Invalid extension ${ext}`);
  }
}

function getHydraBundleResult<Props = any>(
  Component: React.ComponentType<Props>,
  file: string,
  extension: string,
  props?: Props,
  name?: string,
  selector?: string,
) {
  const h = Hydra.create<Props>();

  h.setComponent(Component)
    .setExtension(extension as any)
    .setProps(props as Props)
    .setImportNonDefaultComponent(name)
    .setPathToComponent(file)
    .setSelector(selector);

  return Promise.all([
    h.createBundle(),
    Promise.resolve(h.createBootstrapPropsInlineScript()),
  ]);
}
