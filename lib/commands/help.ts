// examples/help.js
import cac from "cac";
import { getVersion } from "@/utils";

const help = cac("waavy");

help.help();
help.version(getVersion() as string);
help.parse();
