"use client";

import { useEffect, useState } from "react";
import { withApiHeaders } from "../server-guard/api-request-init.ts";
import type { FoundLocalServer } from "./local-server-scan.ts";

/** Asks the server which local model servers answer, once, while `active`. */
export function useLocalServers(active: boolean) {
  const [servers, setServers] = useState<FoundLocalServer[]>([]);
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    if (!active) return;
    let mounted = true;
    fetch("/api/model/local-scan", withApiHeaders())
      .then((r) => r.json())
      .then((data: { servers?: FoundLocalServer[] }) => {
        if (mounted && Array.isArray(data?.servers)) setServers(data.servers);
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setScanned(true);
      });
    return () => {
      mounted = false;
    };
  }, [active]);

  return { servers, scanned };
}
