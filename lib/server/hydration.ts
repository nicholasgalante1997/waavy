import fs from "fs/promises";
import path from "path";

export function getReactPageHydrationTemplate(useWaavy = false) {}

function getWaavyReactPageHydrationTemplate() {}
function getNonWaavyReactPageHydrationTemplate() {}

function addReactImport(template: string) {
  return template + `import React from "react";`;
}

function addReactDOMClientImport(template: string) {
  return template + `import * as ReactDOMClient from "react-dom/client";`;
}

function addReactPageImport(template: string, pathToComponent: string) {
  return (
    template +
    `import Page from "${path.relative(path.join(getNodeModulesWaavyCache(), ".browser", ".hydration-bundles"), path.resolve(pathToComponent.replace(/\.(t|j)sx?$/, "")))}";`
  );
}

function addWaavyBrowserImport(template: string) {
  return template + `import waavy from "waavy/browser";`;
}

export function getNodeModulesWaavyCache() {
  return path.join(process.cwd(), "node_modules", ".cache", "waavy");
}

export async function getTempFileInNodeModulesCache(extension: string) {
  const cacheDir = path.join(getNodeModulesWaavyCache(), ".browser", ".hydration-bundles");
  try {
    await fs.access(cacheDir, fs.constants.O_DIRECTORY);
  } catch (e: unknown) {
    try {
      await fs.mkdir(cacheDir, { recursive: true });
    } catch (e) {
      if ((e as any)?.code === "EEXIST") {
        // Do nothing
      } else {
        throw e;
      }
    }
  }
  const tempFile = path.join(cacheDir, `hydration-${Bun.randomUUIDv7()}.${extension}`);
  return tempFile;
}
