"use client";

import { Button, Chip, Input, Label } from "@heroui/react";
import { useState } from "react";
import { chatCopy } from "@/features/chat/chat-copy";
import type { ChatLanguage } from "@/features/chat/respond-to-message";

interface SettingsGitHubSectionProps {
  language: ChatLanguage;
  token: string;
  onTokenChange: (val: string) => void;
}

export function SettingsGitHubSection({
  language,
  token,
  onTokenChange,
}: SettingsGitHubSectionProps) {
  const content = chatCopy[language];
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message?: string;
  } | null>(null);

  async function handleTest() {
    setIsTesting(true);
    setTestResult(null);
    try {
      const response = await fetch("/api/github/test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: token.trim() || undefined }),
      });
      const data = (await response.json().catch(() => null)) as {
        ok?: boolean;
        authenticated?: boolean;
        user?: string;
        rateLimit?: { remaining: number; limit: number };
        error?: string;
      } | null;

      if (response.ok && data?.ok) {
        const detail = data.authenticated
          ? `${content.gitHubSuccess} (@${data.user ?? ""}, ${data.rateLimit?.remaining ?? 5000}/${data.rateLimit?.limit ?? 5000} req/h)`
          : `API Pública (${data.rateLimit?.remaining ?? 60}/${data.rateLimit?.limit ?? 60} req/h)`;
        setTestResult({ ok: true, message: detail });
      } else {
        const errorKey = data?.error;
        const msg =
          errorKey === "unauthorized"
            ? content.githubUnauthorized
            : errorKey === "rate_limited"
              ? content.githubRateLimited
              : content.githubNetworkError;
        setTestResult({ ok: false, message: msg });
      }
    } catch {
      setTestResult({ ok: false, message: content.githubNetworkError });
    } finally {
      setIsTesting(false);
    }
  }

  return (
    <div className="border-t border-separator pt-4">
      <div className="mb-2 flex items-center justify-between">
        <Label className="block text-xs font-semibold uppercase tracking-wider text-muted">
          {content.connections} · GitHub
        </Label>
      </div>

      <div className="flex flex-col gap-2">
        <div>
          <Label className="mb-1 block text-xs font-medium">
            {content.githubTokenLabel}
          </Label>
          <Input
            fullWidth
            type="password"
            value={token}
            onChange={(e) => {
              onTokenChange(e.target.value);
              setTestResult(null);
            }}
            placeholder="ghp_... (ou github_pat_...)"
          />
          <p className="mt-1 text-xs text-muted">{content.githubTokenHint}</p>
        </div>

        <div className="pt-1">
          <Button
            size="sm"
            variant="secondary"
            className="w-full"
            isDisabled={isTesting}
            onPress={() => void handleTest()}
          >
            {isTesting ? content.testingGitHub : content.testGitHubToken}
          </Button>

          {testResult && (
            <div className="mt-2 flex justify-center">
              <Chip
                size="sm"
                variant="soft"
                color={testResult.ok ? "success" : "danger"}
                className="max-w-full truncate"
              >
                {testResult.message}
              </Chip>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
