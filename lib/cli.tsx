import { Command } from "commander";
import Package from '../package.json';
import { setupProgramActions, setupProgramMetadata } from "./cli/index";
import { setupRenderAction } from "./cli/render";

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

const program = new Command();

setupProgramMetadata(program, Package.version);
setupProgramActions(program, [setupRenderAction]);

program.parse(process.argv);