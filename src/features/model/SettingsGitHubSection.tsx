"use client";

import { useState } from "react";
import { chatCopy } from "@/features/chat/chat-copy";
import type { ChatLanguage } from "@/features/chat/respond-to-message";
import { FormField } from "@/shared/ui/FormField.tsx";
import { SecretInput } from "@/shared/ui/SecretInput.tsx";
import { ConnectionTest } from "./ConnectionTest.tsx";
import { fillCopy, getSettingsCopy } from "./settings-copy.ts";

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
  const s = getSettingsCopy(language);
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
          : fillCopy(s.githubPublicApi, {
              remaining: data.rateLimit?.remaining ?? 60,
              limit: data.rateLimit?.limit ?? 60,
            });
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

  const hasToken = token.trim().length > 0;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[15px] font-semibold text-foreground">
          {s.sectionGitHub}
        </h3>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            hasToken ? "bg-success-soft text-success" : "bg-surface text-subtle"
          }`}
        >
          {hasToken ? s.githubTokenSet : s.githubTokenUnset}
        </span>
      </div>

      <FormField
        label={content.githubTokenLabel}
        helper={content.githubTokenHint}
      >
        {(control) => (
          <SecretInput
            {...control}
            value={token}
            onChange={(value) => {
              onTokenChange(value);
              setTestResult(null);
            }}
            placeholder={s.githubTokenPlaceholder}
            showLabel={s.showSecret}
            hideLabel={s.hideSecret}
          />
        )}
      </FormField>

      <ConnectionTest
        label={content.testGitHubToken}
        loadingLabel={content.testingGitHub}
        isTesting={isTesting}
        result={
          testResult
            ? { ok: testResult.ok, message: testResult.message ?? "" }
            : null
        }
        onTest={() => void handleTest()}
      />
    </section>
  );
}
