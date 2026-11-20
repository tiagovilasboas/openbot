import type { Language } from "../language/language.ts";

interface InstallLinkCopy {
  copyLink: string;
  linkCopied: string;
  linkFailed: string;
  title: string;
  description: string;
  skills: (count: number) => string;
  instructions: string;
  warning: string;
  install: string;
  cancel: string;
  invalid: string;
}

const COPY: Record<Language, InstallLinkCopy> = {
  pt: {
    copyLink: "Copiar link de instalação",
    linkCopied:
      "Link copiado. Quem abrir vê o bot e confirma antes de instalar.",
    linkFailed: "Não foi possível copiar o link.",
    title: "Instalar este bot?",
    description:
      "Um link compartilhou este bot com você. Revise antes de instalar.",
    skills: (n) => (n === 1 ? "1 skill" : `${n} skills`),
    instructions: "Instruções",
    warning:
      "Estas instruções vieram de um link, não de você. Leia antes de instalar; as skills ficam marcadas como importadas.",
    install: "Instalar bot",
    cancel: "Agora não",
    invalid: "Este link de instalação não é válido.",
  },
  en: {
    copyLink: "Copy install link",
    linkCopied:
      "Link copied. Whoever opens it sees the bot and confirms before installing.",
    linkFailed: "Could not copy the link.",
    title: "Install this bot?",
    description:
      "A link shared this bot with you. Review it before installing.",
    skills: (n) => (n === 1 ? "1 skill" : `${n} skills`),
    instructions: "Instructions",
    warning:
      "These instructions came from a link, not from you. Read them before installing; the skills stay marked as imported.",
    install: "Install bot",
    cancel: "Not now",
    invalid: "This install link is not valid.",
  },
  es: {
    copyLink: "Copiar enlace de instalación",
    linkCopied:
      "Enlace copiado. Quien lo abra verá el bot y confirmará antes de instalar.",
    linkFailed: "No se pudo copiar el enlace.",
    title: "¿Instalar este bot?",
    description:
      "Un enlace compartió este bot contigo. Revísalo antes de instalar.",
    skills: (n) => (n === 1 ? "1 skill" : `${n} skills`),
    instructions: "Instrucciones",
    warning:
      "Estas instrucciones vinieron de un enlace, no de ti. Léelas antes de instalar; las skills quedan marcadas como importadas.",
    install: "Instalar bot",
    cancel: "Ahora no",
    invalid: "Este enlace de instalación no es válido.",
  },
};

export function getInstallLinkCopy(language: Language): InstallLinkCopy {
  return COPY[language];
}
