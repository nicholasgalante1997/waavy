import { Command } from "commander";
import { setupProgramActions, setupProgramMetadata } from "./cli/index";
import { setupRenderAction } from "./cli/RenderAction";
import ProcessManager from "./utils/models/ProcessManager";
import { getVersion } from "./utils";
import Workers from "./workers";

ProcessManager.setupHandlers();

const workerManager = new Workers();
const program = new Command();

setupProgramMetadata(program, getVersion() as string, workerManager);
setupProgramActions(program, [setupRenderAction]);

program.parse(process.argv);
