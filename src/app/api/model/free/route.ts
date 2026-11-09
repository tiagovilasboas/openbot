export const dynamic = "force-dynamic";

export interface FreeModelItem {
  id: string;
  name: string;
  contextLength: number;
  description?: string;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
let cachedFreeModels: FreeModelItem[] | null = null;
let lastCacheTime = 0;

const FALLBACK_FREE_MODELS: FreeModelItem[] = [
  {
    id: "openrouter/free",
    name: "OpenRouter: Auto Free Router",
    contextLength: 262144,
  },
  {
    id: "nvidia/nemotron-3.5-super-vl:free",
    name: "NVIDIA: Nemotron 3.5 Super VL (free)",
    contextLength: 1000000,
  },
  {
    id: "nvidia/nemotron-3-ultra-550b-a55b:free",
    name: "NVIDIA: Nemotron 3 Ultra (free)",
    contextLength: 1000000,
  },
  {
    id: "nvidia/nemotron-3.5-lightning:free",
    name: "NVIDIA: Nemotron 3.5 Lightning (free)",
    contextLength: 1000000,
  },
  {
    id: "google/gemma-4-31b-it:free",
    name: "Google: Gemma 4 31B (free)",
    contextLength: 262144,
  },
  {
    id: "cohere/north-mini-code:free",
    name: "Cohere: North Mini Code (free)",
    contextLength: 256000,
  },
  {
    id: "liquid/lfm-3-1.7b:free",
    name: "LiquidAI: LFM3-1.7B (free)",
    contextLength: 262144,
  },
  {
    id: "parallel/decisions-fast:free",
    name: "Parallel: Decisions Fast (free)",
    contextLength: 131072,
  },
  {
    id: "heygen/voice-turbo:free",
    name: "HeyGen: HeyGen Voice Turbo (free)",
    contextLength: 131072,
  },
];

export async function GET() {
  const now = Date.now();
  if (cachedFreeModels && now - lastCacheTime < CACHE_TTL_MS) {
    return Response.json({
      ok: true,
      source: "cache",
      models: cachedFreeModels,
    });
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/models", {
      headers: {
        Accept: "application/json",
        "User-Agent": "OpenBot",
      },
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      return Response.json({
        ok: true,
        source: "fallback",
        models: cachedFreeModels ?? FALLBACK_FREE_MODELS,
      });
    }

    const payload = (await response.json()) as {
      data?: Array<{
        id?: unknown;
        name?: unknown;
        context_length?: unknown;
        description?: unknown;
        pricing?: { prompt?: unknown; completion?: unknown };
      }>;
    };

    if (!Array.isArray(payload?.data)) {
      return Response.json({
        ok: true,
        source: "fallback",
        models: cachedFreeModels ?? FALLBACK_FREE_MODELS,
      });
    }

    const discovered: FreeModelItem[] = [];

    // Always include openrouter/free first if not already present
    discovered.push({
      id: "openrouter/free",
      name: "OpenRouter: Auto Free Router",
      contextLength: 262144,
      description:
        "Roteia automaticamente para o melhor modelo gratuito ativo.",
    });

    for (const item of payload.data) {
      if (typeof item.id !== "string") continue;
      const id = item.id.trim();
      if (id === "openrouter/free") continue;

      const isFreeById = id.endsWith(":free");

      if (isFreeById) {
        discovered.push({
          id,
          name: typeof item.name === "string" ? item.name : id,
          contextLength:
            typeof item.context_length === "number"
              ? item.context_length
              : 262144,
          description:
            typeof item.description === "string" ? item.description : undefined,
        });
      }
    }

    cachedFreeModels = discovered;
    lastCacheTime = now;

    return Response.json({
      ok: true,
      source: "live",
      models: discovered,
    });
  } catch {
    return Response.json({
      ok: true,
      source: "fallback",
      models: cachedFreeModels ?? FALLBACK_FREE_MODELS,
    });
  }
}
