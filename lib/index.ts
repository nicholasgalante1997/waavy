import { Command } from "commander";
import { setupProgramActions, setupProgramMetadata } from "./cli/index";
import { setupBundleAction } from "./cli/BundleAction";
import { setupCreateAction } from "./cli/CreateAction";
import { setupPrerenderAction } from "./cli/PreRenderAction";
import { setupRenderAction } from "./cli/RenderAction";
import { setupStaticSiteGenAction } from "./cli/SSGAction";
import { setupUpgradeAction } from "./cli/UpgradeAction";
import ProcessManager from "./utils/models/ProcessManager";
import { getVersion } from "./utils";

ProcessManager.setupHandlers();

const program = new Command();

setupProgramMetadata(program, getVersion() as string);
setupProgramActions(program, [
  setupBundleAction,
  setupCreateAction,
  setupPrerenderAction,
  setupStaticSiteGenAction,
  setupRenderAction,
  setupUpgradeAction,
]);

program.parse(process.argv);
