import ComponentNotFoundError from "./ComponentNotFound";
import InvalidExtensionError from "./InvalidExtension";

export class CustomError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export function handleError(error: unknown, verbose = false) {
  if (error instanceof ComponentNotFoundError) {
    verbose && process.stderr.write(error.message);
    /**
     * Treat "ComponentNotFound" errors as unrecoverable,
     * and exit via the global handler, which can be invoked by re-throwing
     *
     * Why re-throw instead of process.exit(...) here?
     * We have cleanup functions we want to run, which live in a finally clause,
     * which will run if we throw, but not if we process.exit from here.
     */
    throw error;
  }

  if (error instanceof InvalidExtensionError) {
    verbose && process.stderr.write(error.message);
    /**
     * Treat "ComponentNotFound" errors as unrecoverable,
     * and exit via the global handler, which can be invoked by re-throwing
     *
     * Why re-throw instead of process.exit(...) here?
     * We have cleanup functions we want to run, which live in a finally clause,
     * which will run if we throw, but not if we process.exit from here.
     */
    throw error;
  }
}
