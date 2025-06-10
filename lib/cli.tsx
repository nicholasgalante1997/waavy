import { Command } from "commander";

import { pipeComponentToStdout } from "./server";
import { $load } from "./utils";

const program = new Command();

program
  .name("@supra-dev/react")
  .version("1.0.0-alpha.1")
  .description(
    "A library to support rendering React components in non-js server environments"
  );

program
  .command("render")
  .description("Render a React component into a stdout stream")
  .argument("<component>", "The path to the component to render")
  .option("-P, --props <props>", "The props to pass to the component")
  .option("-N, --name <name>", "The name of the component", "default")
  .option("-C, --config <config>", "The path to the config file", "./.rssrc")
  .action(async (component, options) => {
    const Component = await $load(component, options.name);
    const props = options?.props ? JSON.parse(options.props) : {};
    await pipeComponentToStdout(<Component {...props} />);
  });

program.parse(process.argv);
