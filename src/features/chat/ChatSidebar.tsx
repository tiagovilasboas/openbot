"use client";

import { Drawer } from "@heroui/react";
import { useEffect } from "react";
import { chatCopy } from "./chat-copy.ts";
import { SidebarPanel, type SidebarNavProps } from "./SidebarPanel.tsx";
import { RailButton, SidebarRail } from "./SidebarRail.tsx";
import { BrandMark } from "@/shared/brand/BrandMark.tsx";
import { CloseIcon, SidebarToggleIcon } from "./ShellIcons.tsx";

export interface ChatSidebarProps extends SidebarNavProps {
  isMobileOpen: boolean;
  isDesktopCollapsed: boolean;
  onToggleDesktopCollapse: () => void;
  onCloseMobile: () => void;
}

const ICON_BUTTON =
  "flex size-11 shrink-0 items-center justify-center rounded-full text-muted transition-[background-color,color,transform] duration-150 ease-out-expo hover:bg-surface hover:text-foreground active:scale-[0.97]";

// Tailwind's md breakpoint: the drawer has no place on a desktop layout.
const DESKTOP_QUERY = "(min-width: 48rem)";

// From package.json, inlined by next.config.ts at build time.
const APP_VERSION = process.env.APP_VERSION;

function SidebarBrand({ name }: { name: string }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5 px-1">
      <BrandMark />
      <span className="truncate text-[15px] font-semibold tracking-tight text-foreground">
        {name}
      </span>
      {APP_VERSION && (
        <span className="shrink-0 font-mono text-[11px] text-subtle tabular-nums">
          v{APP_VERSION}
        </span>
      )}
    </span>
  );
}

/** Closes the phone drawer if the viewport grows into the desktop layout. */
function useCloseOnDesktop(isOpen: boolean, onClose: () => void) {
  useEffect(() => {
    if (!isOpen) return;
    const query = window.matchMedia(DESKTOP_QUERY);
    const closeIfDesktop = () => {
      if (query.matches) onClose();
    };
    closeIfDesktop();
    query.addEventListener("change", closeIfDesktop);
    return () => query.removeEventListener("change", closeIfDesktop);
  }, [isOpen, onClose]);
}

export function ChatSidebar(props: ChatSidebarProps) {
  const {
    language,
    isMobileOpen,
    isDesktopCollapsed,
    onCloseMobile,
    onToggleDesktopCollapse,
    onSelectBot,
    onCreateBot,
    onEditBot,
    onOpenSettings,
    onLock,
    onNewChat,
  } = props;
  const content = chatCopy[language];
  useCloseOnDesktop(isMobileOpen, onCloseMobile);

  // On a phone every navigation leaves the drawer, so the result is visible.
  const thenClose =
    <Args extends unknown[]>(action: (...args: Args) => void) =>
    (...args: Args) => {
      onCloseMobile();
      action(...args);
    };

  return (
    <>
      <aside
        className={`hidden shrink-0 flex-col border-r border-separator bg-sidebar pt-safe pb-safe pl-safe md:flex ${
          isDesktopCollapsed
            ? "w-[calc(4rem+var(--safe-left))]"
            : "w-[calc(17rem+var(--safe-left))]"
        }`}
      >
        {isDesktopCollapsed ? (
          <>
            <div className="flex h-14 shrink-0 items-center justify-center">
              <RailButton
                label={content.sidebarExpand}
                onPress={onToggleDesktopCollapse}
                expanded={false}
              >
                <SidebarToggleIcon />
              </RailButton>
            </div>
            <SidebarRail {...props} />
          </>
        ) : (
          <>
            <div className="flex h-14 shrink-0 items-center justify-between gap-2 pr-2 pl-3">
              <SidebarBrand name={content.brandName} />
              <button
                type="button"
                aria-label={content.sidebarCollapse}
                aria-expanded
                title={content.sidebarCollapse}
                onClick={onToggleDesktopCollapse}
                className={ICON_BUTTON}
              >
                <SidebarToggleIcon />
              </button>
            </div>
            <SidebarPanel {...props} />
          </>
        )}
      </aside>

      <Drawer.Backdrop
        isOpen={isMobileOpen}
        onOpenChange={(open) => {
          if (!open) onCloseMobile();
        }}
        variant="opaque"
        className="md:hidden"
      >
        <Drawer.Content
          placement="left"
          className="[--drawer-enter-duration:var(--duration-sheet)] [--drawer-enter-ease:var(--ease-out-expo)] md:hidden"
        >
          <Drawer.Dialog
            aria-label={content.mainNavLabel}
            className="w-[min(86vw,320px)] max-w-none border-r border-separator bg-sidebar p-0 pt-safe pb-safe pl-safe"
          >
            <div className="flex h-14 shrink-0 items-center justify-between gap-2 pr-2 pl-3">
              <SidebarBrand name={content.brandName} />
              <button
                type="button"
                aria-label={content.sidebarClose}
                onClick={onCloseMobile}
                className={ICON_BUTTON}
              >
                <CloseIcon />
              </button>
            </div>
            <SidebarPanel
              {...props}
              showLanguage
              onSelectBot={thenClose(onSelectBot)}
              onCreateBot={thenClose(onCreateBot)}
              onEditBot={thenClose(onEditBot)}
              onOpenSettings={thenClose(onOpenSettings)}
              onLock={onLock && thenClose(onLock)}
              onNewChat={onNewChat && thenClose(onNewChat)}
            />
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </>
  );
}
