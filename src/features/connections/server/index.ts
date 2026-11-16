/**
 * Route bindings for /api/connections: each handler gets the process-wide
 * dependencies, so route files only read params and delegate here.
 */
import { getConnectionsDeps } from "./connections-deps.ts";
import { handleDisconnect, handleStatus } from "./credential-handlers.ts";
import { handleCallback, handleStart } from "./oauth-handlers.ts";

export const startConnect = (request: Request, id: string) =>
  handleStart(request, id, getConnectionsDeps());

export const finishConnect = (request: Request, id: string) =>
  handleCallback(request, id, getConnectionsDeps());

export const connectionStatus = (id: string) =>
  handleStatus(id, getConnectionsDeps());

export const disconnect = (id: string) =>
  handleDisconnect(id, getConnectionsDeps());
