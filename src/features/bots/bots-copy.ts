import type { Language } from "../language/language.ts";
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
  modelLabel: string;
  modelPlaceholder: string;
  modelHelper: string;
  modelInvalid: string;
  backupLabel: string;
  backupPlaceholder: string;
  backupHelper: string;
  backupInvalid: string;
  save: string;
  cancel: string;
  deleteBot: string;
  deleteConfirm: string;
  deleteConfirmAction: string;
  mainBot: string;
  mainBotHint: string;
  makeMain: string;
  /** `{bot}` is the deleted bot's name. */
  deletedNotice: string;
  undoDelete: string;
  hideBot: string;
  hideBotHint: string;
  restoreBot: string;
  hiddenGroup: string;
  hiddenGroupToggle: string;
  defaultDescription: string;
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
  modelLabel: "Modelo deste bot (opcional)",
  modelPlaceholder: "ex: google/gemma-4-31b-it:free",
  modelHelper:
    "Vazio usa o modelo global das Configurações. O servidor pode limitar os modelos permitidos.",
  modelInvalid:
    "Use só letras, números e os símbolos . _ : / - (até 100 caracteres).",
  backupLabel: "Modelos de reserva (opcional)",
  backupPlaceholder:
    "ex: google/gemma-4-31b-it:free, nvidia/nemotron-3.5-super-vl:free",
  backupHelper:
    "Até 3 ids separados por vírgula, usados em ordem quando o modelo principal falha ou atinge o limite de uso.",
  backupInvalid:
    "Use até 3 ids de modelo válidos, separados por vírgula (letras, números e . _ : / -).",
  save: "Salvar bot",
  cancel: "Cancelar",
  deleteBot: "Excluir bot",
  deleteConfirm: "Excluir?",
  deleteConfirmAction: "Confirmar",
  mainBot: "Bot principal",
  mainBotHint: "Lidera a equipe e não pode ser excluído.",
  makeMain: "Tornar principal",
  deletedNotice: "{bot} excluído.",
  undoDelete: "Desfazer",
  hideBot: "Ocultar bot",
  hideBotHint: "Sai da lista e das menções com @. Você pode restaurar depois.",
  restoreBot: "Restaurar bot",
  hiddenGroup: "Ocultos",
  hiddenGroupToggle: "Mostrar ou recolher os bots ocultos",
  defaultDescription: "Você é um assistente conciso e prestativo.",
  shapes: {
    hexagon: "Hexágono",
    square: "Quadrado",
    circle: "Círculo",
    octagon: "Octógono",
    ghost: "Fantasma",
    flower: "Flor",
    clover: "Trevo",
    dumpling: "Bolinho",
    shield: "Escudo",
    triangle: "Triângulo",
    pentagon: "Pentágono",
    egg: "Ovo",
    cloud: "Nuvem",
    star: "Estrela",
    heart: "Coração",
    gear: "Engrenagem",
    cat: "Gato",
  },
  colors: {
    cyan: "Ciano",
    blue: "Azul",
    violet: "Violeta",
    magenta: "Magenta",
    green: "Verde",
    yellow: "Amarelo",
    orange: "Laranja",
    red: "Vermelho",
    black: "Preto",
    teal: "Verde-água",
    sky: "Céu",
    pink: "Rosa",
    gold: "Dourado",
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
  modelLabel: "This bot's model (optional)",
  modelPlaceholder: "e.g. google/gemma-4-31b-it:free",
  modelHelper:
    "Empty uses the global model from Settings. The server may limit the allowed models.",
  modelInvalid:
    "Use only letters, numbers and the symbols . _ : / - (up to 100 characters).",
  backupLabel: "Backup models (optional)",
  backupPlaceholder:
    "e.g. google/gemma-4-31b-it:free, nvidia/nemotron-3.5-super-vl:free",
  backupHelper:
    "Up to 3 comma-separated ids, tried in order when the main model fails or hits its usage limit.",
  backupInvalid:
    "Use up to 3 valid model ids separated by commas (letters, numbers and . _ : / -).",
  save: "Save bot",
  cancel: "Cancel",
  deleteBot: "Delete bot",
  deleteConfirm: "Delete?",
  deleteConfirmAction: "Confirm",
  mainBot: "Main bot",
  mainBotHint: "Leads the crew and cannot be deleted.",
  makeMain: "Make main",
  deletedNotice: "{bot} deleted.",
  undoDelete: "Undo",
  hideBot: "Hide bot",
  hideBotHint: "Leaves the list and @ mentions. You can restore it later.",
  restoreBot: "Restore bot",
  hiddenGroup: "Hidden",
  hiddenGroupToggle: "Show or collapse the hidden bots",
  defaultDescription: "You are a concise, helpful assistant.",
  shapes: {
    hexagon: "Hexagon",
    square: "Square",
    circle: "Circle",
    octagon: "Octagon",
    ghost: "Ghost",
    flower: "Flower",
    clover: "Clover",
    dumpling: "Dumpling",
    shield: "Shield",
    triangle: "Triangle",
    pentagon: "Pentagon",
    egg: "Egg",
    cloud: "Cloud",
    star: "Star",
    heart: "Heart",
    gear: "Gear",
    cat: "Cat",
  },
  colors: {
    cyan: "Cyan",
    blue: "Blue",
    violet: "Violet",
    magenta: "Magenta",
    green: "Green",
    yellow: "Yellow",
    orange: "Orange",
    red: "Red",
    black: "Black",
    teal: "Teal",
    sky: "Sky",
    pink: "Pink",
    gold: "Gold",
  },
};

