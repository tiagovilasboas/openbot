"use client";

import dynamic from "next/dynamic";
import { ChatLoading } from "@/features/chat/ChatLoading";

const ChatExperience = dynamic(
  () =>
    import("@/features/chat/ChatExperience").then(
      (module) => module.ChatExperience,
    ),
  {
    ssr: false,
    loading: () => <ChatLoading />,
  },
);

export default function HomePage() {
  return <ChatExperience />;
}
