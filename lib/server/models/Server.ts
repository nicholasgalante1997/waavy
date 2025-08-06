import type { ServeFunctionOptions } from "bun";

type Fetch = ServeFunctionOptions<any, {}>["fetch"];

/**
 * WaavyServer
 *
 * Are we just building a framework now?
 *
 * What do we actually want Waavy to be?
 *
 * On the one hand, we want to use the executables/cli tooling to allow us to render
 * React pages/components on the server in other runtimes (primarily rust)
 * So to this end, we need to finish waavy-rs and vet use cases and start setting up examples
 *
 * Then there's API. A javascript API.
 *
 * What if we could simplify/abstract away the bulk of the Rendering/Server logic,
 * So that you only ever needed to concern yourself with
 *
 * - Building a page
 *  - Does that page need server loaded props?
 *      - if yes, build a loader,
 *      - if not, static, can be compiled/rendered/cached at build time
 *
 * Register your page with a loader
 *  - just call add('page', Component, props?: Props);
 *
 *
 */

type RequestContext = Partial<Request> & {};
type IWaavyServerConstructorOptions = {};
type IWaavyServerHttpServiceRegistry = Map<
  IWaavyServerHttpServiceRegistryKey,
  Set<IWaavyServerHttpServiceRegistryHandler>
>;
type IWaavyServerHttpServiceRegistryKey = "web" | "api" | "socket" | "middleware" | "rpc";
type IWaavyServerHttpServiceRegistryHandler = IWaavyServerHttpWebServiceHandler;
type IWaavyServerHttpWebServiceHandler = (request: Request) => Promise<Response>;
type IWaavyServerHttpAPIServiceHandler<A, R> = (context: RequestContext, args: A) => Promise<R>;
type IAddWaavyServiceKey = IWaavyServerHttpServiceRegistryKey;

interface IWaavyServer {
  stop(): Promise<boolean>;
  start(): IWaavyServer;
}

abstract class AbstractWaavyServer {
  protected __registry: IWaavyServerHttpServiceRegistry;
  protected __server: Bun.Server | null = null;

  constructor(options: IWaavyServerConstructorOptions) {
    this.__registry = new Map([
      ["web", new Set()],
      ["api", new Set()],
      ["socket", new Set()],
      ["middleware", new Set()],
      ["rpc", new Set()],
    ]);
  }

  public add(type: IAddWaavyServiceKey): IWaavyServer {
    const services = this.__registry.get(type);
    if (services) {
    }
    return this;
  }

  abstract stop(): Promise<boolean>;
  abstract start(): IWaavyServer;

  abstract routes(): Record<string, Bun.RouterTypes.RouteValue<Extract<unknown, string>>>;
  abstract fetch(this: Bun.Server, request: Request, server: Bun.Server): Response | Promise<Response>;

  protected get port() {
    return process.env.WAAVY_PORT || 8080;
  }

  protected get host() {
    return process.env.WAAVY_HOST || "localhost";
  }
}

class WaavyServer extends AbstractWaavyServer implements AbstractWaavyServer, IWaavyServer {
  constructor(options: IWaavyServerConstructorOptions) {
    super(options);
  }
  start(): WaavyServer {
    this.__server = Bun.serve({
      port: this.port,
      hostname: this.host,
      routes: {},
    });

    return this;
  }

  async stop(): Promise<boolean> {
    if (this.__server) {
      await this.__server.stop();
      return true;
    }
    return false;
  }
  routes(): Record<string, Bun.RouterTypes.RouteValue<Extract<unknown, string>>> {
    return {};
  }

  fetch(this: Bun.Server, request: Request, server: Bun.Server): Response | Promise<Response> {
    throw new Error("Method not implemented.");
  }
}

export default WaavyServer;
export {
  WaavyServer,
  AbstractWaavyServer,
  type RequestContext,
  type IWaavyServerConstructorOptions,
  type IWaavyServerHttpServiceRegistry,
  type IWaavyServerHttpServiceRegistryKey,
  type IWaavyServerHttpServiceRegistryHandler,
  type IWaavyServerHttpWebServiceHandler,
  type IWaavyServerHttpAPIServiceHandler,
  type IAddWaavyServiceKey,
  type IWaavyServer,
};
