import { type CreateAction } from "@/types/cli/create";
import { noop } from "@/utils";

const createAction: CreateAction = async (options) => noop();

export default createAction;
