"use client";

import { useSyncExternalStore } from "react";
import {
  readConnectFlow,
  readIdleConnectFlow,
  subscribeConnectFlow,
  type ConnectFlow,
} from "../client/index.ts";

/** The Connect in progress or just ended, shared by the panel and the settings. */
export function useConnectFlow(): ConnectFlow {
  return useSyncExternalStore(
    subscribeConnectFlow,
    readConnectFlow,
    readIdleConnectFlow,
  );
}
