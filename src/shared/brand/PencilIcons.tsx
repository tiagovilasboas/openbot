import { useId } from "react";

/*
 * Small icons sketched in pencil, like the Open Bot mark: one firm outline, a
 * lighter second pass slightly off register, and hatching for the shade.
 */

// The GitHub mark (Primer octicons, mark-github-16): a disc with the
// Octocat cut out, one path, so stroking it draws both outlines.
const GITHUB_MARK =
  "M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z";

const HEART =
  "M12 20.6s-7.4-4.5-9.2-9C1.6 8.3 3.5 4.6 7.1 4.6c2 0 3.6 1.1 4.9 2.9 1.3-1.8 2.9-2.9 4.9-2.9 3.6 0 5.5 3.7 4.3 7-1.8 4.5-9.2 9-9.2 9Z";

// The GitHub Sponsors heart pink.
const SPONSOR_PINK = "#DB61A2";

/** Parallel "/" strokes across a square, `gap` apart. */
function hatch(size: number, gap: number): string {
  const lines: string[] = [];
  for (let x = -size; x < size; x += gap) {
    lines.push(`M${x} ${size}L${x + size} 0`);
  }
  return lines.join("");
}

interface SketchProps {
  path: string;
  /** The square the path is drawn in. */
  size: number;
  ink: string;
  outline: number;
  shade: { gap: number; width: number; opacity: number };
  className: string;
}

function Sketch({ path, size, ink, outline, shade, className }: SketchProps) {
  const clipId = `pencil-${useId().replace(/:/g, "")}`;
  const pad = outline;
  return (
    <svg
      aria-hidden="true"
      viewBox={`${-pad} ${-pad} ${size + 2 * pad} ${size + 2 * pad}`}
      fill="none"
      stroke={ink}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
    >
      <clipPath id={clipId}>
        <path d={path} />
      </clipPath>
      <path
        d={hatch(size, shade.gap)}
        clipPath={`url(#${clipId})`}
        strokeWidth={shade.width}
        strokeOpacity={shade.opacity}
      />
      <path d={path} strokeWidth={outline} strokeOpacity={0.9} />
      <path
        d={path}
        strokeWidth={outline * 0.5}
        strokeOpacity={0.5}
        transform={`translate(${size * 0.04} ${size * -0.035})`}
      />
    </svg>
  );
}

/** The GitHub mark in graphite: the text colour, hatched where it is solid. */
export function PencilGitHubMark({ className = "size-4" }) {
  return (
    <Sketch
      path={GITHUB_MARK}
      size={16}
      ink="currentColor"
      outline={0.9}
      shade={{ gap: 1.8, width: 0.45, opacity: 0.45 }}
      className={className}
    />
  );
}

/** The Sponsors heart in pink pencil. */
export function PencilHeart({ className = "size-4" }) {
  return (
    <Sketch
      path={HEART}
      size={24}
      ink={SPONSOR_PINK}
      outline={1.5}
      shade={{ gap: 2.4, width: 0.8, opacity: 0.55 }}
      className={className}
    />
  );
}
