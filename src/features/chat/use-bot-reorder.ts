"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { BotProfile } from "@/features/bots/bot-types.ts";
import { dropIndexAt, reorderBots } from "@/features/bots/reorder-bots.ts";

interface BotReorderInput {
  bots: BotProfile[];
  mainBotId?: string;
  onReorder: (botId: string, toIndex: number) => void;
  /** "{name} at position {position} of {total}" in the user's language. */
  movedTemplate: string;
}

function announcement(
  template: string,
  name: string,
  position: number,
  total: number,
): string {
  return template
    .replace("{name}", name)
    .replace("{position}", String(position))
    .replace("{total}", String(total));
}

/**
 * Reordering the bot list by pointer (drag the handle) or keyboard (arrow
 * keys on the handle). While dragging, the rows swap live in `order`; the
 * result is only saved on release, and Escape or a cancelled pointer puts
 * everything back. Every move is announced through `status`.
 */
export function useBotReorder({
  bots,
  mainBotId,
  onReorder,
  movedTemplate,
}: BotReorderInput) {
  const [preview, setPreview] = useState<BotProfile[] | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const rows = useRef(new Map<string, HTMLElement>());
  const handles = useRef(new Map<string, HTMLElement>());
  const dragEnd = useRef<(() => void) | null>(null);
  const latest = useRef({ bots, mainBotId, onReorder, movedTemplate });

  useEffect(() => {
    latest.current = { bots, mainBotId, onReorder, movedTemplate };
  });
  // A drag in progress must not outlive the list.
  useEffect(() => {
    const drag = dragEnd;
    return () => drag.current?.();
  }, []);

  const registerRow = useCallback(
    (id: string) => (el: HTMLElement | null) => {
      if (el) rows.current.set(id, el);
      else rows.current.delete(id);
    },
    [],
  );
  const registerHandle = useCallback(
    (id: string) => (el: HTMLElement | null) => {
      if (el) handles.current.set(id, el);
      else handles.current.delete(id);
    },
    [],
  );

  // A moved row can lose focus in the DOM; hand it back once rendered.
  function refocus(id: string) {
    requestAnimationFrame(() => handles.current.get(id)?.focus());
  }

  function announce(list: BotProfile[], id: string) {
    const index = list.findIndex((bot) => bot.id === id);
    setStatus(
      announcement(
        latest.current.movedTemplate,
        list[index]?.name ?? "",
        index + 1,
        list.length,
      ),
    );
  }

  function startDrag(event: ReactPointerEvent, id: string) {
    if (event.button !== 0 || dragEnd.current) return;
    event.preventDefault();
    const origin = latest.current.bots;
    let current = origin;
    setDraggingId(id);
    setPreview(origin);

    const onMove = (move: PointerEvent) => {
      const centres = current
        .filter((bot) => bot.id !== id)
        .map((bot) => {
          const rect = rows.current.get(bot.id)?.getBoundingClientRect();
          return rect ? rect.top + rect.height / 2 : 0;
        });
      const next = reorderBots(
        current,
        id,
        dropIndexAt(centres, move.clientY),
        latest.current.mainBotId,
      );
      if (next.some((bot, i) => bot !== current[i])) {
        current = next;
        setPreview(next);
      }
    };
    const end = (commit: boolean) => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("keydown", onKey);
      dragEnd.current = null;
      setDraggingId(null);
      setPreview(null);
      if (commit && current.some((bot, i) => bot !== origin[i])) {
        latest.current.onReorder(
          id,
          current.findIndex((bot) => bot.id === id),
        );
        announce(current, id);
      }
      refocus(id);
    };
    const onUp = () => end(true);
    const onCancel = () => end(false);
    const onKey = (key: KeyboardEvent) => {
      if (key.key === "Escape") end(false);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    window.addEventListener("keydown", onKey);
    dragEnd.current = () => end(false);
  }

  function moveByKey(event: ReactKeyboardEvent, id: string) {
    const step =
      event.key === "ArrowUp" ? -1 : event.key === "ArrowDown" ? 1 : 0;
    if (!step) return;
    event.preventDefault();
    const { bots: list, mainBotId: main, onReorder: save } = latest.current;
    const to = list.findIndex((bot) => bot.id === id) + step;
    save(id, to);
    announce(reorderBots(list, id, to, main), id);
    refocus(id);
  }

  return {
    order: preview ?? bots,
    draggingId,
    status,
    registerRow,
    registerHandle,
    startDrag,
    moveByKey,
  };
}
