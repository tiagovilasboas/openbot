const AUTHOR = "Tiago Vilas Boas";
const PROFILE_URL = "https://github.com/tiagovilasboas";
const SPONSOR_URL = "https://github.com/sponsors/tiagovilasboas";
// The GitHub Sponsors heart pink.
const SPONSOR_PINK = "#DB61A2";

const FOCUS_RING =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bot-accent";

interface AuthorCreditProps {
  /** Tooltip for the profile link, e.g. "GitHub profile". */
  profileTitle: string;
  /** Accessible name of the heart, e.g. "Sponsor on GitHub Sponsors". */
  sponsorLabel: string;
  className?: string;
}

/** The author credit: "by" links to the GitHub profile, the heart to Sponsors. */
export function AuthorCredit({
  profileTitle,
  sponsorLabel,
  className = "",
}: AuthorCreditProps) {
  return (
    <p
      className={`flex min-h-11 items-center gap-0.5 px-3 text-xs text-subtle ${className}`}
    >
      <a
        href={PROFILE_URL}
        target="_blank"
        rel="noopener noreferrer"
        title={profileTitle}
        className={`rounded-md py-2 underline-offset-2 transition-colors hover:text-foreground hover:underline ${FOCUS_RING}`}
      >
        by {AUTHOR}
      </a>
      <a
        href={SPONSOR_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={sponsorLabel}
        title={sponsorLabel}
        className={`group flex size-9 items-center justify-center rounded-full transition-colors hover:bg-surface ${FOCUS_RING}`}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="currentColor"
          style={{ color: SPONSOR_PINK }}
          className="size-4 transition-transform duration-150 ease-out-expo group-hover:scale-115 group-active:scale-95"
        >
          <path d="M12 20.6s-7.4-4.5-9.2-9C1.6 8.3 3.5 4.6 7.1 4.6c2 0 3.6 1.1 4.9 2.9 1.3-1.8 2.9-2.9 4.9-2.9 3.6 0 5.5 3.7 4.3 7-1.8 4.5-9.2 9-9.2 9Z" />
        </svg>
      </a>
    </p>
  );
}
