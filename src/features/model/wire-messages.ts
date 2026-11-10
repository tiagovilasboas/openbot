import type { ModelRequest } from "./model-adapter.ts";

/** The chat messages in the OpenAI/Ollama wire shape, system prompt first. */
export function toWireMessages(request: ModelRequest) {
  return [
    ...(request.systemPrompt
      ? [{ role: "system", content: request.systemPrompt }]
      : []),
    ...request.messages.map((message) => ({
      role: message.role,
      content: message.text,
    })),
  ];
}
