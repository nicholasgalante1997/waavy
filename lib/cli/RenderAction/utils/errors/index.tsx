import path from "path";
import type { RenderActionOptions } from "@/types";
import { load, logger } from "@/utils";

type ErrorPageConfiguration = {
  errorPagePath: string;
  errorPageComponentName?: "default" | string;
};

export function getErrorPageMarkup(
  renderToString: (Component: any) => string,
  ErrorComponent: any,
  error: unknown,
  errorInfo?: unknown,
) {
  const page = renderToString(<ErrorComponent error={error} />);
  return page;
}

export async function loadErrorComponent(config: ErrorPageConfiguration) {
  const { errorPagePath, errorPageComponentName } = config;
  const npath = path.isAbsolute(errorPagePath)
    ? errorPagePath
    : path.resolve(process.cwd(), errorPagePath);
  const ErrorComponent = await load(npath, errorPageComponentName);
  return ErrorComponent;
}

export async function getErrorComponentOrNull(
  errorComponentPath?: string,
  errorComponentName?: string,
  options?: RenderActionOptions,
): Promise<any> {
  let ErrorComponent = null;
  if (errorComponentPath) {
    try {
      ErrorComponent = await loadErrorComponent({
        errorPagePath: errorComponentPath,
        errorPageComponentName: errorComponentName,
      });
    } catch (e) {
      options?.verbose &&
        logger.extend("error")(
          "An error was thrown trying to load the supplied error Component: %e",
          e,
        );
      /** Swallow error page loading exceptions */
      ErrorComponent = null;
    }
  }

  return ErrorComponent;
}
