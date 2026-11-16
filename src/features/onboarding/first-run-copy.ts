import type { ChatLanguage } from "../chat/respond-to-message.ts";

const pt = {
  title: "Comece em um minuto",
  chooseBody: "Escolha como o Open Bot vai responder. Nada é enviado antes.",
  startFree: "Começar grátis",
  startFreeHint: "Usa os modelos gratuitos do OpenRouter.",
  connect: "Conectar um provedor",
  connectHint: "Use sua conta ou uma chave de API.",
  checking: "Verificando se há uma chave do OpenRouter salva…",
  needsKeyTitle: "Falta uma chave gratuita do OpenRouter",
  needsKeyBody:
    "Os modelos gratuitos do OpenRouter também pedem uma chave. Crie uma em openrouter.ai/keys (é grátis) e conecte aqui.",
  getKey: "Obter chave",
  connectKey: "Conectar chave",
  otherProviders: "Outros provedores",
  starterPrompt: "Oi! O que você consegue fazer por mim?",
  agentsLocked: "Conecte um provedor para usar os agentes",
  composerLocked: "Conecte um provedor acima para começar a conversar",
};

type FirstRunCopy = typeof pt;

const en: FirstRunCopy = {
  title: "Get going in a minute",
  chooseBody: "Pick how Open Bot will answer. Nothing is sent before then.",
  startFree: "Start free",
  startFreeHint: "Uses OpenRouter's free models.",
  connect: "Connect a provider",
  connectHint: "Use your account or an API key.",
  checking: "Checking for a saved OpenRouter key…",
  needsKeyTitle: "A free OpenRouter key is missing",
  needsKeyBody:
    "OpenRouter's free models also need a key. Create one at openrouter.ai/keys (it is free) and connect it here.",
  getKey: "Get a key",
  connectKey: "Connect key",
  otherProviders: "Other providers",
  starterPrompt: "Hi! What can you do for me?",
  agentsLocked: "Connect a provider to use the agents",
  composerLocked: "Connect a provider above to start chatting",
};

const es: FirstRunCopy = {
  title: "Empieza en un minuto",
  chooseBody: "Elige cómo responderá Open Bot. No se envía nada antes.",
  startFree: "Empezar gratis",
  startFreeHint: "Usa los modelos gratuitos de OpenRouter.",
  connect: "Conectar un proveedor",
  connectHint: "Usa tu cuenta o una clave de API.",
  checking: "Comprobando si hay una clave de OpenRouter guardada…",
  needsKeyTitle: "Falta una clave gratuita de OpenRouter",
  needsKeyBody:
    "Los modelos gratuitos de OpenRouter también piden una clave. Crea una en openrouter.ai/keys (es gratis) y conéctala aquí.",
  getKey: "Obtener clave",
  connectKey: "Conectar clave",
  otherProviders: "Otros proveedores",
  starterPrompt: "¡Hola! ¿Qué puedes hacer por mí?",
  agentsLocked: "Conecta un proveedor para usar los agentes",
  composerLocked: "Conecta un proveedor arriba para empezar a chatear",
};

export const firstRunCopy: Record<ChatLanguage, FirstRunCopy> = { pt, en, es };
