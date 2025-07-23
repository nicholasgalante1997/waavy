import { Command } from "commander";
import { setupProgramActions, setupProgramMetadata } from "../cli";
import { setupUpgradeAction } from "../cli/UpgradeAction";
import { getVersion } from "../utils";
import ProcessManager from "../utils/models/ProcessManager";

ProcessManager.setupHandlers();

const program = new Command();

setupProgramMetadata(program, getVersion() as string);
setupProgramActions(program, [setupUpgradeAction]);

program.parse(process.argv);