const ES: BotsCopy = {
  closeLabel: "Cerrar",
  titleNew: "Nuevo bot",
  titleEdit: "Editar bot",
  previewNamePlaceholder: "Sin nombre",
  previewRolePlaceholder: "Sin especialidad",
  templatesLabel: "Empezar desde una plantilla",
  templatesHint: "Rellena el formulario; ajusta lo que quieras.",
  nameLabel: "Nombre",
  namePlaceholder: "ej.: Dev Bot, Inbox",
  roleLabel: "Especialidad",
  rolePlaceholder: "ej.: Especialista en GitHub",
  shapeLabel: "Forma del avatar",
  colorLabel: "Color del avatar",
  instructionsLabel: "Instrucciones del bot",
  instructionsPlaceholder:
    "Define el comportamiento, el tono y los objetivos de este bot.",
  workspaceLabel: "Contexto del proyecto (opcional)",
  workspacePlaceholder: "Pautas del repositorio, rutas o alcance de este bot.",
  modelLabel: "Modelo de este bot (opcional)",
  modelPlaceholder: "ej.: google/gemma-4-31b-it:free",
  modelHelper:
    "Vacío usa el modelo global de Configuración. El servidor puede limitar los modelos permitidos.",
  modelInvalid:
    "Usa solo letras, números y los símbolos . _ : / - (hasta 100 caracteres).",
  backupLabel: "Modelos de respaldo (opcional)",
  backupPlaceholder:
    "ej.: google/gemma-4-31b-it:free, nvidia/nemotron-3.5-super-vl:free",
  backupHelper:
    "Hasta 3 ids separados por comas, usados en orden cuando el modelo principal falla o alcanza su límite de uso.",
  backupInvalid:
    "Usa hasta 3 ids de modelo válidos separados por comas (letras, números y . _ : / -).",
  save: "Guardar bot",
  cancel: "Cancelar",
  deleteBot: "Eliminar bot",
  deleteConfirm: "¿Eliminar?",
  deleteConfirmAction: "Confirmar",
  mainBot: "Bot principal",
  mainBotHint: "Lidera el equipo y no se puede eliminar.",
  makeMain: "Hacer principal",
  deletedNotice: "{bot} eliminado.",
  undoDelete: "Deshacer",
  hideBot: "Ocultar bot",
  hideBotHint:
    "Sale de la lista y de las menciones con @. Puedes restaurarlo después.",
  restoreBot: "Restaurar bot",
  hiddenGroup: "Ocultos",
  hiddenGroupToggle: "Mostrar u ocultar los bots ocultos",
  defaultDescription: "Eres un asistente conciso y servicial.",
  shapes: {
    hexagon: "Hexágono",
    square: "Cuadrado",
    circle: "Círculo",
    octagon: "Octágono",
    ghost: "Fantasma",
    flower: "Flor",
    clover: "Trébol",
    dumpling: "Empanadilla",
    shield: "Escudo",
    triangle: "Triángulo",
    pentagon: "Pentágono",
    egg: "Huevo",
    cloud: "Nube",
    star: "Estrella",
    heart: "Corazón",
    gear: "Engranaje",
    cat: "Gato",
  },
  colors: {
    cyan: "Cian",
    blue: "Azul",
    violet: "Violeta",
    magenta: "Magenta",
    green: "Verde",
    yellow: "Amarillo",
    orange: "Naranja",
    red: "Rojo",
    black: "Negro",
    teal: "Verde azulado",
    sky: "Celeste",
    pink: "Rosa",
    gold: "Dorado",
  },
};

const BOTS_COPY: Record<Language, BotsCopy> = { pt: PT, en: EN, es: ES };

export function getBotsCopy(language: Language): BotsCopy {
  return BOTS_COPY[language];
}
