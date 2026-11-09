import type { AvatarColor, AvatarShape } from "./bot-types.ts";

interface BotsCopy {
  closeLabel: string;
  titleNew: string;
  titleEdit: string;
  previewNamePlaceholder: string;
  previewRolePlaceholder: string;
  templatesLabel: string;
  templatesHint: string;
  nameLabel: string;
  namePlaceholder: string;
  roleLabel: string;
  rolePlaceholder: string;
  shapeLabel: string;
  colorLabel: string;
  instructionsLabel: string;
  instructionsPlaceholder: string;
  workspaceLabel: string;
  workspacePlaceholder: string;
  skillsLabel: string;
  skillsEmpty: string;
  save: string;
  cancel: string;
  deleteBot: string;
  deleteConfirm: string;
  deleteConfirmAction: string;
  shapes: Record<AvatarShape, string>;
  colors: Record<AvatarColor, string>;
}

const PT: BotsCopy = {
  closeLabel: "Fechar",
  titleNew: "Novo bot",
  titleEdit: "Editar bot",
  previewNamePlaceholder: "Sem nome",
  previewRolePlaceholder: "Sem especialidade",
  templatesLabel: "Começar de um modelo",
  templatesHint: "Preenche o formulário; você ajusta o que quiser.",
  nameLabel: "Nome",
  namePlaceholder: "ex: Dev Bot, Inbox",
  roleLabel: "Especialidade",
  rolePlaceholder: "ex: Especialista em GitHub",
  shapeLabel: "Forma do avatar",
  colorLabel: "Cor do avatar",
  instructionsLabel: "Instruções do bot",
  instructionsPlaceholder:
    "Defina o comportamento, o tom e os objetivos deste bot.",
  workspaceLabel: "Contexto de projeto (opcional)",
  workspacePlaceholder:
    "Diretrizes de repositório, caminhos ou escopo deste bot.",
  skillsLabel: "Skills habilitadas",
  skillsEmpty:
    "Nenhuma skill cadastrada ainda. Crie skills em Configurações > Skills.",
  save: "Salvar bot",
  cancel: "Cancelar",
  deleteBot: "Excluir bot",
  deleteConfirm: "Excluir?",
  deleteConfirmAction: "Confirmar",
  shapes: {
    hexagon: "Hexágono",
    square: "Quadrado",
    circle: "Círculo",
    octagon: "Octógono",
    diamond: "Losango",
    triangle: "Triângulo",
    pentagon: "Pentágono",
    egg: "Ovo",
    cloud: "Nuvem",
  },
  colors: {
    vermilion: "Vermelhão",
    sienna: "Siena",
    ochre: "Ocre",
    sap: "Verde-seiva",
    viridian: "Verde-viridian",
    cerulean: "Azul-cerúleo",
    cobalt: "Azul-cobalto",
    mauve: "Malva",
    rose: "Rosa",
    graphite: "Grafite",
  },
};

const EN: BotsCopy = {
  closeLabel: "Close",
  titleNew: "New bot",
  titleEdit: "Edit bot",
  previewNamePlaceholder: "Unnamed",
  previewRolePlaceholder: "No specialty",
  templatesLabel: "Start from a template",
  templatesHint: "Fills the form; adjust anything you like.",
  nameLabel: "Name",
  namePlaceholder: "e.g. Dev Bot, Inbox",
  roleLabel: "Specialty",
  rolePlaceholder: "e.g. GitHub specialist",
  shapeLabel: "Avatar shape",
  colorLabel: "Avatar color",
  instructionsLabel: "Bot instructions",
  instructionsPlaceholder: "Define this bot's behavior, tone and goals.",
  workspaceLabel: "Project context (optional)",
  workspacePlaceholder: "Repository guidelines, paths or scope for this bot.",
  skillsLabel: "Enabled skills",
  skillsEmpty: "No skills yet. Create skills in Settings > Skills.",
  save: "Save bot",
  cancel: "Cancel",
  deleteBot: "Delete bot",
  deleteConfirm: "Delete?",
  deleteConfirmAction: "Confirm",
  shapes: {
    hexagon: "Hexagon",
    square: "Square",
    circle: "Circle",
    octagon: "Octagon",
    diamond: "Diamond",
    triangle: "Triangle",
    pentagon: "Pentagon",
    egg: "Egg",
    cloud: "Cloud",
  },
  colors: {
    vermilion: "Vermilion",
    sienna: "Sienna",
    ochre: "Ochre",
    sap: "Sap green",
    viridian: "Viridian",
    cerulean: "Cerulean",
    cobalt: "Cobalt",
    mauve: "Mauve",
    rose: "Rose",
    graphite: "Graphite",
  },
};

export function getBotsCopy(isPt: boolean): BotsCopy {
  return isPt ? PT : EN;
}
