import type { Command } from "commander";
import Features from "@/utils/models/Features";
import renderAction from "./Action";

export function setupRenderAction(program: Command) {
  const enabled = Features.isEnabled("COMMAND_LINE_ACTIONS_RENDER");
  if (!enabled) return;

  program
    .command("render")
    .description(
      "Render a React component into a stdout stream or to a provided pipe",
    )
    .argument(
      "<path-to-component>",
      "The path to the file containing the component to render",
    )
    .option(
      "-p, --props <props>",
      "The props to pass to the component. If used in conjunction with a loader, it provides the initial props object and the result of the loader fn is merged in after.",
      "{}",
    )
    .option(
      "-n, --name <name>",
      "The name of the component, if left blank, it assumes a default export",
      "default",
    )
    .option(
      "-b, --bootstrap [files-to-bootstrap...]",
      "Any files you want to bootstrap on the client. This is typically used for client side hydration of the React app.",
      [],
    )
    .option(
      "--cache",
      "If this flag is set to true, Waavy renderer will spawn a secondary non-blocking Worker thread to write the result of the render operation to a local file cache. This is recommended for production when it's very likely your components aren't changing if props are the same, and we can use a cached result of the render operation in such a case.",
      false,
    )
    .option(
      "--cache-type <bunfs,bunsqlite3>",
      "Determines which approach to caching is used. Options: bun-fs, sqlite3",
    )
    .option(
      "--cache-key <password>",
      "A string representing a password to be used for encrypting cached files",
    )
    .option(
      "--pipe <path-to-pipe>",
      "Instead of piping the rendered component to stdout, it will pipe the component to a supplied named pipe. Pretty experimental currently.",
    )
    .option(
      "--request <request>",
      "The request object to pass to the loader function.",
      "{}",
    )
    .option(
      "--await",
      "If true, the result of the render operation will be collected as streamed, and then passed in a final state to stdout, equivocal to an all or none op.",
      false,
    )
    .option(
      "--serialize <format>",
      "Write to stdout in a serialized structured format Currently supports JSON",
      false,
    )
    .option(
      "--error-page-path <path-to-error-file>",
      "A fallback page to render in the event that an error is thrown during server side rendering.",
    )
    .option(
      "--error-page-component-name <name>",
      "The name of the Error page component to import. Used in conjunction with --error-page-path",
      "default",
    )
    .option(
      "--selector",
      `The selector that you will mount your React component node to within the browser.
        If your application uses client side hydration, this is the selector for the element that you pass to ReactDOM.hydrateRoot
        If you are using the "waavy" client side function, this property is used for client side hydration.      
        If this property is left blank, it is assumed you are following the <Html /> React Page pattern,
        and we will attempt to use "document" as the selector in this case.`,
    )
    .option(
      "--pcache-key",
      `A string indicating what field you want Waavy to assign props to on the window object.
      if left default, Waavy will put the props in window._p`,
    )
    .option("-v, --verbose", "Enables verbose log output", false)
    .option(
      "--max-timeout <number>",
      "Number of seconds to wait before aborting server-rendering, flushing the remaining markup to the client, and defaulting to client side rendering",
    )
    .option(
      "--chunk",
      "Progressive chunk size, see <https://github.com/facebook/react/blob/14c2be8dac2d5482fda8a0906a31d239df8551fc/packages/react-server/src/ReactFizzServer.js#L210-L225>",
    )
    .option(
      "--fail-silently",
      "Whether or not to render an Error page to the provided OutputStrategy if an Error occurs, or to fail silently",
      false,
    )
    .action(
      async (componentPath, options) =>
        await renderAction(componentPath, options),
    );

  return program;
}
