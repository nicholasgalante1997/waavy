import path, { resolve, join } from "path";
import { exists, mkdir, readdir } from "fs/promises";

import debug from "debug";

import { streamFile } from "./utils/stream.js";

const createWaavyProjectLogger = debug("waavy:create-waavy-app");

export default async function runCreateWaavyProject(options) {
  const dir = resolve(options.cwd, options.name);
  if (await exists(dir)) throw new Error(`Directory already exists: ${dir}`);
  else await mkdir(dir, { recursive: true });

  if (options.scriptingLang === "typescript") {
    await copyTypescriptFiles({ ...options, dir });
  }

  if (options.scriptingLang === "javascript") {
    await copyJavascriptFiles({ ...options, dir });
  }

  _lang: switch (lang) {
    case "rust": {
      _framework: switch (options.framework) {
        case "actix-web": {
          await copyActixWebServerFiles({ ...options, dir });
          break _framework;
        }
      }
      break _lang;
    }
    default:
      throw new Error(`Unsupported language: ${lang}`);
  }
}

async function copyTypescriptFiles(options) {
  const root = options.waavyDir;
  const dir = options.dir;
  const subdirs = ["templates", "www", "typescript"];
  const templates = join(root, ...subdirs);
  return await batchCopyFiles(templates, dir, subdirs, {
    ...options,
    root,
    dir,
  });
}

async function copyJavascriptFiles() {
  const root = options.waavyDir;
  const dir = options.dir;
  const subdirs = ["templates", "www", "javascript"];
  const templates = join(root, ...subdirs);
  return await batchCopyFiles(templates, dir, subdirs, {
    ...options,
    root,
    dir,
  });
}

async function copyActixWebServerFiles() {
  const root = options.waavyDir;
  const dir = options.dir;
  const subdirs = ["templates", "servers", "rust", "actix-web"];
  const templates = join(root, ...subdirs);
  return await batchCopyFiles(templates, dir, subdirs, {
    ...options,
    root,
    dir,
  });
}

async function batchCopyFiles(copySource, dest, subdirs, options) {
  const dirents = await readdir(copySource, {
    encoding: "utf8",
    recursive: true,
    withFileTypes: true,
  });

  const promises = dirents
    .filter((dirent) => dirent.isFile())
    .map((dirent) => {
      return {
        input: join(dirent.parentPath, dirent.name),
        output: getOutputPath(
          { dir: dest },
          dirent,
          path.join(options.root, ...subdirs),
        ),
      };
    })
    .map(async ({ input, output }) => {
      const parentDir = path.dirname(output);

      try {
        await mkdir(parentDir, { recursive: true });
      } catch (e) {
        if (e?.code !== "EEXIST" || !e?.message?.includes("EEXIST")) {
          throw e;
        }
      }

      await streamFile(input, output).then(() => {
        createWaavyProjectLogger(`Copied: ${input} => ${output}`);
      });
    });

  await Promise.all(promises);

  return;
}

function getOutputPath(options, dirent, replacePath) {
  return join(
    options.dir,
    dirent.parentPath.replace(replacePath, ""),
    dirent.name,
  );
}
