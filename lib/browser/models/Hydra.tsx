import React from "react";

import fs from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

import { $relative } from "@/utils";

export default class Hydra<Props> {
  Component?: React.ComponentType<Props>;
  props?: Props;
  pathToComponent?: string;
  selector?: string;

  extension?: "js" | "jsx" | "ts" | "tsx" = "tsx";

  nonDefaultComponentName?: string = undefined;
  buildOptions: Partial<Bun.BuildConfig> = {};

  static create<Props>() {
    return new Hydra<Props>();
  }

  constructor(
    Component?: React.ComponentType<Props>,
    props?: Props,
    pathToComponent?: string
  ) {
    this.Component = Component;
    this.props = props;
    this.pathToComponent = pathToComponent;
    this.selector = "#waavyroot";
  }

  setComponent(Component: React.ComponentType<Props>) {
    this.Component = Component;
    return this;
  }

  setProps(props: Props) {
    this.props = props;
    return this;
  }

  setPathToComponent(pathToComponent: string) {
    this.pathToComponent = pathToComponent;
    return this;
  }

  setExtension(extension: "js" | "jsx" | "ts" | "tsx") {
    this.extension = extension;
    return this;
  }

  setSelector(selector: string) {
    this.selector = selector;
    return this;
  }

  setImportNonDefaultComponent(name: string) {
    this.nonDefaultComponentName = name;
    return this;
  }

  setBuildOptions(options: Partial<Bun.BuildConfig>) {
    this.buildOptions = options;
    return this;
  }

  async createBundle<Props>() {
    try {
      const result = await bundleInlineCode(
        getHydraTemplate(this.pathToComponent!, this.props!, {
          name: this.nonDefaultComponentName,
          selector: this.selector,
        }),
        {
          loader: this.extension || "tsx",
        },
        this.buildOptions
      );
      
      if (!result.success) {
        const { logs, outputs } = result;
        throw new Error(
          `JavaScript build failed: ${logs
            .filter((log) => log.level === "error" || log.level === "warning")
            .map((log) => log.message)
            .join("\n")}\n\nGenerated: ${outputs.map((output) => output.path).join(", ")}`
        );
      }

      if (result.outputs.length === 0) {
        throw new Error(
          `JavaScript build failed: No outputs generated.
          \nGenerated: ${result.outputs.map((output) => output.path).join(", ")}
          \nLogs: ${result.logs.map((log) => log.message).join("\n")}
          `
        );
      }

      return result.outputs.at(0)?.text()
    } catch (error) {
        console.error(`
            Hydra build failed: 
                ${error}
        `)
    }
  }
}

interface BundleInlineOptions {
  loader: "js" | "jsx" | "ts" | "tsx";
  target?: "browser" | "node" | "bun";
  format?: "esm" | "cjs" | "iife";
  minify?: boolean;
}

export async function bundleInlineCode(
  code: string,
  options: BundleInlineOptions = { loader: "tsx" },
  buildOptionOverrides: Partial<Bun.BuildConfig> = {}
) {
  const extensions = {
    js: ".js",
    jsx: ".jsx",
    ts: ".ts",
    tsx: ".tsx",
  };

  const tempDir = await fs.mkdtemp(join(tmpdir(), "waavy-"));
  const tempFile = join(tempDir, `bundle${extensions[options?.loader]}`);

  try {
    await fs.writeFile(tempFile, code, "utf8");

    const result = await Bun.build({
      target: "browser",
      format: "esm",
      splitting: false,
      sourcemap: "linked",
      minify: true,
      root: process.cwd(),
      external: [],
      packages: "bundle",
      publicPath: "/",
      ...buildOptionOverrides,
      entrypoints: [tempFile],
    });

    if (!result.success) {
      throw new Error(
        `Bundle failed: ${result.logs.map((log) => log.message).join("\n")}`
      );
    }

    return result;
  } finally {
    try {
      await fs.unlink(tempFile);
      await fs.rmdir(tempDir);
    } catch (cleanupError) {
      console.warn("Failed to cleanup temp files:", cleanupError);
    }
  }
}

type HydraTemplateOptions = {
  name?: string;
  selector?: string;
};

function getHydraTemplate<Props>(
  pathToComponent: string,
  props: Props,
  options: HydraTemplateOptions
) {
  return `import React from "react";import { hydrateRoot } from "react-dom/client";import ${getImportName(options?.name)} from "${$relative(pathToComponent, import.meta.url)}";const props = JSON.parse("${JSON.stringify(props)}");hydrateRoot(document.querySelector("${options?.selector || "#waavyroot"}"), <${getComponentName(options?.name)} {...props} />);`;
}

function getImportName(name?: string) {
  name ||= "default";
  return name === "default" ? "WaavyApp" : `{ ${name} }`;
}

function getComponentName(name?: string) {
  name ||= "default";
  return name === "default" ? "WaavyApp" : name;
}
