"use client";

import { createContext, useContext } from "react";
import type { ComposerModelChipView } from "./composer-model-chip.ts";

export interface ComposerModelControl {
  chip: ComposerModelChipView;
  onPress: () => void;
}

/** Set by the chat shell; composers outside it simply show no model chip. */
const ComposerModelContext = createContext<ComposerModelControl | null>(null);

export const ComposerModelProvider = ComposerModelContext.Provider;

export function useComposerModel(): ComposerModelControl | null {
  return useContext(ComposerModelContext);
}
