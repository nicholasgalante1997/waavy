import path from "path";
import { fileURLToPath } from "url";
import runCreateWaavyProject from "./lib/createWaavyProject.js";
import {
  promptForName,
  promptForScriptingLangPreference,
  promptForProgrammingLangPreference,
  promptForFrameworkPreference,
} from "./lib/prompts/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const __waavyDir = path.dirname(__dirname);

const name = await promptForName();
const scriptingLang = await promptForScriptingLangPreference();
const lang = await promptForProgrammingLangPreference();
const framework = await promptForFrameworkPreference();

await runCreateWaavyProject({
  name,
  waavyDir: __waavyDir,
  cwd: process.cwd(),
  scriptingLang,
  lang,
  framework,
});
