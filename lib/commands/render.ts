import { Command } from "commander";
import { setupProgramActions, setupProgramMetadata } from "../cli";
import { setupRenderAction } from "../cli/RenderAction";
import { getVersion } from "../utils";
import ProcessManager from "../utils/models/ProcessManager";

ProcessManager.setupHandlers();

const program = new Command();

setupProgramMetadata(program, getVersion() as string);
setupProgramActions(program, [setupRenderAction]);

program.parse(process.argv);
