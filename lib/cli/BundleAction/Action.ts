import { type BundleAction } from "@/types/cli/bundle";
import { noop } from "@/utils";

const bundleAction: BundleAction = async (options) => noop();

export default bundleAction;
