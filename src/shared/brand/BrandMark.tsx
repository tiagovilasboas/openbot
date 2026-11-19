import { createElement } from "react";
import { brandMarkLayers } from "./brand-mark-layers.ts";

/* The Open Bot mark: the ghost sketched in graphite, drawn in the text colour on
   a clear ground. At this size the outline is pressed a little harder and the
   viewBox hugs the ghost. */
const LAYERS = brandMarkLayers({ tile: "none", weight: 1.25 });

export function BrandMark({ className = "size-7" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="5 4 54 56"
      className={`shrink-0 text-foreground ${className}`}
    >
      {LAYERS.map((node, index) =>
        createElement(node.tag, { key: index, ...node.attrs }),
      )}
    </svg>
  );
}
