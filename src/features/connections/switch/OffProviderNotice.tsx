import { AlertIcon } from "@/shared/ui/FieldIcons.tsx";
import type { ConnectionId } from "../core/index.ts";
import { offProviderCopy, providerName } from "./off-provider-copy.ts";

type Kind = "offFormNotice" | "pickerNotice" | "modelWarning";

interface OffProviderNoticeProps {
  language: "pt" | "en" | "es";
  provider: ConnectionId;
  kind: Kind;
  /** Shows a button that leads to the Connections tab. */
  onOpenConnections?: () => void;
}

/** Says a provider is switched off and what to do: switch it on or pick another. */
export function OffProviderNotice({
  language,
  provider,
  kind,
  onOpenConnections,
}: OffProviderNoticeProps) {
  const copy = offProviderCopy[language];
  return (
    <div
      role="status"
      data-testid="off-provider-notice"
      className="flex items-center gap-3 rounded-xl bg-warning-soft py-1.5 pe-1.5 ps-3 text-warning"
    >
      <AlertIcon className="size-4 shrink-0" />
      <p className="min-w-0 flex-1 text-[13px]">
        {copy[kind].replace("{provider}", providerName(provider))}
      </p>
      {onOpenConnections && (
        <button
          type="button"
          onClick={onOpenConnections}
          className="min-h-11 shrink-0 rounded-full bg-foreground px-4 text-[13px] font-semibold text-background active:scale-[0.97]"
        >
          {copy.openConnections}
        </button>
      )}
    </div>
  );
}
