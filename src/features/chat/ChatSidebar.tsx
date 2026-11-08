"use client";

import { Button } from "@heroui/react";
import { BotAvatar } from "@/features/bots/BotAvatar.tsx";
import type { BotProfile } from "@/features/bots/bot-types.ts";
import type { ChatLanguage } from "./respond-to-message.ts";

export interface ChatSidebarProps {
  language: ChatLanguage;
  bots: BotProfile[];
  activeBotId: string;
  isMobileOpen: boolean;
  isDesktopCollapsed: boolean;
  onToggleDesktopCollapse: () => void;
  onCloseMobile: () => void;
  onSelectBot: (botId: string) => void;
  onCreateBot: () => void;
  onEditBot: (bot: BotProfile) => void;
  onOpenSettings: () => void;
  hasPassword?: boolean;
  onLock?: () => void;
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className ?? "size-4"}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function EditIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className ?? "size-3.5"}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function SidebarContent({
  language,
  bots,
  activeBotId,
  isCollapsed,
  onSelectBot,
  onCreateBot,
  onEditBot,
  onOpenSettings,
  hasPassword,
  onLock,
}: {
  language: ChatLanguage;
  bots: BotProfile[];
  activeBotId: string;
  isCollapsed: boolean;
  onSelectBot: (id: string) => void;
  onCreateBot: () => void;
  onEditBot: (bot: BotProfile) => void;
  onOpenSettings: () => void;
  hasPassword?: boolean;
  onLock?: () => void;
}) {
  const isPt = language === "pt";

  return (
    <div className="flex h-full flex-col justify-between p-3">
      <div className="flex flex-col gap-5 overflow-y-auto">
        {/* Bots List */}
        <div>
          <div className="flex items-center justify-between px-2 pb-2">
            {!isCollapsed && (
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                {isPt ? "Seus Bots" : "Your Bots"}
              </span>
            )}
            <button
              type="button"
              aria-label={isPt ? "Criar novo bot" : "Create new bot"}
              onClick={onCreateBot}
              className="flex size-6 items-center justify-center rounded-lg border border-white/10 bg-zinc-900 text-zinc-300 hover:border-white/25 hover:text-white transition-all active:scale-95"
            >
              <PlusIcon className="size-3.5" />
            </button>
          </div>

          <div className="flex flex-col gap-1">
            {bots.map((b) => {
              const isActive = b.id === activeBotId;
              const displayTitle =
                b.id === "chief-of-staff" || b.id === "default"
                  ? isPt
                    ? "Manager & Orquestrador"
                    : "Manager & Orchestrator"
                  : b.title;

              return (
                <div
                  key={b.id}
                  className={`group relative flex items-center gap-3 rounded-2xl p-2 transition-all cursor-pointer ${
                    isActive
                      ? "bg-zinc-800/90 border border-white/15 text-white shadow-sm"
                      : "border border-transparent text-zinc-400 hover:bg-zinc-900/70 hover:text-zinc-200"
                  }`}
                  onClick={() => onSelectBot(b.id)}
                >
                  <BotAvatar
                    shape={b.avatarShape}
                    color={b.avatarColor}
                    size={28}
                  />
                  {!isCollapsed && (
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold leading-tight">
                        {b.name}
                      </p>
                      {displayTitle && (
                        <p className="truncate text-[11px] text-zinc-400 leading-tight mt-0.5">
                          {displayTitle}
                        </p>
                      )}
                    </div>
                  )}

                  {!isCollapsed && (
                    <button
                      type="button"
                      aria-label={`Editar ${b.name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditBot(b);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-zinc-700 text-zinc-400 hover:text-white transition-opacity"
                    >
                      <EditIcon />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer / Settings */}
      <div className="border-t border-white/10 pt-3 flex flex-col gap-1.5">
        {hasPassword && onLock && (
          <Button
            size="sm"
            variant="secondary"
            onPress={onLock}
            className={`w-full justify-start gap-2 border border-white/10 bg-zinc-900/60 text-zinc-400 hover:bg-zinc-800 hover:text-white ${
              isCollapsed ? "justify-center px-0" : ""
            }`}
          >
            <span className="text-xs">🔒</span>
            {!isCollapsed && (
              <span className="text-xs">{isPt ? "Bloquear" : "Lock"}</span>
            )}
          </Button>
        )}
        <Button
          size="sm"
          variant="secondary"
          onPress={onOpenSettings}
          className={`w-full justify-start gap-2 border border-white/10 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white ${
            isCollapsed ? "justify-center px-0" : ""
          }`}
        >
          <span className="text-xs">⚙️</span>
          {!isCollapsed && (
            <span className="text-xs">
              {isPt ? "Configurações" : "Settings"}
            </span>
          )}
        </Button>
      </div>
    </div>
  );
}

export function ChatSidebar(props: ChatSidebarProps) {
  const {
    isMobileOpen,
    isDesktopCollapsed,
    onCloseMobile,
    onToggleDesktopCollapse,
  } = props;

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex flex-col shrink-0 border-r border-white/8 bg-zinc-950 transition-all duration-200 ${
          isDesktopCollapsed ? "w-16" : "w-64"
        }`}
      >
        <div className="flex h-14 items-center justify-between border-b border-white/5 px-3">
          {!isDesktopCollapsed && (
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-xl bg-zinc-900 border border-white/10 font-mono text-xs font-bold text-white">
                &gt;_
              </span>
              <span className="font-bold tracking-tight text-white text-sm">
                OpenBot
              </span>
            </div>
          )}
          <button
            type="button"
            aria-label="Toggle Sidebar"
            onClick={onToggleDesktopCollapse}
            className="flex size-8 items-center justify-center rounded-xl border border-white/5 bg-zinc-900/60 text-zinc-400 hover:text-white transition-all mx-auto"
          >
            {isDesktopCollapsed ? "→" : "←"}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <SidebarContent {...props} isCollapsed={isDesktopCollapsed} />
        </div>
      </aside>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden animate-in fade-in duration-200">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onCloseMobile}
          />
          <div className="absolute inset-y-0 left-0 w-72 bg-zinc-950 border-r border-white/10 shadow-2xl flex flex-col">
            <div className="flex h-14 items-center justify-between border-b border-white/10 px-4">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-xl bg-zinc-900 border border-white/10 font-mono text-xs font-bold text-white">
                  &gt;_
                </span>
                <span className="font-bold tracking-tight text-white text-sm">
                  OpenBot
                </span>
              </div>
              <button
                type="button"
                onClick={onCloseMobile}
                className="text-zinc-400 hover:text-white p-1.5"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <SidebarContent
                {...props}
                isCollapsed={false}
                onSelectBot={(id) => {
                  props.onSelectBot(id);
                  onCloseMobile();
                }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
