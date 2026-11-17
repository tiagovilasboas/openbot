import type { Language } from "../language/language.ts";
import { providerName, type Usability } from "../connections/copy.ts";
import { fillCopy } from "../model/settings-copy.ts";

interface ComposerModelChipCopy {
  connect: string;
  connectAria: string;
  pickAria: string;
  /** Tooltip and name when the model's provider is switched off. */
  offTitle: string;
  offAria: string;
}

const COPY: Record<Language, ComposerModelChipCopy> = {
  pt: {
    connect: "Conectar",
    connectAria: "Conectar um modelo",
    pickAria: "Modelo do bot: {model}. Trocar",
    offTitle: "{provider} está desativado. Toque para escolher outro modelo.",
    offAria:
      "Modelo do bot: {model}. {provider} está desativado. Abrir para escolher outro modelo",
  },
  en: {
    connect: "Connect",
    connectAria: "Connect a model",
    pickAria: "Bot model: {model}. Change",
    offTitle: "{provider} is switched off. Tap to pick another model.",
    offAria:
      "Bot model: {model}. {provider} is switched off. Open to pick another model",
  },
  es: {
    connect: "Conectar",
    connectAria: "Conectar un modelo",
    pickAria: "Modelo del bot: {model}. Cambiar",
    offTitle: "{provider} está desactivado. Toca para elegir otro modelo.",
    offAria:
      "Modelo del bot: {model}. {provider} está desactivado. Abrir para elegir otro modelo",
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
  /** "warning" when the model's provider is switched off. */
  tone: "default" | "warning";
}

/** The composer chip's label, tooltip and action from the active model. */
export function composerModelChip(
  isConfigured: boolean,
  modelLabel: string,
  language: Language,
  usability: Usability = { usable: true },
): ComposerModelChipView {
  const copy = COPY[language];
  if (!isConfigured) {
    return {
      text: copy.connect,
      ariaLabel: copy.connectAria,
      title: copy.connectAria,
      action: "connect",
      tone: "default",
    };
  }
  // Drop the provider prefix ("Router: ") and the vendor prefix of model ids
  // (also behind a "next:" marker); the tooltip keeps the full label.
  const text =
    modelLabel.replace(PROVIDER_PREFIX, "").replace(/\S+\//g, "").trim() ||
    modelLabel;
  if (!usability.usable) {
    const provider = providerName(usability.provider);
    return {
      text,
      ariaLabel: fillCopy(copy.offAria, { model: modelLabel, provider }),
      title: fillCopy(copy.offTitle, { provider }),
      action: "pick",
      tone: "warning",
    };
  }
  return {
    text,
    ariaLabel: fillCopy(copy.pickAria, { model: modelLabel }),
    title: modelLabel,
    action: "pick",
    tone: "default",
  };
}
