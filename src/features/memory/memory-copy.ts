import type { Language } from "../language/language.ts";
import {
  MEMORY_MAX_ENTRIES,
  MEMORY_MAX_ENTRY_LENGTH,
  type MemoryEditFailure,
} from "./memory-entries.ts";

/** Copy for the bot memory section. Bilingual parity. */
interface MemoryCopy {
  title: string;
  deviceNote: string;
  switchLabel: string;
  switchHint: string;
  empty: string;
  addLabel: string;
  addPlaceholder: string;
  addAction: string;
  counter: (count: number) => string;
  edit: string;
  editLabel: string;
  remove: string;
  save: string;
  cancel: string;
  clearAll: string;
  clearConfirm: string;
  clearConfirmAction: string;
  errors: Record<MemoryEditFailure, string>;
}

const PT: MemoryCopy = {
  title: "Memória",
  deviceNote:
    "As anotações ficam só neste aparelho e são enviadas ao modelo a cada mensagem deste bot. Você vê, edita e apaga tudo aqui.",
  switchLabel: "Usar memória",
  switchHint: "Vale para todos os bots. Desligada, nada é enviado.",
  empty: "Nenhuma anotação ainda.",
  addLabel: "Nova anotação",
  addPlaceholder: "ex: Prefiro respostas curtas",
  addAction: "Adicionar",
  counter: (count) => `${count} de ${MEMORY_MAX_ENTRIES} anotações`,
  edit: "Editar",
  editLabel: "Editar anotação",
  remove: "Excluir",
  save: "Salvar",
  cancel: "Cancelar",
  clearAll: "Limpar tudo",
  clearConfirm: "Apagar toda a memória?",
  clearConfirmAction: "Apagar",
  errors: {
    empty: "Escreva algo antes de salvar.",
    too_long: `Cada anotação pode ter até ${MEMORY_MAX_ENTRY_LENGTH} caracteres.`,
    too_many: `A memória guarda até ${MEMORY_MAX_ENTRIES} anotações. Apague alguma para abrir espaço.`,
    total_too_long:
      "A memória chegou ao limite de tamanho. Apague ou encurte alguma anotação.",
    not_found: "Essa anotação não existe mais.",
  },
};

const EN: MemoryCopy = {
  title: "Memory",
  deviceNote:
    "Notes stay on this device only and are sent to the model with each message to this bot. You see, edit and delete everything here.",
  switchLabel: "Use memory",
  switchHint: "Applies to every bot. When off, nothing is sent.",
  empty: "No notes yet.",
  addLabel: "New note",
  addPlaceholder: "e.g. I prefer short answers",
  addAction: "Add",
  counter: (count) => `${count} of ${MEMORY_MAX_ENTRIES} notes`,
  edit: "Edit",
  editLabel: "Edit note",
  remove: "Delete",
  save: "Save",
  cancel: "Cancel",
  clearAll: "Clear all",
  clearConfirm: "Erase all memory?",
  clearConfirmAction: "Erase",
  errors: {
    empty: "Write something before saving.",
    too_long: `Each note can have up to ${MEMORY_MAX_ENTRY_LENGTH} characters.`,
    too_many: `Memory holds up to ${MEMORY_MAX_ENTRIES} notes. Delete one to make room.`,
    total_too_long: "Memory reached its size limit. Delete or shorten a note.",
    not_found: "That note no longer exists.",
  },
};

const ES: MemoryCopy = {
  title: "Memoria",
  deviceNote:
    "Las notas se quedan solo en este dispositivo y se envían al modelo con cada mensaje a este bot. Aquí ves, editas y borras todo.",
  switchLabel: "Usar memoria",
  switchHint: "Vale para todos los bots. Si está apagada, no se envía nada.",
  empty: "Aún no hay notas.",
  addLabel: "Nueva nota",
  addPlaceholder: "ej.: Prefiero respuestas cortas",
  addAction: "Agregar",
  counter: (count) => `${count} de ${MEMORY_MAX_ENTRIES} notas`,
  edit: "Editar",
  editLabel: "Editar nota",
  remove: "Eliminar",
  save: "Guardar",
  cancel: "Cancelar",
  clearAll: "Borrar todo",
  clearConfirm: "¿Borrar toda la memoria?",
  clearConfirmAction: "Borrar",
  errors: {
    empty: "Escribe algo antes de guardar.",
    too_long: `Cada nota puede tener hasta ${MEMORY_MAX_ENTRY_LENGTH} caracteres.`,
    too_many: `La memoria guarda hasta ${MEMORY_MAX_ENTRIES} notas. Borra alguna para liberar espacio.`,
    total_too_long:
      "La memoria llegó al límite de tamaño. Borra o acorta alguna nota.",
    not_found: "Esa nota ya no existe.",
  },
};

const MEMORY_COPY: Record<Language, MemoryCopy> = { pt: PT, en: EN, es: ES };

export function getMemoryCopy(language: Language): MemoryCopy {
  return MEMORY_COPY[language];
}
