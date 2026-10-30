import { Chip } from "@heroui/react";
import type { CalendarEvent } from "@/features/calendar/list-example-events";
import { chatCopy } from "./chat-copy";
import type { ChatLanguage } from "./respond-to-message";

export function ChatToolResult({
  events,
  language,
}: {
  events: CalendarEvent[];
  language: ChatLanguage;
}) {
  return (
    <div className="mt-4 flex flex-col gap-2">
      <Chip color="success" variant="soft">
        {chatCopy[language].tool}
      </Chip>
      <p className="text-xs text-muted">{chatCopy[language].source}</p>
      {events.map((event) => (
        <div
          key={event.id}
          className="flex items-start justify-between gap-4 border-t border-separator pt-2 text-sm"
        >
          <span className="min-w-0">
            <span className="block">{event.title}</span>
            <span className="block text-xs text-muted">{event.detail}</span>
          </span>
          <span className="shrink-0 text-muted">{event.time}</span>
        </div>
      ))}
    </div>
  );
}
