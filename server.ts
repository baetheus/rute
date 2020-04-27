import { serve, serveTLS, Server as HTTPServer, ServerRequest, Response as HTTPResponse, HTTPOptions, HTTPSOptions } from "https://deno.land/std@v0.41.0/http/server.ts";

import { RouteInfo, Router } from "./router.ts";
import { Route } from "./route.ts";
import { Middleware, Next } from "./middleware.ts";
import { Request, createFromDenoRequest, HTTP } from "./request.ts";
import { Response } from "./response.ts";
import { test, getCleanPath, RouteData } from "./route_parser.ts";

import { Logger } from "./middlewares/logger.ts";

import { log } from "./utils/console.ts";

export { Router, Request, Response, Middleware, Next, HTTP }

/**
 * Server class application
 *
 */
export class Server extends Router {
  private _name: string;

  constructor(name: string = "rute_app_1", path: string = "/") {
    super(path);

    this._name = name;

    this.use(Logger);
  }

  /**
   * Use middleware or application
   *
   * @param  fn   Middleware|Server Middleware or sub-application
   * @return void
   *
   */
  use(fn: Middleware | Router | Server): void {
    super.use(fn);
  }

  /**
   * Get application name
   *
   * @return string Application name
   *
   */
  get name(): string {
    return this._name;
  }

  /**
   * Get application path
   *
   * @return string Application path
   *
   */
  get path(): string {
    return super.path;
  }

  /**
   * Serve and listen
   *
   * To enable TLS and another options
   * see: https://deno.land/std/http/
   * 
   * @example
   *    const app = new Server();
   *    app.listen("80")
   *
   * @param   addr  string | HTTPOptions | HTTPSOptions
   * @return  Promise<void>
   *
   */
  async listen(addr: string | HTTPOptions | HTTPSOptions): Promise<void> {
    const s: HTTPServer = (typeof addr !== "string" && "certFile" in addr) 
      ? serveTLS(addr)
      : serve(addr);

    log("Listening on", addr);

    for await (const req of s) {
      let path: string = getCleanPath(req.url);
      let routeInfo: RouteInfo = await this.getRoute(req.method, path);
      let httpRequest: Request = await createFromDenoRequest(addr, req, routeInfo.data);
      let httpResponse: Response = new Response();

      await this.go(httpRequest, httpResponse, async () => {
        await (<Route>routeInfo.route).execute(httpRequest, httpResponse);
      });

      req.respond(httpResponse.deno);
    }
  }
}