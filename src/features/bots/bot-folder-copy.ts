import type { Language } from "../language/language.ts";

interface BotFolderCopy {
  hint: string;
  placeholder: string;
  move: string;
  remove: string;
}

const COPY: Record<Language, BotFolderCopy> = {
  pt: {
    hint: "Pasta na barra lateral. Deixe vazio para tirar da pasta.",
    placeholder: "Ex.: Trabalho",
    move: "Mover para a pasta",
    remove: "Tirar da pasta",
  },
  en: {
    hint: "Sidebar folder. Leave it empty to take the bot out.",
    placeholder: "E.g. Work",
    move: "Move to folder",
    remove: "Take out of folder",
  },
  es: {
    hint: "Carpeta en la barra lateral. Déjala vacía para sacar el bot.",
    placeholder: "Ej.: Trabajo",
    move: "Mover a la carpeta",
    remove: "Sacar de la carpeta",
  },
};

export function getBotFolderCopy(language: Language): BotFolderCopy {
  return COPY[language];
}
