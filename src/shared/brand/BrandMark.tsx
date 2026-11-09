import { createElement } from "react";
import { brandMarkLayers } from "./brand-mark-layers.ts";

/* The Open Bot mark: a crew head sketched in graphite, lines only, drawn in
   the text colour on a clear ground. At this size the construction lines stay
   out, the outline is pressed harder and the viewBox hugs the head. */
const LAYERS = brandMarkLayers({ tile: "none", guides: false, weight: 2.4 });

export function BrandMark({ className = "size-7" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="11 11 42 42"
      className={`shrink-0 text-foreground ${className}`}
    >
      {LAYERS.map((node, index) =>
        createElement(node.tag, { key: index, ...node.attrs }),
      )}
    </svg>
  );
}
