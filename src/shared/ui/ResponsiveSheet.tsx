"use client";

import { Modal } from "@heroui/react";
import { createContext, useContext, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * ResponsiveSheet: the app's one overlay primitive.
 * Phone: bottom sheet (grab handle, max-h-[92dvh], sticky header/footer).
 * Desktop (md:): centered dialog (max-w-2xl by default, max-h-[85dvh]).
 * Built on HeroUI Modal, so focus trap, Esc, scroll lock and aria come free.
 *
 * Slots: header (title + close, sticky), `subheader` (sticky, under header,
 * e.g. tabs), body (`children`, scrolls), footer (sticky actions).
 * A child deeper in the tree that owns the state can render its actions with
 * `<SheetFooter>` instead of lifting state up to pass the `footer` prop.
 *
 * Usage:
 *   <ResponsiveSheet isOpen={open} onClose={close} title="Edit bot"
 *     footer={<Button onPress={save}>Save</Button>}>
 *     ...fields...
 *   </ResponsiveSheet>
 */
export interface ResponsiveSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  subheader?: ReactNode;
  /** Desktop width: md = max-w-lg, lg = max-w-2xl (default), xl = max-w-3xl. */
  size?: "md" | "lg" | "xl";
  /** Accessible name for the close button. */
  closeLabel?: string;
}

const DESKTOP_WIDTH = {
  md: "md:max-w-lg",
  lg: "md:max-w-2xl",
  xl: "md:max-w-3xl",
} as const;

const FooterTargetContext = createContext<HTMLElement | null>(null);

/** Renders its children into the nearest ResponsiveSheet's sticky footer. */
export function SheetFooter({ children }: { children: ReactNode }) {
  const target = useContext(FooterTargetContext);
  return target ? createPortal(children, target) : null;
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-5"
      aria-hidden="true"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function ResponsiveSheet({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  subheader,
  size = "lg",
  closeLabel = "Close",
}: ResponsiveSheetProps) {
  const [footerEl, setFooterEl] = useState<HTMLElement | null>(null);

  return (
    <Modal.Root isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop variant="opaque" className="animate-fade-in">
        <Modal.Container
          placement="bottom"
          className={`w-full p-0 sm:w-full sm:p-0 md:p-6 data-[entering=true]:animate-none`}
        >
          <Modal.Dialog
            className={`mt-auto flex max-w-none ${DESKTOP_WIDTH[size]} max-h-[92dvh] w-full animate-sheet-up flex-col overflow-hidden rounded-b-none rounded-t-3xl bg-overlay p-0 text-foreground shadow-overlay md:my-auto md:max-h-[85dvh] md:rounded-3xl`}
          >
            <div
              className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-border md:hidden"
              aria-hidden="true"
            />
            <header className="flex shrink-0 items-start justify-between gap-3 px-4 pb-2 pt-3 md:px-6 md:pb-3 md:pt-5">
              <div className="min-w-0">
                <Modal.Heading className="text-balance text-lg font-semibold">
                  {title}
                </Modal.Heading>
                {description && (
                  <p className="mt-0.5 text-[13px] text-muted">{description}</p>
                )}
              </div>
              <Modal.CloseTrigger
                aria-label={closeLabel}
                className="relative end-auto top-auto -me-2 -mt-1 flex size-11 shrink-0 items-center justify-center rounded-full bg-transparent text-muted transition-colors hover:bg-surface hover:text-foreground active:scale-[0.97]"
              >
                <CloseIcon />
              </Modal.CloseTrigger>
            </header>
            {subheader && (
              <div className="shrink-0 border-b border-separator px-4 pb-3 md:px-6">
                {subheader}
              </div>
            )}
            <FooterTargetContext.Provider value={footerEl}>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 md:px-6 md:py-5">
                {children}
              </div>
              <footer
                ref={setFooterEl}
                className="shrink-0 border-t border-separator bg-overlay px-4 pb-[max(var(--safe-bottom),0.75rem)] pt-2.5 empty:hidden md:px-6 md:pb-4"
              >
                {footer}
              </footer>
            </FooterTargetContext.Provider>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal.Root>
  );
}
