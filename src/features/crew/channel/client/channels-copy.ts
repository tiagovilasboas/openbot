import type { Language } from "../../../language/language.ts";

/** Text of the groups: the sidebar list, the form and the room. */
export interface ChannelsCopy {
  title: string;
  note: string;
  empty: string;
  add: string;
  open: string;
  edit: string;
  remove: string;
  removeConfirm: string;
  save: string;
  cancel: string;
  nameLabel: string;
  namePlaceholder: string;
  membersLabel: string;
  membersHelper: (max: number) => string;
  leaderLabel: string;
  instructionsLabel: string;
  instructionsPlaceholder: string;
  roomEmpty: string;
  you: string;
  removedBot: string;
  postLabel: string;
  postPlaceholder: string;
  send: string;
  /** Shown while the group picks who answers. */
  working: string;
  speaking: (name: string) => string;
  stop: string;
  reply: string;
  replyingTo: (name: string) => string;
  cancelReply: string;
  failed: string;
  close: string;
  errors: Record<string, string> & { unknown: string; load: string };
}

const pt: ChannelsCopy = {
  title: "Grupos",
  note: "Converse com vários agentes no mesmo chat. Chame alguém com @nome, todos com @todos, ou responda a uma mensagem.",
  empty: "Nenhum grupo ainda.",
  add: "Novo grupo",
  open: "Abrir",
  edit: "Editar",
  remove: "Excluir",
  removeConfirm: "Excluir este grupo e todas as mensagens dele?",
  save: "Salvar grupo",
  cancel: "Cancelar",
  nameLabel: "Nome",
  namePlaceholder: "Ex.: Lançamento",
  membersLabel: "Membros",
  membersHelper: (max) => `Até ${max} agentes.`,
  leaderLabel: "Quem organiza",
  instructionsLabel: "Instruções",
  instructionsPlaceholder: "Para que serve este grupo e como devem conversar",
  roomEmpty: "Escreva a primeira mensagem do grupo.",
  you: "Você",
  removedBot: "Agente removido",
  postLabel: "Mensagem para o grupo",
  postPlaceholder:
    "Escreva para o grupo (@nome chama alguém, @todos chama todos)",
  send: "Enviar",
  working: "O grupo está vendo quem responde…",
  speaking: (name) => `${name} está digitando…`,
  stop: "Parar agora",
  reply: "Responder",
  replyingTo: (name) => `Respondendo a ${name}`,
  cancelReply: "Cancelar resposta",
  failed: "Não respondeu",
  close: "Fechar",
  errors: {
    unknown: "Não deu certo. Tente de novo.",
    load: "Não consegui carregar os grupos.",
    network: "Sem conexão com o servidor.",
    invalid_name: "Dê um nome ao grupo (até 80 caracteres).",
    invalid_members: "Escolha pelo menos um membro.",
    too_many_members: "Um grupo tem no máximo 8 membros.",
    leader_not_member: "Quem organiza precisa ser um dos membros.",
    invalid_instructions: "As instruções passaram do limite de tamanho.",
    bot_missing: "Um dos membros não existe mais.",
    payload_too_large: "O conteúdo ficou grande demais.",
    channel_busy: "O grupo está ocupado. Tente de novo em instantes.",
    invalid_text: "A mensagem está vazia ou longa demais.",
    not_found: "Este grupo não existe mais.",
  },
};

