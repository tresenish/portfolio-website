import React from "react";

export default function Footer() {
  return (
    <div className="[grid-area:footer] w-full bg-panel border-t border-hairline flex items-center justify-between px-6 py-4 text-[0.8rem] text-muted max-nav:px-[6%]">
      <p>© {new Date().getFullYear()} Volodymyr Korol</p>
      <p className="font-plex text-[0.72rem]">React · Vite · Tailwind</p>
    </div>
  );
}
