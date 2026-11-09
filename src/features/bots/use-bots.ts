"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
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
import {
  loadStoredMainBotId,
  resolveMainBotId,
  saveMainBotId,
  subscribeMainBotId,
} from "./main-bot.ts";

const SERVER_BOTS: BotProfile[] = [DEFAULT_BOT];
const getServerBots = () => SERVER_BOTS;
const getServerActiveBotId = () => DEFAULT_BOT.id;
const getServerMainBotId = () => null;

export function useBots() {
  // Moves the old global skill library into the bots, once per browser.
  useEffect(() => {
    migrateLegacySkills();
    // Gives saved crews their new heads, once per browser.
    migrateCrewShapes();
  }, []);

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
      skills?: SkillDefinition[];
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

  const storedMainBotId = useSyncExternalStore(
    subscribeMainBotId,
    loadStoredMainBotId,
    getServerMainBotId,
  );
  const mainBotId = resolveMainBotId(storedMainBotId, bots) ?? DEFAULT_BOT.id;

  const makeMainBot = useCallback((id: string) => {
    saveMainBotId(id);
  }, []);

  const removeBot = useCallback((id: string) => {
    const currentBots = loadBotsFromStorage();
    const mainId = resolveMainBotId(loadStoredMainBotId(), currentBots);
    const result = deleteBotFromList(currentBots, id, mainId);
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
    mainBotId,
    makeMainBot,
  };
}