const en: ChannelsCopy = {
  title: "Groups",
  note: "Talk to several agents in one chat. Call someone with @name, everyone with @all, or reply to a message.",
  empty: "No groups yet.",
  add: "New group",
  open: "Open",
  edit: "Edit",
  remove: "Delete",
  removeConfirm: "Delete this group and all its messages?",
  save: "Save group",
  cancel: "Cancel",
  nameLabel: "Name",
  namePlaceholder: "E.g. Launch",
  membersLabel: "Members",
  membersHelper: (max) => `Up to ${max} agents.`,
  leaderLabel: "Organizer",
  instructionsLabel: "Instructions",
  instructionsPlaceholder: "What this group is for and how they should talk",
  roomEmpty: "Write the group's first message.",
  you: "You",
  removedBot: "Removed agent",
  postLabel: "Message to the group",
  postPlaceholder:
    "Write to the group (@name calls someone, @all calls everyone)",
  send: "Send",
  working: "The group is working out who answers…",
  speaking: (name) => `${name} is typing…`,
  stop: "Stop now",
  reply: "Reply",
  replyingTo: (name) => `Replying to ${name}`,
  cancelReply: "Cancel reply",
  failed: "Did not answer",
  close: "Close",
  errors: {
    unknown: "That didn't work. Try again.",
    load: "I couldn't load the groups.",
    network: "No connection to the server.",
    invalid_name: "Give the group a name (up to 80 characters).",
    invalid_members: "Pick at least one member.",
    too_many_members: "A group has at most 8 members.",
    leader_not_member: "The organizer must be one of the members.",
    invalid_instructions: "The instructions are over the size limit.",
    bot_missing: "One of the members no longer exists.",
    payload_too_large: "The content is too large.",
    channel_busy: "The group is busy. Try again in a moment.",
    invalid_text: "The message is empty or too long.",
    not_found: "This group no longer exists.",
  },
};

const es: ChannelsCopy = {
  title: "Grupos",
  note: "Habla con varios agentes en el mismo chat. Llama a alguien con @nombre, a todos con @todos, o responde a un mensaje.",
  empty: "Todavía no hay grupos.",
  add: "Nuevo grupo",
  open: "Abrir",
  edit: "Editar",
  remove: "Eliminar",
  removeConfirm: "¿Eliminar este grupo y todos sus mensajes?",
  save: "Guardar grupo",
  cancel: "Cancelar",
  nameLabel: "Nombre",
  namePlaceholder: "Ej.: Lanzamiento",
  membersLabel: "Miembros",
  membersHelper: (max) => `Hasta ${max} agentes.`,
  leaderLabel: "Quién organiza",
  instructionsLabel: "Instrucciones",
  instructionsPlaceholder: "Para qué sirve este grupo y cómo deben conversar",
  roomEmpty: "Escribe el primer mensaje del grupo.",
  you: "Tú",
  removedBot: "Agente eliminado",
  postLabel: "Mensaje para el grupo",
  postPlaceholder:
    "Escribe al grupo (@nombre llama a alguien, @todos llama a todos)",
  send: "Enviar",
  working: "El grupo está viendo quién responde…",
  speaking: (name) => `${name} está escribiendo…`,
  stop: "Parar ahora",
  reply: "Responder",
  replyingTo: (name) => `Respondiendo a ${name}`,
  cancelReply: "Cancelar respuesta",
  failed: "No respondió",
  close: "Cerrar",
  errors: {
    unknown: "No funcionó. Inténtalo de nuevo.",
    load: "No pude cargar los grupos.",
    network: "No hay conexión con el servidor.",
    invalid_name: "Ponle un nombre al grupo (hasta 80 caracteres).",
    invalid_members: "Elige al menos un miembro.",
    too_many_members: "Un grupo tiene como máximo 8 miembros.",
    leader_not_member: "Quién organiza debe ser uno de los miembros.",
    invalid_instructions: "Las instrucciones superan el límite de tamaño.",
    bot_missing: "Uno de los miembros ya no existe.",
    payload_too_large: "El contenido es demasiado grande.",
    channel_busy: "El grupo está ocupado. Inténtalo de nuevo en un momento.",
    invalid_text: "El mensaje está vacío o es demasiado largo.",
    not_found: "Este grupo ya no existe.",
  },
};

const COPY: Record<Language, ChannelsCopy> = { pt, en, es };

export function getChannelsCopy(language: Language): ChannelsCopy {
  return COPY[language];
}

/** The message for an error code, falling back to the generic one. */
export function channelErrorText(copy: ChannelsCopy, code: string): string {
  return Object.hasOwn(copy.errors, code)
    ? copy.errors[code]!
    : copy.errors.unknown;
}
