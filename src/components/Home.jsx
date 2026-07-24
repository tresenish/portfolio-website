import React from "react";
import { Link } from "react-router-dom";
// import ThreeDModelViewer from "./ThreeDModelViewer"; // cat model, parked for now
import HoloModelViewer from "./HoloModelViewer";
import ContributionGraph from "./ContributionGraph";

const CAREER_START = new Date(2022, 7);
const yearsOfExperience = Math.floor((Date.now() - CAREER_START.getTime()) / (365.25 * 24 * 3600 * 1000));

const STATS = [
  { value: `${yearsOfExperience}+`, label: "yrs experience" },
  { value: "5+", label: "projects delivered" },
  { value: "10+", label: "technologies" },
];

/* Default view of the content pane: the model, framed by a headline + CTAs and GitHub activity. */
export default function Home() {
  return (
    <div className="relative h-[calc(100vh-3.5rem)] max-nav:h-[70vh] animate-rise motion-reduce:animate-none">
      <div className="absolute inset-0">
        <HoloModelViewer />
      </div>

      <div className="absolute inset-0 z-10 flex flex-col justify-between p-10 max-nav:p-6 text-ink">
        {/* top-left: headline + CTAs */}
        <div>
          <p className="mb-4 font-plex text-[0.7rem] tracking-[0.32em] uppercase text-accent">
            Volodymyr Korol · Frontend Team Lead
          </p>
          <h1 className="max-w-[30rem] text-[clamp(1.8rem,3.2vw,2.8rem)] font-semibold leading-[1.12] tracking-[-0.02em] text-muted">
            I build <span className="text-ink">high-performance</span> web apps,{" "}
            <span className="text-ink">dashboards</span> &{" "}
            <span className="whitespace-nowrap bg-gradient-to-r from-accent to-emerald-300 bg-clip-text text-transparent">
              AI-powered tools
            </span>.
          </h1>
          <div className="mt-6 flex gap-3">
            <Link
              to="/resume"
              className="rounded-full bg-accent px-5 py-2 text-[0.85rem] font-medium text-page transition-opacity hover:opacity-85"
            >
              View resume
            </Link>
            <Link
              to="/contact"
              className="rounded-full border border-hairline px-5 py-2 text-[0.85rem] font-medium text-ink-dim transition-colors hover:border-accent-dim hover:text-ink"
            >
              Get in touch
            </Link>
          </div>
        </div>

        {/* bottom: stats (left) + GitHub activity (right) */}
        <div className="flex items-end justify-between gap-6 flex-wrap -mb-14 max-nav:-mb-8">
          <div className="flex gap-10 max-nav:gap-6 mb-1">
            {STATS.map((s) => (
              <div key={s.label}>
                <p className="text-[1.5rem] font-semibold leading-none">{s.value}</p>
                <p className="mt-1.5 font-plex text-[0.68rem] tracking-[0.12em] uppercase text-muted">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="w-fit max-w-full text-right">
            <p className="mb-3 font-plex text-[0.68rem] tracking-[0.22em] uppercase text-muted">GitHub activity</p>
            <ContributionGraph username="tresenish" />
          </div>
        </div>
      </div>
    </div>
  );
}
