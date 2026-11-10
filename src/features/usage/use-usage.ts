"use client";

import { useSyncExternalStore } from "react";
import type { UsageRecord } from "./usage-record.ts";
import { loadUsage, subscribeUsage } from "./usage-storage.ts";

const NO_RECORDS: UsageRecord[] = [];
const getServerRecords = () => NO_RECORDS;

/** The saved usage records, live: it follows every change in this browser. */
export function useUsage(): UsageRecord[] {
  return useSyncExternalStore(
    subscribeUsage,
    () => loadUsage(),
    getServerRecords,
  );
}
