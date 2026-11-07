"use client";

import { useCallback, useSyncExternalStore } from "react";
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

const SERVER_BOTS: BotProfile[] = [DEFAULT_BOT];
const getServerBots = () => SERVER_BOTS;
const getServerActiveBotId = () => DEFAULT_BOT.id;

export function useBots() {
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
  }, []);

  const saveBot = useCallback((profile: BotProfile) => {
    const currentBots = loadBotsFromStorage();
    const updated = updateBotInList(currentBots, profile);
    saveBotsToStorage(updated);
  }, []);

  const createAndActivateBot = useCallback(
    (input: {
      name: string;
      title?: string;
      description?: string;
      avatarShape?: AvatarShape;
      avatarColor?: AvatarColor;
      skills?: string[];
    }): BotProfile => {
      const newBot = createBotProfile(input);
      const currentBots = loadBotsFromStorage();
      const nextList = [...currentBots, newBot];
      saveBotsToStorage(nextList);
      saveActiveBotId(newBot.id);
      return newBot;
    },
    [],
  );

  const removeBot = useCallback((id: string) => {
    const currentBots = loadBotsFromStorage();
    const result = deleteBotFromList(currentBots, id);
    saveBotsToStorage(result.bots);
    if (result.newActiveId) {
      saveActiveBotId(result.newActiveId);
    }
  }, []);

  const activeBot =
    bots.find((b) => b.id === activeBotId) || bots[0] || DEFAULT_BOT;

  return {
    bots,
    activeBot,
    activeBotId,
    setActiveBotId,
    saveBot,
    createAndActivateBot,
    removeBot,
  };
}
