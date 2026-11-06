import type { CalendarEvent } from "@/features/calendar/list-example-events.ts";
import { chatCopy } from "./chat-copy.ts";
import type { ChatLanguage } from "./respond-to-message.ts";

export function ChatToolResult({
  events,
  language,
}: {
  events: CalendarEvent[];
  language: ChatLanguage;
}) {
  const content = chatCopy[language];

  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900/60 p-3 sm:p-4 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-2 text-xs">
        <span className="inline-flex items-center gap-1.5 font-medium text-emerald-400">
          <span className="size-1.5 rounded-full bg-emerald-400" />
          {content.tool}
        </span>
        <span className="text-[11px] text-zinc-500">{content.source}</span>
      </div>
      <div className="divide-y divide-white/5">
        {events.map((event) => (
          <div
            key={event.id}
            className="flex items-start justify-between gap-4 py-2 text-sm first:pt-2.5 last:pb-0"
          >
            <span className="min-w-0">
              <span className="block font-medium text-zinc-200">
                {event.title}
              </span>
              <span className="block text-xs text-zinc-400">
                {event.detail}
              </span>
            </span>
            <span className="shrink-0 font-mono text-xs text-zinc-500">
              {event.time}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
