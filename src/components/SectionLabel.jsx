import React from "react";

/* Mono uppercase section heading with a hairline rule, shared by content pages. */
export default function SectionLabel({ title }) {
  return (
    <div className="flex items-center gap-4 mb-7">
      <h2 className="font-plex text-[0.72rem] tracking-[0.22em] uppercase text-muted whitespace-nowrap">{title}</h2>
      <span className="flex-1 h-px bg-hairline" aria-hidden="true"></span>
    </div>
  );
}
