import { input, select } from "@inquirer/prompts";
import colors from "picocolors";

export async function promptForName() {
  return await input({ message: "What is the name of your React project? ⚛️" });
}

export async function promptForScriptingLangPreference() {
  return await select({
    message: "Does this project use TypeScript or JavaScript?",
    choices: [
      {
        value: "typescript",
        name: "TypeScript",
      },
      {
        value: "javascript",
        name: "JavaScript",
      },
    ],
    default: "typescript",
  });
}

export async function promptForProgrammingLangPreference() {
  return await select({
    message:
      "What programming language do you want to use for the server infrastructure?",
    choices: [
      {
        value: "rust",
        name: "Rust 🦀",
      },
      {
        value: "python",
        name: "Python 🐍",
      },
      {
        value: "java",
        name: "Java ☕",
      },
      {
        value: "go",
        name: "Go 🪐",
      },
    ],
    default: "rust",
  });
}

export async function promptForFrameworkPreference(lang) {
  switch (lang) {
    case "rust":
      return await promptForRustFrameworkPreference();
    case "python":
      return await promptForPythonFrameworkPreference();
    case "java":
      return await promptForJavaFrameworkPreference();
    case "go":
      return await promptForGoFrameworkPreference();
    default:
      return await promptForRustFrameworkPreference();
  }
}

export async function promptForRustFrameworkPreference() {
  return await select({
    message: "What framework do you want to use for the server infrastructure?",
    choices: [
      {
        value: "actix-web",
        name: "Actix-Web",
      },
      {
        value: "rocket",
        name: "Rocket",
      },
      {
        value: "axum",
        name: "Axum",
      },
      {
        value: "warp",
        name: "Warp",
      },
    ],
    default: "actix-web",
  });
}

export async function promptForPythonFrameworkPreference() {
  return await select({
    message: "What framework do you want to use for the server infrastructure?",
    choices: [
      {
        value: "fastapi",
        name: "FastAPI",
      },
      {
        value: "flask",
        name: "Flask",
      },
      {
        value: "django",
        name: "Django",
      },
    ],
    default: "fastapi",
  });
}

export async function promptForJavaFrameworkPreference() {
  return await select({
    message: "What framework do you want to use for the server infrastructure?",
    choices: [
      {
        value: "spring",
        name: "Spring",
      },
    ],
    default: "spring",
  });
}

export async function promptForGoFrameworkPreference() {
  return await select({
    message: "What framework do you want to use for the server infrastructure?",
    choices: [],
    default: "",
  });
}
