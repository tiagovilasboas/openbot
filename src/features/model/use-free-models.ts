"use client";

import { useEffect, useState } from "react";
import { useProviderKeys } from "./use-provider-keys.ts";

export interface FreeModelEntry {
  id: string;
  name: string;
  contextLength?: number;
}

const FALLBACK_OPENROUTER_FREE_MODELS: FreeModelEntry[] = [
  { id: "openrouter/free", name: "Auto Free Router", contextLength: 262144 },
  {
    id: "nvidia/nemotron-3.5-super-vl:free",
    name: "NVIDIA Nemotron 3.5 Super VL",
    contextLength: 1000000,
  },
  {
    id: "nvidia/nemotron-3-ultra-550b-a55b:free",
    name: "NVIDIA Nemotron 3 Ultra",
    contextLength: 1000000,
  },
  {
    id: "nvidia/nemotron-3.5-lightning:free",
    name: "NVIDIA Nemotron 3.5 Lightning",
    contextLength: 1000000,
  },
  {
    id: "google/gemma-4-31b-it:free",
    name: "Google Gemma 4 31B",
    contextLength: 262144,
  },
  {
    id: "cohere/north-mini-code:free",
    name: "Cohere North Mini Code",
    contextLength: 256000,
  },
  {
    id: "liquid/lfm-3-1.7b:free",
    name: "LiquidAI LFM3 1.7B",
    contextLength: 262144,
  },
];

/**
 * The OpenRouter free models to offer. With a saved key the server asks
 * OpenRouter for the ones this account can use; without one, the public list.
 */
export function useFreeModels(isOpenRouter: boolean) {
  const [liveFreeModels, setLiveFreeModels] = useState<FreeModelEntry[]>(
    FALLBACK_OPENROUTER_FREE_MODELS,
  );
  const [hasLoadedLive, setHasLoadedLive] = useState(false);
  const [isAccountList, setIsAccountList] = useState(false);
  const routerKey = useProviderKeys().router ?? "";

  useEffect(() => {
    if (!isOpenRouter) return;

    let isMounted = true;
    const request = routerKey
      ? fetch("/api/model/free", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ apiKey: routerKey }),
        })
      : fetch("/api/model/free");
    request
      .then((r) => r.json())
      .then(
        (data: {
          ok?: boolean;
          source?: string;
          models?: FreeModelEntry[];
        }) => {
          if (
            isMounted &&
            data?.ok &&
            Array.isArray(data.models) &&
            data.models.length > 0
          ) {
            setLiveFreeModels(data.models);
            setIsAccountList(data.source === "account");
          }
        },
      )
      .catch(() => {})
      .finally(() => {
        if (isMounted) setHasLoadedLive(true);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpenRouter, routerKey]);

  return { liveFreeModels, hasLoadedLive, isAccountList };
}
