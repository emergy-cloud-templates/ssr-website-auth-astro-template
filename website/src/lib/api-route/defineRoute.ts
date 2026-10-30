// Adapted from /common/legos/node/api-route@1.0.0 (dvk-common 33220c4). Owned by this project.
// Origin: app.upmatch.io - website/src/utils/defineRoute.ts (765 routes). Lego api-route; adapt per project,
// see README.md.
//
// One wrapper for every API route: the auth level, the error shape, logging and the project's own rules (staff
// roles, demo accounts, audit rows, AI usage) are written once. The project calls createDefineRoute once with its
// adapters (src/lib/route.ts) and every route file uses the defineRoute it returns:
//
//   export const POST = defineRoute({ name: "/api/admin/users/[id]/ban", auth: "admin" }, async (ctx) => {
//     const { reason } = await parseWith(banSchema, await readBody(ctx.request));
//     await banUser(ctx.adminDb, uuid(ctx.params.id), reason);
//     return json({ ok: true });
//   });
import { createHash, timingSafeEqual } from "node:crypto";
import type { Cors } from "./cors.ts";
import { HttpError, httpErrorResponse, jsonError } from "./http.ts";

/**
 * public: no check (the handler verifies its own signature, if any).
 * user: a signed-in user (the project's getUser: session cookie or Bearer token).
 * admin: a signed-in user the project's isAdmin accepts.
 * apiKey: a shared secret in `Authorization: Bearer <key>` or `X-API-Key` (webhooks, integrations); never a user.
 */
export type RouteAuth = "public" | "user" | "admin" | "apiKey";

/** The parts of Astro's APIContext a route uses, written structurally so this file needs no Astro types. */
export interface RouteContext {
  request: Request;
  url: URL;
  params?: Record<string, string | undefined>;
  cookies?: unknown;
  locals?: unknown;
}

export interface RouteInfo<A extends RouteAuth = RouteAuth> {
  /** Stable label, by convention the route pattern ("/api/admin/users/[id]"): logs, audit rows, errors. */
  name: string;
  auth: A;
  /** Answer for unexpected errors (default `messages.unexpected`); the real error is logged, never sent. */
  publicErrorMessage?: string;
  /** CORS for a route another origin calls; export `OPTIONS = cors.preflight` next to it. */
  cors?: Cors;
}

/** What every handler receives. `user` is never null on "user" and "admin" routes. */
export interface BaseRouteCtx<User> {
  request: Request;
  url: URL;
  params: Record<string, string | undefined>;
  cookies: unknown;
  locals: unknown;
  route: RouteInfo;
  /** From the `x-request-id` header when a proxy set one, else a new UUID; sent back as trace_id on a 500. */
  requestId: string;
  user: User | null;
}
export type RouteCtx<User, Extra, A extends RouteAuth> = Omit<BaseRouteCtx<User>, "user"> & {
  user: A extends "user" | "admin" ? User : null;
} & Extra;

interface HookArgs<User> {
  route: RouteInfo;
  context: RouteContext;
  requestId: string;
  user: User | null;
}

export interface RouteKit<User, Extra extends object = Record<never, never>> {
  /** The signed-in user (cookie session or Bearer token), or null. Called for "user" and "admin" routes only. */
  getUser(context: RouteContext): User | null | Promise<User | null>;
  /** Whether a signed-in user may call "admin" routes. */
  isAdmin(user: User): boolean;
  /** Secrets accepted on "apiKey" routes, read at request time (empty values are ignored). */
  apiKeys?: () => ReadonlyArray<string | null | undefined>;
  /** The project's own rules after the auth level passed (staff roles, demo accounts, plans): a Response refuses. */
  authorize?(
    args: HookArgs<User> & { method: string },
  ): Response | null | undefined | Promise<Response | null | undefined>;
  /** Fields added to every handler's ctx (an admin database client as a lazy getter, ...); getters stay lazy. */
  extend?(base: BaseRouteCtx<User>): Extra;
  /** Runs the whole request inside it (a logging context, an AI usage root, a trace span). */
  around?<T>(args: Omit<HookArgs<User>, "user">, run: () => Promise<T>): Promise<T>;
  /** Last change to the response (hide secrets from read-only staff). */
  finalize?(args: HookArgs<User> & { response: Response }): Response | Promise<Response>;
  /** After the response is final (an audit row for every admin write, metrics). Its errors are logged only. */
  after?(args: HookArgs<User> & { response: Response; method: string; error: unknown }): void | Promise<void>;
  /** Where unexpected errors go (default console.error). */
  logError?(args: Omit<HookArgs<User>, "user"> & { error: unknown }): void | Promise<void>;
  /** Texts of the wrapper's own answers. */
  messages?: Partial<typeof DEFAULT_MESSAGES>;
}

