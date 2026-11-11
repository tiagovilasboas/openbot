"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import type { SkillDefinition } from "@/features/skills/skill-types.ts";
import {
  createBotProfile,
  deleteBotFromList,
  loadActiveBotId,
  loadBotsFromStorage,
  saveActiveBotId,
  saveBotsToStorage,
  subscribeActiveBotId,
  subscribeBots,
  updateBotInList,
} from "./bot-storage.ts";
import {
  DEFAULT_BOT,
  type AvatarColor,
  type AvatarShape,
  type BotProfile,
} from "./bot-types.ts";
import { migrateCrewShapes } from "./crew-shapes-migration.ts";
import { migrateLegacySkills } from "./legacy-skills-migration.ts";
import { forgetBotData, pruneOrphanBotData } from "./bot-data-cleanup.ts";
import {
  loadBotsFromServer,
  pushBots,
  subscribeBotsSyncErrors,
} from "./sync/browser-bots-sync.ts";
import type { BotsSyncErrorCode } from "./sync/bots-sync-failure.ts";
import { reorderBots } from "./reorder-bots.ts";
import {
  loadStoredMainBotId,
  mainBotFirst,
  resolveMainBotId,
  saveMainBotId,
  subscribeMainBotId,
} from "./main-bot.ts";

const SERVER_BOTS: BotProfile[] = [DEFAULT_BOT];
const getServerBots = () => SERVER_BOTS;
const getServerActiveBotId = () => DEFAULT_BOT.id;
const getServerMainBotId = () => null;

export function useBots() {
  const [syncError, setSyncError] = useState<BotsSyncErrorCode | null>(null);

  useEffect(() => {
    // Moves the old global skill library into the bots, once per browser.
    migrateLegacySkills();
    // Gives saved crews their new heads, once per browser.
    migrateCrewShapes();
    // The server holds the bots; the browser copy is a read cache. Loading
    // never throws: when the server is out of reach, the cache is used.
    void loadBotsFromServer().then((outcome) => {
      // Cleans data of bots deleted before deletion did, but only against a
      // bot list that can be trusted, never the preset fallback.
      if (outcome.canPrune) pruneOrphanBotData();
    });
    return subscribeBotsSyncErrors(setSyncError);
  }, []);

  const dismissSyncError = useCallback(() => setSyncError(null), []);

  const bots = useSyncExternalStore(
    subscribeBots,
    loadBotsFromStorage,
    getServerBots,
  );

  const rawActiveBotId = useSyncExternalStore(
    subscribeActiveBotId,
    loadActiveBotId,
    getServerActiveBotId,
  );

  const activeBotExists = bots.some((b) => b.id === rawActiveBotId);
  const activeBotId = activeBotExists
    ? rawActiveBotId
    : bots[0]?.id || DEFAULT_BOT.id;

  const setActiveBotId = useCallback((id: string) => {
    saveActiveBotId(id);
    pushBots();
  }, []);

  const saveBot = useCallback((profile: BotProfile) => {
    const currentBots = loadBotsFromStorage();
    const updated = updateBotInList(currentBots, profile);
    saveBotsToStorage(updated);
    pushBots();
  }, []);

  const createAndActivateBot = useCallback(
    (input: {
      name: string;
      title?: string;
      description?: string;
      avatarShape?: AvatarShape;
      avatarColor?: AvatarColor;
      skills?: SkillDefinition[];
    }): BotProfile => {
      const newBot = createBotProfile(input);
      const currentBots = loadBotsFromStorage();
      const nextList = [...currentBots, newBot];
      saveBotsToStorage(nextList);
      saveActiveBotId(newBot.id);
      pushBots();
      return newBot;
    },
    [],
  );

  const storedMainBotId = useSyncExternalStore(
    subscribeMainBotId,
    loadStoredMainBotId,
    getServerMainBotId,
  );
  const mainBotId = resolveMainBotId(storedMainBotId, bots) ?? DEFAULT_BOT.id;
  // The main bot always sits on top of the list.
  const orderedBots = useMemo(
    () => mainBotFirst(bots, mainBotId),
    [bots, mainBotId],
  );

  const makeMainBot = useCallback((id: string) => {
    saveMainBotId(id);
    pushBots();
  }, []);

  /** Moves a bot to a position of the list as shown, and saves that order. */
  const reorderBot = useCallback((id: string, toIndex: number) => {
    const currentBots = loadBotsFromStorage();
    const mainId = resolveMainBotId(loadStoredMainBotId(), currentBots);
    const next = reorderBots(currentBots, id, toIndex, mainId);
    const changed = next.some((bot, i) => bot !== currentBots[i]);
    if (changed) {
      saveBotsToStorage(next);
      pushBots();
    }
  }, []);

  const removeBot = useCallback((id: string) => {
    const currentBots = loadBotsFromStorage();
    const mainId = resolveMainBotId(loadStoredMainBotId(), currentBots);
    const result = deleteBotFromList(
      currentBots,
      id,
      mainId,
      loadActiveBotId(),
    );
    saveBotsToStorage(result.bots);
    // A deleted bot's data goes with it, in every domain. A refused delete
    // (the main bot, the last bot) keeps everything.
    if (result.bots.length < currentBots.length) forgetBotData(id);
    if (result.newActiveId) {
      saveActiveBotId(result.newActiveId);
    }
    pushBots();
  }, []);

  const activeBot =
    bots.find((b) => b.id === activeBotId) || bots[0] || DEFAULT_BOT;

  return {
    bots: orderedBots,
    activeBot,
    activeBotId,
    setActiveBotId,
    saveBot,
    createAndActivateBot,
    removeBot,
    reorderBot,
    mainBotId,
    makeMainBot,
    syncError,
    dismissSyncError,
  };
}
