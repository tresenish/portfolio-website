import React from "react";
import { Link, useOutletContext } from "react-router-dom";
// import ThreeDModelViewer from "./ThreeDModelViewer"; // cat model, parked for now
// import HoloModelViewer from "./HoloModelViewer"; // shapeshifter model, parked for now
import CuboidScene from "./CuboidScene";
import ContributionGraph from "./ContributionGraph";

// Inclusive month count from Aug 2022, matching the Resume page (LinkedIn-style).
const CAREER_START = { year: 2022, month: 8 };
const now = new Date();
const careerMonths = (now.getFullYear() - CAREER_START.year) * 12 + (now.getMonth() + 1 - CAREER_START.month) + 1;
const yearsOfExperience = Math.floor(careerMonths / 12);

const STATS = [
  { value: `${yearsOfExperience}+`, label: "yrs experience" },
  { value: "5+", label: "projects delivered" },
  { value: "10+", label: "technologies" },
];

/* Liquid-glass panel: translucent white, heavy blur + saturation boost, a
   bright top edge highlight and soft drop shadow so it reads as floating
   glass over the ribbon. */
const GLASS =
  "rounded-2xl border border-white/35 bg-white/10 backdrop-blur-lg backdrop-saturate-150 " +
  "shadow-[0_8px_32px_rgba(28,30,33,0.08),inset_0_1px_0_rgba(255,255,255,0.45)]";

/* Default view of the content pane: the model, framed by a headline + CTAs and GitHub activity. */
export default function Home() {
  const { debug } = useOutletContext() ?? {};
  return (
    <div className="relative h-[calc(100vh-7rem)] max-nav:h-[70vh] animate-rise motion-reduce:animate-none">
      <div className="absolute inset-0">
        <CuboidScene debug={debug} />
      </div>

      {/* bottom anchor: page fades into a neutral dark shade below the ribbon */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent from-60% to-black/20" />

      {/* pointer-events-none so the canvas stays interactive; re-enabled on content */}
      <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-10 max-nav:p-6 text-ink">
        {/* top-left: status + headline + CTAs — no panel, the text floats
            directly over the scene so the ribbon stays visible; only the
            small pills are glass */}
        <div className="pointer-events-auto w-fit">
          <span className="inline-flex items-center gap-2.5 rounded-full border border-white/50 bg-white/25 backdrop-blur-md px-3.5 py-1.5 font-plex text-[0.64rem] tracking-[0.16em] uppercase text-ink-dim">
            <span className="relative flex w-1.5 h-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-ink opacity-40 animate-ping motion-reduce:animate-none"></span>
              <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-ink"></span>
            </span>
            Open to opportunities
          </span>
          <p className="mt-7 mb-4 font-plex text-[0.7rem] tracking-[0.32em] uppercase text-muted">
            Volodymyr Korol — Frontend Team Lead
          </p>
          <h1 className="max-w-[34rem] text-[clamp(2.2rem,4.2vw,3.6rem)] font-semibold leading-[1.08] tracking-[-0.03em] text-black">
            I build high-performance web apps, dashboards &amp; AI-powered tools.
          </h1>
          <div className="mt-9 flex items-center gap-4 flex-wrap">
            <Link
              to="/projects"
              className="group inline-flex items-center gap-2 rounded-full bg-ink px-6 py-2.5 text-[0.9rem] font-medium text-page transition-colors hover:bg-ink-dim"
            >
              View projects
              <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">→</span>
            </Link>
            <Link
              to="/resume"
              className="rounded-full border border-white/50 bg-white/25 backdrop-blur-md px-6 py-2.5 text-[0.9rem] font-medium text-ink-dim transition-colors hover:border-accent-dim hover:text-ink"
            >
              Resume
            </Link>
            <Link
              to="/contact"
              className="text-[0.9rem] font-medium text-muted underline decoration-hairline underline-offset-[6px] transition-colors hover:text-ink hover:decoration-ink"
            >
              Get in touch
            </Link>
          </div>
        </div>

        {/* bottom: stats (left) + GitHub activity (right) */}
        <div className="pointer-events-auto flex items-end justify-between gap-6 flex-wrap">
          <div className={`${GLASS} flex divide-x divide-hairline px-8 py-5 max-nav:px-5 max-nav:py-4`}>
            {STATS.map((s) => (
              <div key={s.label} className="px-9 first:pl-0 max-nav:px-5 max-nav:first:pl-0">
                <p className="text-[1.9rem] font-semibold leading-none tracking-[-0.02em] tabular-nums">{s.value}</p>
                <p className="mt-2 font-plex text-[0.66rem] tracking-[0.14em] uppercase text-muted">{s.label}</p>
              </div>
            ))}
          </div>
          <div className={`${GLASS} w-fit max-w-full text-right px-6 py-5`}>
            <p className="mb-3 font-plex text-[0.66rem] tracking-[0.22em] uppercase text-muted">GitHub activity</p>
            <ContributionGraph username="tresenish" />
          </div>
        </div>
      </div>
    </div>
  );
}
