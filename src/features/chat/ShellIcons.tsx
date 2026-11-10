import type { ReactNode } from "react";

/* Icons for the chat shell (header and sidebar): 24px grid, 1.75 stroke. */

interface IconProps {
  className?: string;
}

function ShellIcon({
  className = "size-5",
  children,
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
    >
      {children}
    </svg>
  );
}

export function GripIcon(props: IconProps) {
  return (
    <ShellIcon {...props}>
      <path d="M9 6.5h.01M15 6.5h.01M9 12h.01M15 12h.01M9 17.5h.01M15 17.5h.01" />
    </ShellIcon>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <ShellIcon {...props}>
      <path d="M4 7h16M4 12h16M4 17h10" />
    </ShellIcon>
  );
}

export function NewChatIcon(props: IconProps) {
  return (
    <ShellIcon {...props}>
      <path d="M11 4.5H7A2.5 2.5 0 0 0 4.5 7v10A2.5 2.5 0 0 0 7 19.5h10a2.5 2.5 0 0 0 2.5-2.5v-4" />
      <path d="M17.6 3.9a1.9 1.9 0 0 1 2.7 2.7L13 13.9l-3.5.8.8-3.5z" />
    </ShellIcon>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <ShellIcon {...props}>
      <path d="M12 5v14M5 12h14" />
    </ShellIcon>
  );
}

export function EditIcon(props: IconProps) {
  return (
    <ShellIcon {...props}>
      <path d="M4.5 19.5h3.8L18.6 9.2a2.2 2.2 0 0 0-3.1-3.1L5.2 16.4z" />
      <path d="M13.8 7.8l2.6 2.6" />
    </ShellIcon>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <ShellIcon {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </ShellIcon>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <ShellIcon {...props}>
      <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
      <circle cx="15" cy="7" r="2" />
      <circle cx="9" cy="17" r="2" />
    </ShellIcon>
  );
}

export function LockIcon(props: IconProps) {
  return (
    <ShellIcon {...props}>
      <rect x="5" y="10.5" width="14" height="9.5" rx="2.5" />
      <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
    </ShellIcon>
  );
}

export function SidebarToggleIcon(props: IconProps) {
  return (
    <ShellIcon {...props}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="3" />
      <path d="M9.5 4.5v15" />
    </ShellIcon>
  );
}
