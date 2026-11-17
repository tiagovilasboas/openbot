import type { Language } from "../language/language.ts";
import { fillCopy } from "../model/settings-copy.ts";

interface ComposerModelChipCopy {
  connect: string;
  connectAria: string;
  pickAria: string;
}

const COPY: Record<Language, ComposerModelChipCopy> = {
  pt: {
    connect: "Conectar",
    connectAria: "Conectar um modelo",
    pickAria: "Modelo do bot: {model}. Trocar",
  },
  en: {
    connect: "Connect",
    connectAria: "Connect a model",
    pickAria: "Bot model: {model}. Change",
  },
  es: {
    connect: "Conectar",
    connectAria: "Conectar un modelo",
    pickAria: "Modelo del bot: {model}. Cambiar",
  },
};

const PROVIDER_PREFIX = /\b(?:Router|Roteador|Local|Anthropic): /g;

export interface ComposerModelChipView {
  /** What the chip shows: the model, or "Connect" without one. */
  text: string;
  ariaLabel: string;
  title: string;
  /** Opens the bot's model picker, or Settings to connect a model. */
  action: "pick" | "connect";
}

/** The composer chip's label, tooltip and action from the active model. */
export function composerModelChip(
  isConfigured: boolean,
  modelLabel: string,
  language: Language,
): ComposerModelChipView {
  const copy = COPY[language];
  if (!isConfigured) {
    return {
      text: copy.connect,
      ariaLabel: copy.connectAria,
      title: copy.connectAria,
      action: "connect",
    };
  }
  // Drop the provider prefix ("Router: ") and the vendor prefix of model ids
  // (also behind a "next:" marker); the tooltip keeps the full label.
  const text =
    modelLabel.replace(PROVIDER_PREFIX, "").replace(/\S+\//g, "").trim() ||
    modelLabel;
  return {
    text,
    ariaLabel: fillCopy(copy.pickAria, { model: modelLabel }),
    title: modelLabel,
    action: "pick",
  };
}
