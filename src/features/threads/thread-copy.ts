import type { Language } from "../language/language.ts";

interface ThreadCopy {
  listLabel: string;
  mainTitle: string;
  untitled: string;
  newThread: string;
  rename: string;
  renameLabel: string;
  remove: string;
  busy: string;
  removed: string;
  undo: string;
  pin: string;
  unpin: string;
  pinnedMark: string;
}

const COPY: Record<Language, ThreadCopy> = {
  pt: {
    listLabel: "Conversas deste agente",
    mainTitle: "Principal",
    untitled: "Sem título",
    newThread: "Conversa paralela",
    rename: "Renomear",
    renameLabel: "Nome da conversa",
    remove: "Excluir",
    busy: "Aguarde a resposta terminar para trocar de conversa.",
    removed: "Conversa excluída.",
    undo: "Desfazer",
    pin: "Fixar",
    unpin: "Desafixar",
    pinnedMark: "Fixada",
  },
  en: {
    listLabel: "This agent's conversations",
    mainTitle: "Main",
    untitled: "Untitled",
    newThread: "Side conversation",
    rename: "Rename",
    renameLabel: "Conversation name",
    remove: "Delete",
    busy: "Wait for the reply to finish before switching conversations.",
    removed: "Conversation deleted.",
    undo: "Undo",
    pin: "Pin",
    unpin: "Unpin",
    pinnedMark: "Pinned",
  },
  es: {
    listLabel: "Conversaciones de este agente",
    mainTitle: "Principal",
    untitled: "Sin título",
    newThread: "Conversación paralela",
    rename: "Renombrar",
    renameLabel: "Nombre de la conversación",
    remove: "Eliminar",
    busy: "Espera a que termine la respuesta para cambiar de conversación.",
    removed: "Conversación eliminada.",
    undo: "Deshacer",
    pin: "Fijar",
    unpin: "Desfijar",
    pinnedMark: "Fijada",
  },
};

export function getThreadCopy(language: Language): ThreadCopy {
  return COPY[language];
}

/** What the list shows for a thread: its name, or a placeholder. */
export function displayTitle(
  thread: { id: string; title: string | null },
  copy: ThreadCopy,
): string {
  if (thread.title) return thread.title;
  return thread.id === "default" ? copy.mainTitle : copy.untitled;
}
