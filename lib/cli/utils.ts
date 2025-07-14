class CommandLineActionUtilities {
  public shouldInclude(id: string) {
    const field = `WAAVY_CLI_COMMAND_INCLUDE_${id.toUpperCase()}`;
    return process.env[field] === "1";
  }
}

export default new CommandLineActionUtilities();
