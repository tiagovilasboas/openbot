import type { Language } from "../language/language.ts";

interface AgentSetupCopy {
  title: string;
  intro: string;
  nameLabel: string;
  namePlaceholder: string;
  roleLabel: string;
  rolePlaceholder: string;
  instructionsLabel: string;
  instructionsHint: string;
  extraTitle: string;
  extraHint: string;
  create: string;
  starterKitTitle: string;
  starterKitHint: string;
  starterKitAction: string;
  loading: string;
  restoreTitle: string;
}

const COPY: Record<Language, AgentSetupCopy> = {
  pt: {
    title: "Crie seus agentes",
    intro:
      "Nenhum agente vem pronto. Comece pelo principal: ele responde e coordena os outros.",
    nameLabel: "Nome do agente principal",
    namePlaceholder: "Ex.: Assistente",
    roleLabel: "Papel (opcional)",
    rolePlaceholder: "Ex.: Coordenador",
    instructionsLabel: "Instruções (opcional)",
    instructionsHint:
      "Como ele deve agir. Dá para mudar depois no editor do agente.",
    extraTitle: "Mais agentes (opcional)",
    extraHint: "Marque só os que quiser. Você também pode criar outros depois.",
    create: "Criar e começar",
    starterKitTitle: "Prefere um Starter Kit pronto?",
    starterKitHint:
      "Carrega o template com Chief of Staff e 8 especialistas já configurados. Se preferir manter limpo, crie apenas o seu agente acima.",
    starterKitAction: "Usar Starter Kit (9 agentes)",
    loading: "Carregando…",
    restoreTitle: "Já usa o Open Bot? Restaurar um backup",
  },
  en: {
    title: "Create your agents",
    intro:
      "No agent comes ready-made. Start with the main one: it answers and coordinates the others.",
    nameLabel: "Main agent name",
    namePlaceholder: "E.g. Assistant",
    roleLabel: "Role (optional)",
    rolePlaceholder: "E.g. Coordinator",
    instructionsLabel: "Instructions (optional)",
    instructionsHint:
      "How it should act. You can change it later in the agent editor.",
    extraTitle: "More agents (optional)",
    extraHint: "Check only the ones you want. You can create others later too.",
    create: "Create and start",
    starterKitTitle: "Prefer a ready-made Starter Kit?",
    starterKitHint:
      "Loads the template with Chief of Staff and 8 configured specialists. To keep it clean, just create your own agent above.",
    starterKitAction: "Use Starter Kit (9 agents)",
    loading: "Loading…",
    restoreTitle: "Already use Open Bot? Restore a backup",
  },
  es: {
    title: "Crea tus agentes",
    intro:
      "Ningún agente viene listo. Empieza por el principal: responde y coordina a los demás.",
    nameLabel: "Nombre del agente principal",
    namePlaceholder: "Ej.: Asistente",
    roleLabel: "Rol (opcional)",
    rolePlaceholder: "Ej.: Coordinador",
    instructionsLabel: "Instrucciones (opcional)",
    instructionsHint:
      "Cómo debe actuar. Puedes cambiarlo después en el editor del agente.",
    extraTitle: "Más agentes (opcional)",
    extraHint:
      "Marca solo los que quieras. También puedes crear otros después.",
    create: "Crear y empezar",
    starterKitTitle: "¿Prefieres un Starter Kit listo?",
    starterKitHint:
      "Carga la plantilla con Chief of Staff y 8 especialistas configurados. Si prefieres empezar limpio, crea solo tu agente arriba.",
    starterKitAction: "Usar Starter Kit (9 agentes)",
    loading: "Cargando…",
    restoreTitle: "¿Ya usas Open Bot? Restaurar una copia",
  },
};

export function getAgentSetupCopy(language: Language): AgentSetupCopy {
  return COPY[language];
}
