import { base } from "./build.config";

Bun.build({
    ...base,
    entrypoints: ["lib/server.ts"],
});

console.log("built `server` library, format: esm :rocket: :rocket: :rocket:")