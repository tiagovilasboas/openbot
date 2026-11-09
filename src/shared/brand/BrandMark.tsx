import { createElement } from "react";
import { brandMarkLayers } from "./brand-mark-layers.ts";

/* The Open Bot mark: a crew head in graphite pencil, with no colour. At this
   size the construction lines stay out and the outline is drawn heavier. */
const LAYERS = brandMarkLayers({
  tile: "rounded",
  guides: false,
  weight: 2,
  tileClassName: "fill-surface",
});

export function BrandMark({ className = "size-7" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 64 64"
      className={`shrink-0 ${className}`}
    >
      {LAYERS.map((node, index) =>
        createElement(node.tag, { key: index, ...node.attrs }),
      )}
    </svg>
  );
}
