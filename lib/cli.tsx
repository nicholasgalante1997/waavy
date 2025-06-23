import { Command } from "commander";

import { setupProgramActions, setupProgramMetadata } from "./cli/index";
import { setupPrehydrateAction } from "./cli/prehydrate";
import { setupRenderAction } from "./cli/render";

import { getVersion } from "./utils";
import ProcessManager from "./utils/models/ProcessManager";

ProcessManager.setupHandlers();

const program = new Command();

setupProgramMetadata(program, getVersion() as string);
setupProgramActions(program, [setupRenderAction, setupPrehydrateAction]);

program.parse(process.argv);
