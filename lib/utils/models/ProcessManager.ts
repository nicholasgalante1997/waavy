class ProcessManager {
  private isShuttingDown = false;
  private readonly shutdownTimeout = 10000;

  setupHandlers() {
    process.on("uncaughtException", (error: Error) => {
      console.error(`Waavy encountered an unrecoverable error.
        ${error instanceof Error ? this.errorToString(error) : error}
      `);
      this.forceExit(1);
    });

    process.on("unhandledRejection", (reason: unknown) => {
      console.error(`Waavy encountered an unhandled promise rejection.
        Reason: ${reason}
      `);
      this.forceExit(1);
    });

    // Graceful shutdown signals
    process.on("SIGTERM", () => this.gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => this.gracefulShutdown("SIGINT"));

    // Handle broken pipes, etc.
    process.on("SIGPIPE", () => {
      console.log("SIGPIPE received");
    });
  }

  private async gracefulShutdown(signal: string) {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;

    console.log(`Received ${signal}, initiating graceful shutdown...`);

    // Set a timeout to force exit if graceful shutdown takes too long
    const forceExitTimer = setTimeout(() => {
      console.error("Graceful shutdown timeout, forcing exit");
      this.forceExit(1);
    }, this.shutdownTimeout);

    try {
      await this.cleanup();
      clearTimeout(forceExitTimer);
      console.log("Graceful shutdown completed");
      process.exit(0);
    } catch (error) {
      console.error("Error during graceful shutdown:", error);
      clearTimeout(forceExitTimer);
      this.forceExit(1);
    }
  }

  private async cleanup() {
    /**
     * There may be processes we want to clean up here.
     * We'd need to share a signal with the renderer
     * Which is fine. Can look into passing refs into this instance in a sec
     */
  }

  private forceExit(code: number) {
    process.exit(code);
  }

  private errorToString(error: Error) {
    return `
        (Error, kind: ${error.name})
            Cause: ${error?.cause}
            Details: ${error?.message}
            Stack: ${error?.stack}
    `;
  }
}

export default new ProcessManager();
