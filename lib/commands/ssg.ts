import { Command } from "commander";
import { setupProgramActions, setupProgramMetadata } from "../cli";
import { setupStaticSiteGenAction } from "../cli/SSGAction";
import { getVersion } from "../utils";
import ProcessManager from "../utils/models/ProcessManager";

ProcessManager.setupHandlers();

const program = new Command();

setupProgramMetadata(program, getVersion() as string);
setupProgramActions(program, [setupStaticSiteGenAction]);

program.parse(process.argv);
