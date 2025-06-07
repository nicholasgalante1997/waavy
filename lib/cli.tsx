import { Command } from "commander";
import debug from "debug";
import fs from "fs";
import path from "path";
import { loadModule, pipeComponentToStdout } from "./server";
import { type RSSRConfiguration } from "./types";

const log = debug("supra:react:cli");
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
  .option("-P, --props <props>", "The props to pass to the component", "{}")
  .option("-N, --name <name>", "The name of the component", "default")
  .option("-C, --config <config>", "The path to the config file", "./.rssrc")
  .action(async (component, options) => {
    const aggOptions: RSSRConfiguration & {
      config: string;
      name: string;
      props: string;
    } = {
      ...options,
      ...deriveConfigFromEnv(options.config),
    };
    const Component = await loadModule(component, options.name);
    const props =
      typeof aggOptions.props === "string"
        ? JSON.parse(aggOptions.props)
        : typeof aggOptions.props === "object"
          ? aggOptions.props
          : {};

    if (aggOptions.tanstackReactQuery) {
      const { dehydrateServerSideQueries } = await import(
        "./extensions/tanstack-react-query"
      );
      const dehydratedState = await dehydrateServerSideQueries(
        aggOptions.tanstackReactQuery
      );
      Object.defineProperty(props, "dehydratedState", {
        value: dehydratedState.dehydratedState,
        writable: false,
        enumerable: true,
      });
    }

    await pipeComponentToStdout(<Component {...props} />);
  });

function deriveConfigFromEnv(config?: string): RSSRConfiguration {
  const configlog = log.extend("config");

  if (!config) {
    configlog.extend("warn")("No config file specified");
    return {};
  }

  const pathToConfig = config.startsWith("/")
    ? config
    : path.resolve(path.join(process.cwd(), config));

  if (!fs.existsSync(pathToConfig)) {
    return {} as RSSRConfiguration;
  }

  const configFileContents = fs.readFileSync(pathToConfig, "utf-8");
  try {
    return JSON.parse(configFileContents) as RSSRConfiguration;
  } catch (err) {
    console.warn(`Could not parse config file at ${pathToConfig}`);
  }

  return {} as RSSRConfiguration;
}

program.parse(process.argv);
