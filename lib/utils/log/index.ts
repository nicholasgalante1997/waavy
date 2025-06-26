import debug from "debug";
import printf from "printf";

const logger = debug("waavy");

async function writeToFsLogFile(...args: any[]) {
  const _namespace = logger.namespace;
  const diff = logger.diff;

  let message = args[0];

  if (args.length > 1) {
    message = printf(message, ...args.slice(1));
  }

  const formatted = `[${_namespace}] ${message} +${diff}ms`;
  /**
   * When we start to enter the Workers branch of work, implement file streaming logging.
   * Can't pollute stdout due to architecture choices we've made to use stdout as a medium for inter-process data transfer.
   */
}

/**
 * @see https://www.npmjs.com/package/debug#output-streams
 */
logger.log = writeToFsLogFile;

const b_extend = logger.extend.bind(logger);

logger.extend = function (_namespace: string, delimiter?: string) {
  const child = b_extend(_namespace);
  child.log = writeToFsLogFile;
  return child;
};

export { logger };
export default logger;
