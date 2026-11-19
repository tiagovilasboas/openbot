import type { Language } from "../../../language/language.ts";

/** Copy for the crew channels section and room. Trilingual parity. */
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
  working: string;
  close: string;
  /** Server and form error codes; unknown codes use `unknown`. */
  errors: Record<string, string> & { unknown: string; load: string };
}

const pt: ChannelsCopy = {
  title: "Canais da equipe",
  note: "Salas com membros fixos. O líder recebe cada mensagem e chama os outros.",
  empty: "Nenhum canal ainda.",
  add: "Novo canal",
  open: "Abrir",
  edit: "Editar",
  remove: "Excluir",
  removeConfirm: "Excluir este canal e todas as mensagens dele?",
  save: "Salvar canal",
  cancel: "Cancelar",
  nameLabel: "Nome",
  namePlaceholder: "Ex.: Lançamento",
  membersLabel: "Membros",
  membersHelper: (max) => `Até ${max} bots, contando o líder.`,
  leaderLabel: "Líder",
  instructionsLabel: "Instruções",
  instructionsPlaceholder:
    "O que este canal faz e como a equipe deve trabalhar",
  roomEmpty: "Escreva a primeira mensagem do canal.",
  you: "Você",
  removedBot: "Bot removido",
  postLabel: "Mensagem para o canal",
  postPlaceholder: "Escreva para a equipe (use @nome para chamar alguém)",
  send: "Enviar",
  working: "A equipe está respondendo…",
  close: "Fechar",
  errors: {
    unknown: "Não deu certo. Tente de novo.",
    load: "Não consegui carregar os canais.",
    network: "Sem conexão com o servidor.",
    invalid_name: "Dê um nome ao canal (até 80 caracteres).",
    invalid_members: "Escolha pelo menos um membro.",
    too_many_members: "Um canal tem no máximo 8 membros.",
    leader_not_member: "O líder precisa ser um dos membros.",
    invalid_instructions: "As instruções passaram do limite de tamanho.",
    bot_missing: "Um dos membros não existe mais.",
    payload_too_large: "O conteúdo ficou grande demais.",
    channel_busy: "O canal já está com duas respostas em andamento. Aguarde.",
    leader_missing: "O líder deste canal foi removido. Edite o canal.",
    invalid_text: "A mensagem está vazia ou longa demais.",
    not_found: "Este canal não existe mais.",
  },
};

const en: ChannelsCopy = {
  title: "Crew channels",
  note: "Rooms with a fixed crew. The leader takes each message and calls the others.",
  empty: "No channels yet.",
  add: "New channel",
  open: "Open",
  edit: "Edit",
  remove: "Delete",
  removeConfirm: "Delete this channel and all its messages?",
  save: "Save channel",
  cancel: "Cancel",
  nameLabel: "Name",
  namePlaceholder: "E.g. Launch",
  membersLabel: "Members",
  membersHelper: (max) => `Up to ${max} bots, the leader included.`,
  leaderLabel: "Leader",
  instructionsLabel: "Instructions",
  instructionsPlaceholder:
    "What this channel is for and how the crew should work",
  roomEmpty: "Write the channel's first message.",
  you: "You",
  removedBot: "Removed bot",
  postLabel: "Message to the channel",
  postPlaceholder: "Write to the crew (use @name to call someone)",
  send: "Send",
  working: "The crew is answering…",
  close: "Close",
  errors: {
    unknown: "That didn't work. Try again.",
    load: "Couldn't load the channels.",
    network: "Can't reach the server.",
    invalid_name: "Give the channel a name (up to 80 characters).",
    invalid_members: "Pick at least one member.",
    too_many_members: "A channel holds at most 8 members.",
    leader_not_member: "The leader must be one of the members.",
    invalid_instructions: "The instructions are over the size limit.",
    bot_missing: "One of the members no longer exists.",
    payload_too_large: "That's too much content.",
    channel_busy: "The channel is already running two replies. Wait a moment.",
    leader_missing: "This channel's leader was removed. Edit the channel.",
    invalid_text: "The message is empty or too long.",
    not_found: "This channel no longer exists.",
  },
};

const es: ChannelsCopy = {
  title: "Canales del equipo",
  note: "Salas con miembros fijos. El líder recibe cada mensaje y llama a los demás.",
  empty: "Todavía no hay canales.",
  add: "Nuevo canal",
  open: "Abrir",
  edit: "Editar",
  remove: "Eliminar",
  removeConfirm: "¿Eliminar este canal y todos sus mensajes?",
  save: "Guardar canal",
  cancel: "Cancelar",
  nameLabel: "Nombre",
  namePlaceholder: "Ej.: Lanzamiento",
  membersLabel: "Miembros",
  membersHelper: (max) => `Hasta ${max} bots, contando al líder.`,
  leaderLabel: "Líder",
  instructionsLabel: "Instrucciones",
  instructionsPlaceholder:
    "Para qué sirve este canal y cómo debe trabajar el equipo",
  roomEmpty: "Escribe el primer mensaje del canal.",
  you: "Tú",
  removedBot: "Bot eliminado",
  postLabel: "Mensaje para el canal",
  postPlaceholder: "Escribe al equipo (usa @nombre para llamar a alguien)",
  send: "Enviar",
  working: "El equipo está respondiendo…",
  close: "Cerrar",
  errors: {
    unknown: "No funcionó. Inténtalo de nuevo.",
    load: "No pude cargar los canales.",
    network: "No hay conexión con el servidor.",
    invalid_name: "Ponle un nombre al canal (hasta 80 caracteres).",
    invalid_members: "Elige al menos un miembro.",
    too_many_members: "Un canal tiene como máximo 8 miembros.",
    leader_not_member: "El líder debe ser uno de los miembros.",
    invalid_instructions: "Las instrucciones superan el límite de tamaño.",
    bot_missing: "Uno de los miembros ya no existe.",
    payload_too_large: "El contenido es demasiado grande.",
    channel_busy:
      "El canal ya tiene dos respuestas en curso. Espera un momento.",
    leader_missing: "El líder de este canal fue eliminado. Edita el canal.",
    invalid_text: "El mensaje está vacío o es demasiado largo.",
    not_found: "Este canal ya no existe.",
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
