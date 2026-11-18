"use client";

import { useCallback, useEffect, useState } from "react";
import { withApiHeaders } from "../server-guard/api-request-init.ts";
import type {
  FoundLocalServer,
  LocalServerResult,
} from "./local-server-scan.ts";

/** Asks the server which local model servers answer: once while `active`, and again on `rescan`. */
export function useLocalServers(active: boolean) {
  const [results, setResults] = useState<LocalServerResult[]>([]);
  const [doneRound, setDoneRound] = useState(-1);
  const [round, setRound] = useState(0);

  useEffect(() => {
    if (!active) return;
    let mounted = true;
    fetch("/api/model/local-scan", withApiHeaders())
      .then((r) => r.json())
      .then((data: { results?: LocalServerResult[] }) => {
        if (mounted && Array.isArray(data?.results)) setResults(data.results);
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setDoneRound(round);
      });
    return () => {
      mounted = false;
    };
  }, [active, round]);

  const rescan = useCallback(() => setRound((n) => n + 1), []);
  const scanning = active && doneRound !== round;
  const scanned = doneRound >= 0;
  const servers = results.filter(
    (r): r is FoundLocalServer => r.status === "found",
  );
  const errors = results.filter((r) => r.status === "error");

  return { servers, errors, scanned, scanning, rescan };
}
