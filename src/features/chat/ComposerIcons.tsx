import type { ReactNode } from "react";

type IconProps = { className?: string };

function Icon({
  children,
  className = "size-5",
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="0 0 24 24"
    >
      {children}
    </svg>
  );
}

export const ArrowUpIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 19V5M5.5 11.5 12 5l6.5 6.5" />
  </Icon>
);

/** Send while a reply is running: the message joins the queue. */
export const QueueIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 6h12M4 12h8M4 18h8M18 13v7M14.5 16.5h7" />
  </Icon>
);

export const SlashCommandIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
    <path d="m9.5 15 5-6" />
  </Icon>
);

export const MentionIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="3.75" />
    <path d="M15.75 8.25v4.5a2.75 2.75 0 0 0 5.5 0V12a9.25 9.25 0 1 0-3.6 7.33" />
  </Icon>
);

export const SunIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="3.75" />
    <path d="M12 2.75v1.5M12 19.75v1.5M2.75 12h1.5M19.75 12h1.5M5.46 5.46l1.06 1.06M17.48 17.48l1.06 1.06M5.46 18.54l1.06-1.06M17.48 6.52l1.06-1.06" />
  </Icon>
);

export const IssueIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="8.75" />
    <circle cx="12" cy="12" r="1.5" />
  </Icon>
);

export const PullRequestIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="6" cy="6" r="2.5" />
    <circle cx="6" cy="18" r="2.5" />
    <circle cx="18" cy="18" r="2.5" />
    <path d="M6 8.5v7M13 6h3a2 2 0 0 1 2 2v7.5M15 3.5 12.5 6 15 8.5" />
  </Icon>
);

export const HelpIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="8.75" />
    <path d="M9.6 9.4a2.5 2.5 0 0 1 4.85.85c0 1.65-2.45 2.25-2.45 3.5M12 16.75h.01" />
  </Icon>
);

export const PlugIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9 3v4.5M15 3v4.5M6.5 7.5h11V11a5.5 5.5 0 0 1-11 0V7.5ZM12 16.5V21" />
  </Icon>
);

export const TerminalIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m5 7.5 4.5 4.5L5 16.5M12 17h7" />
  </Icon>
);
