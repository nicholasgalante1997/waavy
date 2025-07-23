import { Command } from "commander";
import { setupProgramActions, setupProgramMetadata } from "../cli";
import { setupPrerenderAction } from "../cli/PreRenderAction";
import { getVersion } from "../utils";
import ProcessManager from "../utils/models/ProcessManager";

ProcessManager.setupHandlers();

const program = new Command();

setupProgramMetadata(program, getVersion() as string);
setupProgramActions(program, [setupPrerenderAction]);

program.parse(process.argv);
