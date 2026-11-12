import type { ModelRequest } from "./model-adapter.ts";
import type { ToolSpec } from "./tool-wire.ts";

/** The chat messages in the OpenAI/Ollama wire shape, system prompt first. */
export function toWireMessages(request: ModelRequest) {
  const messages: Record<string, unknown>[] = [
    ...(request.systemPrompt
      ? [{ role: "system", content: request.systemPrompt }]
      : []),
    ...request.messages.map((message) => ({
      role: message.role,
      content: message.text,
    })),
  ];
  messages.push(...toolTranscriptMessages(request));
  return messages;
}

/** Earlier tool exchanges as one assistant tool_calls turn plus tool replies. */
function toolTranscriptMessages(request: ModelRequest) {
  const exchanges = request.toolTranscript;
  if (!exchanges?.length) return [];
  return [
    {
      role: "assistant",
      content: null,
      tool_calls: exchanges.map(({ call }) => ({
        id: call.id,
        type: "function",
        function: { name: call.name, arguments: call.argsJson },
      })),
    },
    ...exchanges.map(({ call, result }) => ({
      role: "tool",
      tool_call_id: call.id,
      content: result.text,
    })),
  ];
}

/** The OpenAI `tools` field to spread into a body; empty when there are none. */
export function toolsBody(tools: ToolSpec[] | undefined) {
  if (!tools?.length) return {};
  return {
    tools: tools.map((tool) => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    })),
  };
}
