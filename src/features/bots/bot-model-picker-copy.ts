import type { Language } from "../language/language.ts";

interface BotModelPickerCopy {
  title: string;
  description: string;
  listLabel: string;
  defaultName: string;
  defaultDescription: string;
  freeBadge: string;
  loading: string;
  customLabel: string;
  customPlaceholder: string;
  customInvalid: string;
  customApply: string;
  openSettings: string;
  close: string;
  pickerButton: string;
  changedTo: string;
  changedToDefault: string;
}

const COPY: Record<Language, BotModelPickerCopy> = {
  pt: {
    title: "Modelo deste bot",
    description:
      "A escolha vale a partir da próxima resposta e fica salva neste bot.",
    listLabel: "Modelos disponíveis",
    defaultName: "Modelo padrão das Configurações",
    defaultDescription: "O bot usa o modelo global",
    freeBadge: "Grátis",
    loading: "Buscando modelos disponíveis…",
    customLabel: "Outro modelo (id)",
    customPlaceholder: "ex: google/gemma-4-31b-it:free",
    customInvalid:
      "Use só letras, números e . _ : / - (sem espaços), até 100 caracteres.",
    customApply: "Usar este modelo",
    openSettings: "Configurações de modelo",
    close: "Fechar",
    pickerButton: "Escolher modelo do bot",
    changedTo: "{name} usa agora o modelo {model}",
    changedToDefault: "{name} usa agora o modelo padrão",
  },
  en: {
    title: "This bot's model",
    description:
      "The choice applies from the next reply and is saved on this bot.",
    listLabel: "Available models",
    defaultName: "Settings default model",
    defaultDescription: "The bot uses the global model",
    freeBadge: "Free",
    loading: "Looking up available models…",
    customLabel: "Another model (id)",
    customPlaceholder: "e.g. google/gemma-4-31b-it:free",
    customInvalid:
      "Use only letters, digits and . _ : / - (no spaces), up to 100 characters.",
    customApply: "Use this model",
    openSettings: "Model settings",
    close: "Close",
    pickerButton: "Choose the bot's model",
    changedTo: "{name} now uses the model {model}",
    changedToDefault: "{name} now uses the default model",
  },
  es: {
    title: "Modelo de este bot",
    description:
      "La elección vale desde la próxima respuesta y se guarda en este bot.",
    listLabel: "Modelos disponibles",
    defaultName: "Modelo predeterminado de Configuración",
    defaultDescription: "El bot usa el modelo global",
    freeBadge: "Gratis",
    loading: "Buscando modelos disponibles…",
    customLabel: "Otro modelo (id)",
    customPlaceholder: "ej.: google/gemma-4-31b-it:free",
    customInvalid:
      "Usa solo letras, números y . _ : / - (sin espacios), hasta 100 caracteres.",
    customApply: "Usar este modelo",
    openSettings: "Configuración del modelo",
    close: "Cerrar",
    pickerButton: "Elegir el modelo del bot",
    changedTo: "{name} ahora usa el modelo {model}",
    changedToDefault: "{name} ahora usa el modelo predeterminado",
  },
};

export function getBotModelPickerCopy(language: Language): BotModelPickerCopy {
  return COPY[language];
}
