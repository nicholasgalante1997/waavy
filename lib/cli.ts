import { Command } from "commander";
import debug from "debug";
import fs from "fs";
import path from "path";
import { pipeComponentToStdout } from "./server";
import { $load } from "./utils";

/**
 * What does this file actually need to do?
 *
 * 1. Load a React Component from a given path, with a provided or assumed module name
 * 2. Load props either via,
 *  - serializable input as an argument
 *  - a path to a JSON file
 *  - a loader function
 *
 * 3. Create a client side hydrate bundle (Optional for static sites)
 * 4. Determine an output format
 * 5. Render the component with props into the desired output format
 *
 */

const log = debug("supra:react:cli");
const program = new Command();

program
  .name("@supra-dev/react")
  .version("1.0.0-alpha.1")
  .description("A library to support rendering React components in non-js server environments");

program.parse(process.argv);
