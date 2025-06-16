import { Command } from "commander";
import Package from "../package.json";
import { setupProgramActions, setupProgramMetadata } from "./cli/index";
import { setupRenderAction } from "./cli/render";

const program = new Command();

setupProgramMetadata(program, Package.version);
setupProgramActions(program, [setupRenderAction]);

program.parse(process.argv);
