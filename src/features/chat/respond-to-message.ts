export type ChatLanguage = "pt" | "en";

export type MessageResponseOutcome = {
  kind: "unconfigured";
  text: string;
};

export function getUnconfiguredModelMessage(language: ChatLanguage): string {
  return language === "pt"
    ? "Nenhum modelo configurado. Conecte um modelo em Configurações."
    : "No model configured. Connect a model in Settings.";
}

export function respondToMessage(
  _input: string,
  language: ChatLanguage,
): MessageResponseOutcome {
  return {
    kind: "unconfigured",
    text: getUnconfiguredModelMessage(language),
  };
}
