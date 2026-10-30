import {
  listExampleEvents,
  type CalendarEvent,
} from "../calendar/list-example-events.ts";

export type ChatLanguage = "pt" | "en";

export type DemoReply =
  | { kind: "text"; text: string }
  | { kind: "calendar"; text: string; events: CalendarEvent[] };

const calendarRequest =
  /\b(agenda|calendario|eventos?|compromissos?|calendar|events?|schedule)\b/;

export function respondToMessage(
  input: string,
  language: ChatLanguage,
): DemoReply {
  const normalized = input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase();

  if (calendarRequest.test(normalized)) {
    return {
      kind: "calendar",
      text:
        language === "pt"
          ? "Aqui está uma agenda de exemplo, sem data real."
          : "Here is an example calendar with no real date.",
      events: listExampleEvents(language),
    };
  }

  return {
    kind: "text",
    text:
      language === "pt"
        ? "Esta demonstração ainda não usa um modelo. Peça para ver sua agenda e eu mostro como uma ferramenta funciona."
        : "This demo does not use a model yet. Ask to see your calendar and I will show how a tool works.",
  };
}