export const DEFAULT_MESSAGES = {
  unauthenticated: "Authentication required.",
  forbidden: "Admin access required.",
  badApiKey: "Invalid or missing API key.",
  unexpected: "Something went wrong. Please try again.",
};

const digest = (s: string) => createHash("sha256").update(s).digest();

/** Constant-time check of the key a request carries against the accepted ones. */
export function hasApiKey(request: Request, keys: ReadonlyArray<string | null | undefined>): boolean {
  const auth = request.headers.get("authorization") ?? "";
  const given = auth.toLowerCase().startsWith("bearer ")
    ? auth.slice(7).trim()
    : (request.headers.get("x-api-key") ?? "").trim();
  if (!given) return false;
  const g = digest(given);
  let ok = false;
  for (const key of keys) if (key && timingSafeEqual(g, digest(key))) ok = true;
  return ok;
}

export function createDefineRoute<User, Extra extends object = Record<never, never>>(kit: RouteKit<User, Extra>) {
  const messages = { ...DEFAULT_MESSAGES, ...kit.messages };

  return function defineRoute<A extends RouteAuth>(
    route: RouteInfo<A>,
    handler: (ctx: RouteCtx<User, Extra, A>) => Response | Promise<Response>,
  ): (context: RouteContext) => Promise<Response> {
    return async (context) => {
      const { request } = context;
      const method = request.method;
      const requestId = request.headers.get("x-request-id")?.slice(0, 100) || crypto.randomUUID();
      let user: User | null = null;
      let failure: unknown = undefined;

      const log = async (error: unknown) => {
        try {
          if (kit.logError) await kit.logError({ route, context, requestId, error });
          else console.error(`[api] ${route.name} (${requestId})`, error);
        } catch (logFailure) {
          console.error(`[api] ${route.name}: logError failed`, logFailure, error);
        }
      };

      const run = async (): Promise<Response> => {
        if (route.auth === "apiKey" && !hasApiKey(request, kit.apiKeys?.() ?? [])) {
          return jsonError(messages.badApiKey, 401);
        }
        if (route.auth === "user" || route.auth === "admin") {
          user = await kit.getUser(context);
          if (!user) return jsonError(messages.unauthenticated, 401);
          if (route.auth === "admin" && !kit.isAdmin(user)) return jsonError(messages.forbidden, 403);
        }
        const refusal = await kit.authorize?.({ route, context, requestId, user, method });
        if (refusal) return refusal;

        const base: BaseRouteCtx<User> = {
          request,
          url: context.url,
          params: context.params ?? {},
          cookies: context.cookies,
          locals: context.locals,
          route,
          requestId,
          user,
        };
        if (kit.extend) Object.defineProperties(base, Object.getOwnPropertyDescriptors(kit.extend(base)));
        return await handler(base as unknown as RouteCtx<User, Extra, A>);
      };

      const guarded = async (): Promise<Response> => {
        try {
          return await run();
        } catch (error) {
          failure = error;
          if (error instanceof HttpError) {
            if (!error.expose) await log(error);
            return httpErrorResponse(error, route.publicErrorMessage ?? messages.unexpected);
          }
          await log(error);
          return jsonError(route.publicErrorMessage ?? messages.unexpected, 500, { trace_id: requestId });
        }
      };

      let response = kit.around ? await kit.around({ route, context, requestId }, guarded) : await guarded();
      if (kit.finalize) {
        try {
          response = await kit.finalize({ route, context, requestId, user, response });
        } catch (error) {
          await log(error);
          response = jsonError(route.publicErrorMessage ?? messages.unexpected, 500, { trace_id: requestId });
        }
      }
      if (route.cors) response = route.cors.apply(request, response);
      if (kit.after) {
        try {
          await kit.after({ route, context, requestId, user, response, method, error: failure });
        } catch (error) {
          await log(error);
        }
      }
      return response;
    };
  };
}
