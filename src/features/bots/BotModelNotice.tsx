/** Polite status line announcing a model change; the region stays mounted. */
export function BotModelNotice({ message }: { message: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={
        message
          ? "pointer-events-none fixed inset-x-0 top-16 z-40 mx-auto w-fit max-w-[90vw] rounded-full border border-border bg-overlay px-4 py-2 text-xs md:text-[13px] text-foreground shadow-overlay"
          : "sr-only"
      }
    >
      {message}
    </div>
  );
}
