import { Command } from "commander";
import { setupProgramActions, setupProgramMetadata } from "../cli";
import { setupBundleAction } from "../cli/BundleAction";
import { getVersion } from "../utils";
import ProcessManager from "../utils/models/ProcessManager";

ProcessManager.setupHandlers();

const program = new Command();

setupProgramMetadata(program, getVersion() as string);
setupProgramActions(program, [setupBundleAction]);

program.parse(process.argv);
