"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
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
import {
  scheduleDeletion,
  undoTimeLeft,
  withoutPendingDeletion,
  type PendingDeletion,
} from "./bot-deletion.ts";
import { canHideBot, setBotHidden } from "./bot-visibility.ts";
import { setBotFolder } from "./bot-folders.ts";
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

  // A deletion waits out its undo window in memory; the bot stays stored
  // until then, so a reload mid-window reverts it and loses nothing.
  const [pendingDeletion, setPendingState] = useState<PendingDeletion | null>(
    null,
  );
  const pendingRef = useRef<PendingDeletion | null>(null);
  const setPendingDeletion = useCallback((next: PendingDeletion | null) => {
    pendingRef.current = next;
    setPendingState(next);
  }, []);

  const storedBots = useSyncExternalStore(
    subscribeBots,
    loadBotsFromStorage,
    getServerBots,
  );
  const bots = useMemo(
    () => withoutPendingDeletion(storedBots, pendingDeletion),
    [storedBots, pendingDeletion],
  );
  const pendingDeletedBot = pendingDeletion
    ? (storedBots.find((b) => b.id === pendingDeletion.botId) ?? null)
    : null;

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

  const commitDeletion = useCallback((id: string) => {
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

  /** Hides the bot now and deletes it for good once the undo window ends. */
  const removeBot = useCallback(
    (id: string) => {
      const current = withoutPendingDeletion(
        loadBotsFromStorage(),
        pendingRef.current,
      );
      const mainId = resolveMainBotId(loadStoredMainBotId(), current);
      const refused =
        deleteBotFromList(current, id, mainId).bots.length === current.length;
      if (refused) return;
      const { pending, commitNow } = scheduleDeletion(
        pendingRef.current,
        id,
        Date.now(),
      );
      if (commitNow) commitDeletion(commitNow);
      setPendingDeletion(pending);
    },
    [commitDeletion, setPendingDeletion],
  );

  const undoRemoveBot = useCallback(
    () => setPendingDeletion(null),
    [setPendingDeletion],
  );

  useEffect(() => {
    if (!pendingDeletion) return;
    const timer = setTimeout(
      () => {
        setPendingDeletion(null);
        commitDeletion(pendingDeletion.botId);
      },
      undoTimeLeft(pendingDeletion, Date.now()),
    );
    return () => clearTimeout(timer);
  }, [pendingDeletion, commitDeletion, setPendingDeletion]);

  const hideBot = useCallback((id: string) => {
    const currentBots = loadBotsFromStorage();
    const mainId = resolveMainBotId(loadStoredMainBotId(), currentBots);
    if (!canHideBot(currentBots, id, mainId)) return;
    saveBotsToStorage(setBotHidden(currentBots, id, true));
    // A hidden bot is not where the user is working: go to the main bot.
    if (loadActiveBotId() === id && mainId) saveActiveBotId(mainId);
    pushBots();
  }, []);

  const restoreBot = useCallback((id: string) => {
    saveBotsToStorage(setBotHidden(loadBotsFromStorage(), id, false));
    pushBots();
  }, []);

  const moveBotToFolder = useCallback((id: string, folder: string) => {
    saveBotsToStorage(setBotFolder(loadBotsFromStorage(), id, folder));
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
    undoRemoveBot,
    pendingDeletedBot,
    hideBot,
    restoreBot,
    moveBotToFolder,
    reorderBot,
    mainBotId,
    makeMainBot,
    syncError,
    dismissSyncError,
  };
}
