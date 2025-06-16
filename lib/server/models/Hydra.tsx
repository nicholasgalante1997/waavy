import React from "react";
import fs from "fs/promises";
import path from "path";

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
    pathToComponent?: string,
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

  setSelector(selector?: string) {
    this.selector = selector;
    return this;
  }

  setImportNonDefaultComponent(name?: string) {
    this.nonDefaultComponentName = name;
    return this;
  }

  setBuildOptions(options: Partial<Bun.BuildConfig>) {
    this.buildOptions = options;
    return this;
  }

  async createBundle<Props>() {
    try {
      if (!this.verify()) {
        throw new Error(
          "Hydra must have a Component, a pathToComponent, and an extension",
        );
      }

      const template = getHydraTemplate(
        this.pathToComponent!,
        getNodeModulesWaavyCache(),
        (this.props || {}) as Props,
        {
          name: this.nonDefaultComponentName,
          selector: this.selector,
        },
      );

      const result = await bundleInlineCode(
        template,
        {
          loader: this.extension || "tsx",
        },
        this.buildOptions,
      );

      if (!result) {
        console.error("Result is undefined");
        process.exit(1);
      }

      if (!result.success) {
        const { logs, outputs } = result;
        throw new Error(
          `JavaScript build failed: ${logs
            .filter((log) => log.level === "error" || log.level === "warning")
            .map((log) => log.message)
            .join(
              "\n",
            )}\n\nGenerated: ${outputs.map((output) => output.path).join(", ")}`,
        );
      }

      if (result.outputs.length === 0) {
        throw new Error(
          `JavaScript build failed: No outputs generated.
          \nGenerated: ${result.outputs.map((output) => output.path).join(", ")}
          \nLogs: ${result.logs.map((log) => log.message).join("\n")}
          `,
        );
      }

      return result.outputs.at(0)?.text();
    } catch (error) {
      console.error(`
            Hydra build failed: 
                ${error}
        `);
    }
  }

  private verify(): boolean {
    if (this.Component == null) return false;
    if (this.extension == null) return false;
    if (this.pathToComponent == null) return false;
    return true;
  }
}

function getHydraTemplate<Props>(
  pathToComponent: string,
  baseDir: string,
  props: Props,
  options: HydraTemplateOptions,
) {
  const componentPath = path.relative(baseDir, pathToComponent);
  const normalizedPath = componentPath.startsWith(".")
    ? componentPath
    : `./${componentPath}`;

  return `
import React from 'react';
import { hydrateRoot } from 'react-dom/client';
import ${getImportName(options?.name)} from "${normalizedPath}";

const props = ${JSON.stringify(props)};
const selector = "${options?.selector || "#waavyroot"}";
const container = document.querySelector(selector);

if (container) {
  hydrateRoot(
    container, 
    React.createElement(${getComponentName(options?.name)}, props)
  );
} else {
  console.error("Container not found:", selector);
}
`;
}

function getNodeModulesWaavyCache() {
  return path.join(process.cwd(), "node_modules", ".cache", "waavy");
}

async function getTempFileInNodeModulesCache(
  extension: string,
  integrityHash: string,
) {
  const cacheDir = getNodeModulesWaavyCache();
  if (!(await fs.exists(cacheDir))) {
    await fs.mkdir(cacheDir, { recursive: true });
  }
  const tempFile = path.join(
    cacheDir,
    `hydration-${integrityHash}.${extension}`,
  );
  return tempFile;
}

export async function bundleInlineCode(
  code: string,
  options: BundleInlineOptions = { loader: "tsx" },
  buildOptionOverrides: Partial<Bun.BuildConfig> = {},
  cache = true,
): Promise<Bun.BuildOutput> {
  /**
   * Implement hash based cache busting
   */
  const integrityHash = await Bun.password.hash(code, {
    algorithm: "bcrypt",
    cost: 17,
  });

  const tempFile = await getTempFileInNodeModulesCache(
    options.loader,
    Date.now().toString(),
  );

  try {
    await fs.writeFile(tempFile, code, "utf8");

    const format = options?.format || "esm";
    const target = options?.target || "browser";
    const minify = options?.minify || true;

    const result = await Bun.build({
      entrypoints: [tempFile],
      target,
      format,
      packages: "bundle",
      external: [],
      minify,
      splitting: false,
      sourcemap: "linked",
      root: ".",
      ...buildOptionOverrides,
    });

    return result;
  } catch (e) {
    console.error(
      "[bundleInlineCode]: An Exception was thrown during an attempt to build. %s",
      e,
    );
    throw e;
  } finally {
    if (!cache) {
      await fs.unlink(tempFile).catch((err) => {
        console.error(
          "[bundleInlineCode::unlink]: Error deleting temp file:",
          err,
        );
      });
    }
  }
}

interface BundleInlineOptions {
  loader: "js" | "jsx" | "ts" | "tsx";
  target?: "browser" | "node" | "bun";
  format?: "esm" | "cjs" | "iife";
  minify?: boolean;
}

type HydraTemplateOptions = {
  name?: string;
  selector?: string;
};

function getImportName(name?: string) {
  name ||= "default";
  return name === "default" ? "WaavyApp" : `{ ${name} }`;
}

function getComponentName(name?: string) {
  name ||= "default";
  return name === "default" ? "WaavyApp" : name;
}
