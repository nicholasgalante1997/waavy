import { Command } from "commander";
import Package from "../package.json";
import { setupProgramActions, setupProgramMetadata } from "./cli/index";
import { setupPrehydrateAction } from './cli/prehydrate';
import { setupRenderAction } from "./cli/render";
import ProcessManager from "./utils/models/ProcessManager";

ProcessManager.setupHandlers();

const program = new Command();

setupProgramMetadata(program, Package.version);
setupProgramActions(program, [setupRenderAction, setupPrehydrateAction]);

program.parse(process.argv);
