import { MissingPeerDependencyError } from "@/errors";
import type { ReactModules } from "@/types/vendor/React";
import type { ReactDOMBrowserModules } from "@/types/vendor/React-DOM.browser";
import type { ReactDOMServerModules } from "@/types/vendor/React-DOM.server";

export default class PeerDependencyManager {
  static async useReact(): Promise<ReactModules> {
    const React = (await import("react")).default;
    if (React) return React;
    else throw new MissingPeerDependencyError("react");
  }

  static async useReactDOMServer(): Promise<ReactDOMServerModules> {
    const ReactDOMServer = (await import("react-dom/server")).default;
    if (ReactDOMServer) return ReactDOMServer;
    else throw new MissingPeerDependencyError("react-dom/server");
  }

  static async useReactDOMBrowser(): Promise<ReactDOMBrowserModules> {
    const ReactDOMClient = (await import("react-dom/client")).default;
    if (ReactDOMClient) return ReactDOMClient;
    else throw new MissingPeerDependencyError("react-dom/client");
  }
}
