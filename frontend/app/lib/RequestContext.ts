import "server-only";

import { AsyncLocalStorage } from "node:async_hooks";

export interface ApiRequestContext {
  requestId: string;
  path: string;
}

declare global {
  var intervApiRequestContext:
    | AsyncLocalStorage<ApiRequestContext>
    | undefined;
}

const requestContext =
  globalThis.intervApiRequestContext ??
  (globalThis.intervApiRequestContext =
    new AsyncLocalStorage<ApiRequestContext>());

export function runWithApiRequestContext<T>(
  context: ApiRequestContext,
  callback: () => T
): T {
  return requestContext.run(context, callback);
}

export function getApiRequestContext(): ApiRequestContext | undefined {
  return requestContext.getStore();
}
