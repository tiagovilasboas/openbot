"use client";

import { useState } from "react";
import type { ChatLanguage } from "@/features/chat/respond-to-message.ts";
import { ResponsiveSheet } from "@/shared/ui/ResponsiveSheet.tsx";
import { crewRoomCopy } from "./crew-room-copy.ts";
import type { CrewRoomView } from "./crew-room-view.ts";
import { CrewRoomStep } from "./CrewRoomStep.tsx";

interface CrewRoomControlProps {
  room: CrewRoomView;
  language: ChatLanguage;
}

/** "Team room" under a delegated reply: opens who was asked what, and how. */
export function CrewRoomControl({ room, language }: CrewRoomControlProps) {
  const copy = crewRoomCopy[language];
  const [open, setOpen] = useState(false);
  const total = room.steps.length;

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className="min-h-11 self-start rounded-full border border-border bg-surface px-4 text-[13px] font-medium text-foreground transition-colors duration-(--duration-micro) ease-out-expo hover:bg-surface-secondary active:scale-[0.97]"
      >
        {copy.open}
      </button>
      <ResponsiveSheet
        isOpen={open}
        onClose={() => setOpen(false)}
        title={copy.title}
        description={copy.subtitle(total)}
        closeLabel={copy.close}
        size="md"
      >
        <div className="flex flex-col gap-5">
          <section aria-labelledby={`kickoff-${room.synthesis.id}`}>
            <h3
              id={`kickoff-${room.synthesis.id}`}
              className="text-xs font-semibold uppercase tracking-wide text-muted"
            >
              {copy.kickoffHeading}
            </h3>
            <p className="mt-1.5 whitespace-pre-wrap break-words text-[14px] leading-[1.55] text-foreground">
              {room.kickoff}
            </p>
          </section>

          <section aria-labelledby={`steps-${room.synthesis.id}`}>
            <h3
              id={`steps-${room.synthesis.id}`}
              className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted"
            >
              {copy.stepsHeading}
            </h3>
            <ol className="flex flex-col">
              {room.steps.map((step, index) => (
                <CrewRoomStep
                  key={step.id}
                  step={step}
                  position={index + 1}
                  total={total}
                  language={language}
                />
              ))}
            </ol>
          </section>

          <section aria-labelledby={`final-${room.synthesis.id}`}>
            <h3
              id={`final-${room.synthesis.id}`}
              className="text-xs font-semibold uppercase tracking-wide text-muted"
            >
              {copy.synthesisHeading}
            </h3>
            <p className="mt-1.5 whitespace-pre-wrap break-words text-[14px] leading-[1.55] text-foreground">
              {room.synthesis.text}
            </p>
          </section>
        </div>
      </ResponsiveSheet>
    </>
  );
}
