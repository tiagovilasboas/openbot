import type { Language } from "../language/language.ts";
import type { ageBucket } from "./task-rows.ts";

interface TasksCopy {
  open: string;
  title: string;
  description: string;
  close: string;
  empty: string;
  running: string;
  noActivity: string;
  age: Record<NonNullable<ReturnType<typeof ageBucket>>["unit"], string>;
}

const COPY: Record<Language, TasksCopy> = {
  pt: {
    open: "Tarefas",
    title: "Tarefas",
    description:
      "As conversas de todos os agentes, da mais recente à mais antiga.",
    close: "Fechar",
    empty: "Nenhuma conversa ainda.",
    running: "Em andamento",
    noActivity: "Sem atividade registrada",
    age: {
      now: "agora",
      minutes: "há {n} min",
      hours: "há {n} h",
      days: "há {n} d",
    },
  },
  en: {
    open: "Tasks",
    title: "Tasks",
    description: "Every agent's conversations, most recent first.",
    close: "Close",
    empty: "No conversations yet.",
    running: "Running",
    noActivity: "No recorded activity",
    age: {
      now: "now",
      minutes: "{n} min ago",
      hours: "{n} h ago",
      days: "{n} d ago",
    },
  },
  es: {
    open: "Tareas",
    title: "Tareas",
    description:
      "Las conversaciones de todos los agentes, de la más reciente a la más antigua.",
    close: "Cerrar",
    empty: "Aún no hay conversaciones.",
    running: "En curso",
    noActivity: "Sin actividad registrada",
    age: {
      now: "ahora",
      minutes: "hace {n} min",
      hours: "hace {n} h",
      days: "hace {n} d",
    },
  },
};

export function getTasksCopy(language: Language): TasksCopy {
  return COPY[language];
}

export function ageLabel(
  copy: TasksCopy,
  bucket: ReturnType<typeof ageBucket>,
): string {
  if (!bucket) return copy.noActivity;
  return copy.age[bucket.unit].replace("{n}", String(bucket.value));
}
