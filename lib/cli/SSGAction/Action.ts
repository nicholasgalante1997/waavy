import { type SSGAction } from "@/types/cli/ssg";
import { noop } from "@/utils";

const ssgAction: SSGAction = async (options) => noop();

export default ssgAction;
