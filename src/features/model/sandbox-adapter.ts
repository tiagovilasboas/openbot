import type {
  ModelAdapter,
  ModelRequest,
  ModelResult,
} from "./model-adapter.ts";

export function createSandboxAdapter(model = "chief-sim-v1"): ModelAdapter {
  return {
    provider: "sandbox",
    model,
    async generateReply(request: ModelRequest): Promise<ModelResult> {
      // Small simulated latency for realistic interactive feel
      await new Promise((resolve) => setTimeout(resolve, 80));

      const isPt = request.language === "pt";
      const lastMessage = request.messages[request.messages.length - 1];
      const query = (lastMessage?.text ?? "").trim().toLowerCase();

      // Health-check / ping queries from connection test
      if (query === "ping" || query === "test") {
        return {
          ok: true,
          provider: "sandbox",
          text: isPt
            ? "Pong! Simulador Chief of Staff operacional."
            : "Pong! Chief of Staff simulator operational.",
        };
      }

      // Context-aware simulated assistant responses
      let reply: string;
      if (
        query.includes("bot") ||
        query.includes("delegar") ||
        query.includes("delegate")
      ) {
        reply = isPt
          ? "🤖 **Coordenação de Bots (Simulador):**\n\nIdentifiquei a necessidade de orquestração. No OpenBot, você pode criar bots especializados na barra lateral ou mencionar `@bot` no chat para delegar tarefas específicas (ex: `@code-review`, `@documenter`).\n\nComo posso direcionar seu fluxo agora?"
          : "🤖 **Bot Coordination (Simulator):**\n\nOrchestration intent detected. In OpenBot, you can create specialized bots in the sidebar or mention `@bot` directly in the composer to delegate specific tasks.\n\nHow should we direct the workflow?";
      } else if (
        query.includes("ajuda") ||
        query.includes("help") ||
        query.includes("quem é você") ||
        query.includes("who are you")
      ) {
        reply = isPt
          ? "👋 **Chief of Staff (Modo Sandbox):**\n\nSou o seu orquestrador e coordenador geral. Neste modo de simulação de alta fidelidade, você pode:\n- Testar a interface sem chaves de API externas\n- Experimentar comandos de skills com `/`\n- Mencionar bots com `@`\n- Conectar a qualquer momento a OpenRouter ou modelos locais nas Configurações."
          : "👋 **Chief of Staff (Sandbox Mode):**\n\nI am your lead orchestrator. In this high-fidelity simulation mode, you can test commands, mention bots with `@`, explore `/` skills, or switch to live models anytime in Settings.";
      } else {
        reply = isPt
          ? `⚡ **Chief of Staff (Simulador):**\n\nRecebi sua mensagem: *"${lastMessage?.text ?? ""}"*.\n\nO ambiente está totalmente funcional em modo Sandbox de ponta a ponta. Você pode planejar tarefas, alternar bots na barra lateral ou conectar um modelo de IA real (OpenRouter, Ollama ou Anthropic) no menu de configurações a qualquer momento.`
          : `⚡ **Chief of Staff (Simulator):**\n\nReceived your message: *"${lastMessage?.text ?? ""}"*.\n\nThe environment is fully functional in end-to-end Sandbox mode. You can plan tasks, switch bots in the sidebar, or connect a live AI model (OpenRouter, Ollama, or Anthropic) in settings whenever ready.`;
      }

      return {
        ok: true,
        provider: "sandbox",
        text: reply,
      };
    },
  };
}
