"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  createCustomSkill,
  getAllSkills,
  loadCustomSkillsFromStorage,
  saveCustomSkillsToStorage,
  subscribeCustomSkills,
} from "./skill-storage.ts";
import type { SkillDefinition } from "./skill-types.ts";

const EMPTY_CUSTOM_SKILLS: SkillDefinition[] = [];
const getServerCustomSkills = () => EMPTY_CUSTOM_SKILLS;

export function useSkills() {
  const customSkills = useSyncExternalStore(
    subscribeCustomSkills,
    loadCustomSkillsFromStorage,
    getServerCustomSkills,
  );

  const addCustomSkill = useCallback(
    (input: {
      name: string;
      command?: string;
      description?: string;
      instructions: string;
    }): SkillDefinition => {
      const newSkill = createCustomSkill(input);
      const current = loadCustomSkillsFromStorage();
      const updated = [...current, newSkill];
      saveCustomSkillsToStorage(updated);
      return newSkill;
    },
    [],
  );

  const removeCustomSkill = useCallback((id: string) => {
    const current = loadCustomSkillsFromStorage();
    const updated = current.filter((s) => s.id !== id);
    saveCustomSkillsToStorage(updated);
  }, []);

  const allSkills = getAllSkills(customSkills);

  return {
    customSkills,
    allSkills,
    addCustomSkill,
    removeCustomSkill,
  };
}
