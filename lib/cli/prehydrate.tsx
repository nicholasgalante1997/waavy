import React from "react";
import type { Command } from "commander";

import fs from "fs/promises";
import path from "path";

export type PrehydrateAction = (options: PrehydrateActionOptions) => (void | Promise<void>);
export type PrehydrateActionOptions = {
    /**
     * A path to a waavy.json configuration file
     * 
     * If you're project contains a waavy.json file in the root directory of the project,
     * this will be loaded and merged with any command line provided options by default
     */
    config?: Partial<Omit<PrehydrateActionOptions, 'config'>>


    /**
     * The path to the file containing the component you wish to bundle for client side hydration
     * 
     * If the string provided ends in a double colon namespace delimiter pattern, 
     * i.e. 
     * 
     * `"./src/pages/index.tsx::Dashboard"`,
     * 
     * That file will be treated as using a named export pattern,
     * and instead of attempting to load the default export,
     * waavy will attempt to load the string supplied after the delimiter.
     * This accepts comma delimited strings, for bundling multiple named exports from a single file
     * such as a barrel file pattern.
     * i.e.
     * 
     * `"./src/pages/index.tsx::Home,About,Post,Posts"`
     * 
     * Inline with waavy conventions,
     * If this file contains a `props` loader function, 
     * or a `defaultProps` object, it will be loaded from the file and passed to the component
     */
    file?: string;

    /**
     * The path to a directory containing files you want to "prehydrate"
     * 
     * When you pass a directory to waavy,
     * it assumes that each file contains a default export that is a valid React Component
     * 
     * If that Component needs props to render without throwing an exception,
     * you have several options, 
     */
    dir?: string;
}

const prehydrateAction: PrehydrateAction = (options) => {

}

export function setupPrehydrateAction(program: Command) {
    program
        .command("prehydrate")
        .description(`
Bundles React Components into client side hydration scripts.
        This is particularly useful for speeding up handler times, as this will create a cachce of hydration scripts that can either be served via your server as static files, or used for faster embedding of hydration javascript into the html your server responds with.`)
}