import React from "react";
import { Link, useOutletContext } from "react-router-dom";
// import ThreeDModelViewer from "./ThreeDModelViewer"; // cat model, parked for now
// import HoloModelViewer from "./HoloModelViewer"; // shapeshifter model, parked for now
import CuboidScene from "./CuboidScene";
import ContributionGraph from "./ContributionGraph";
import SectionLabel from "./SectionLabel";
import StackScene from "./StackScene";
import { projects } from "./Projects";

// Below-the-fold content: what I work on day to day, in stack order.
const PILLARS = [
  {
    title: "Frontend architecture",
    text: "Component systems, dashboards, and interfaces in React + TypeScript that stay fast and maintainable as products grow.",
    tech: ["React", "TypeScript", "Tailwind CSS"],
  },
  {
    title: "Backend & APIs",
    text: "REST APIs, data models, and integrations in Python and Django on PostgreSQL — the plumbing that keeps products reliable.",
    tech: ["Python", "Django", "PostgreSQL"],
  },
  {
    title: "AI integration",
    text: "LLM-powered features with the Claude API: automated workflows, smart tooling, and product features that actually ship.",
    tech: ["Claude API", "LLM workflows"],
  },
];

const techPillClass =
  "font-plex text-[0.68rem] text-ink-dim border border-hairline rounded-full px-2.5 py-0.5 whitespace-nowrap";

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

/* Liquid-glass card — the same recipe as the navbar island (page-tinted
   translucency, heavy blur + saturation, hairline edge, top highlight,
   soft lift shadow), shared by every card on the home page. The shadow and
   highlight are theme-tuned: soft grey lift on light, deep lift on dark. */
const glassFor = (theme) =>
  "rounded-2xl border border-hairline bg-page/60 backdrop-blur-xl backdrop-saturate-150 " +
  (theme === "light"
    ? "shadow-[0_8px_32px_rgba(28,30,33,0.10),inset_0_1px_0_rgba(255,255,255,0.9)]"
    : "shadow-[0_8px_32px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.08)]");

/* Default view of the content pane: the model, framed by a headline + CTAs and GitHub activity. */
export default function Home() {
  const { debug, theme } = useOutletContext() ?? {};
  const GLASS = glassFor(theme);
  return (
    <>
    <div className="relative h-[calc(100vh-7rem)] max-nav:h-[70vh] animate-rise motion-reduce:animate-none">
      <div className="absolute inset-0">
        <CuboidScene debug={debug} theme={theme} />
      </div>

      {/* bottom anchor: page fades toward pure black below the ribbon;
          ends at exactly the shade the below-fold band starts on, so the
          fold line is invisible. Lighter shading on the light theme. */}
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent from-60% ${
          theme === "light" ? "to-black/25" : "to-black/65"
        }`}
      />

      {/* pointer-events-none so the canvas stays interactive; re-enabled on content */}
      <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-10 max-nav:p-6 text-ink">
        {/* top-left: status + headline + CTAs — no panel, the text floats
            directly over the scene so the ribbon stays visible; only the
            small pills are glass. pointer-events stay off for the text so
            tile hover works right through it — only the links re-enable. */}
        <div className="pointer-events-none w-fit -mt-4 max-nav:mt-0">
          <span className="inline-flex items-center gap-2.5 rounded-full border border-hairline bg-page/50 backdrop-blur-md px-3.5 py-1.5 font-plex text-[0.64rem] tracking-[0.16em] uppercase text-ink-dim">
            <span className="relative flex w-1.5 h-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-ink opacity-40 animate-ping motion-reduce:animate-none"></span>
              <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-ink"></span>
            </span>
            Open to opportunities
          </span>
          <p className="mt-7 mb-4 font-plex text-[0.85rem] tracking-[0.32em] uppercase text-muted">
            Volodymyr Korol — Full-stack Developer &amp; Frontend Team Lead
          </p>
          <h1 className="max-w-[34rem] text-[clamp(2.2rem,4.2vw,3.6rem)] font-semibold leading-[1.08] tracking-[-0.03em] text-ink">
            I build web products end to end.
          </h1>
          <p className="mt-4 max-w-[28rem] text-[0.98rem] leading-relaxed text-muted">
            TypeScript and React up front, Python and PostgreSQL behind,
            AI woven through.
          </p>
          <div className="mt-9 flex items-center gap-4 flex-wrap">
            <Link
              to="/projects"
              className={`pointer-events-auto group inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-[0.9rem] font-medium transition-colors ${
                theme === "light"
                  ? "bg-white text-ink border border-hairline hover:bg-card"
                  : "bg-ink text-page hover:bg-ink-dim"
              }`}
            >
              View projects
              <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">→</span>
            </Link>
            <Link
              to="/resume"
              className="pointer-events-auto rounded-full border border-hairline bg-page/50 backdrop-blur-md px-6 py-2.5 text-[0.9rem] font-medium text-ink-dim transition-colors hover:border-accent-dim hover:text-ink"
            >
              Resume
            </Link>
            <Link
              to="/contact"
              className="pointer-events-auto rounded-full border border-hairline bg-page/50 backdrop-blur-md px-6 py-2.5 text-[0.9rem] font-medium text-ink-dim transition-colors hover:border-accent-dim hover:text-ink"
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

    {/* below the fold — picks up the hero's dark base (black/50) at the top
        and fades back to the page color on the way down, so the fold line
        is seamless */}
    <div className="relative">
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 h-[65vh] bg-gradient-to-b from-10% to-transparent ${
          theme === "light" ? "from-black/25" : "from-black/65"
        }`}
        aria-hidden="true"
      />
      <div className="relative max-w-[64rem] mx-auto px-[8%] pt-20 pb-24 text-ink max-nav:px-[6%] max-nav:pt-14 max-nav:pb-16">
      {/* what I do */}
      <section className="mb-20 max-nav:mb-14">
        <SectionLabel title="What I do" />
        <div className="grid grid-cols-3 gap-5 max-[900px]:grid-cols-1">
          {PILLARS.map((p) => (
            <div
              key={p.title}
              className={`flex flex-col gap-3 ${GLASS} p-6 transition-colors hover:border-accent-dim`}
            >
              <h3 className="text-[1.02rem] font-medium">{p.title}</h3>
              <p className="text-[0.88rem] leading-relaxed text-muted">{p.text}</p>
              <div className="mt-auto flex flex-wrap gap-1.5 pt-2">
                {p.tech.map((t) => (
                  <span key={t} className={techPillClass}>{t}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* the full stack, animated: browser → server → database pipeline.
          Full-bleed like the hero — the scene is the section's background,
          with the label and caption overlaid. */}
      <section className="relative left-1/2 -mx-[50vw] w-screen mb-20 max-nav:mb-14">
        <div className="relative h-[36rem] max-nav:h-[24rem]">
          <div className="absolute inset-0">
            <StackScene theme={theme} />
          </div>
          <div className="pointer-events-none absolute inset-x-0 top-0 px-[8%] pt-2 max-nav:px-[6%]">
            <SectionLabel title="How a request travels" />
          </div>
          <p className="pointer-events-none absolute bottom-4 left-[8%] font-plex text-[0.68rem] text-faint max-nav:left-[6%]">
            Every feature I ship crosses all three — interface, API, and data.
          </p>
        </div>
      </section>

      {/* selected work — top three, the rest live on /projects */}
      <section className="mb-20 max-nav:mb-14">
        <div className="flex items-baseline justify-between gap-4">
          <SectionLabel title="Selected work" />
          <Link
            to="/projects"
            className="shrink-0 -mt-1 font-plex text-[0.72rem] text-muted hover:text-accent transition-colors whitespace-nowrap"
          >
            all projects →
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-5 max-[900px]:grid-cols-1">
          {projects.slice(0, 3).map((project) => (
            <a
              key={project.title}
              href={project.link}
              target="_blank"
              rel="noopener noreferrer"
              className={`group flex flex-col overflow-hidden ${GLASS} transition-colors hover:border-accent-dim`}
            >
              <div className="overflow-hidden border-b border-hairline">
                <img
                  className="w-full aspect-[16/10] object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                  alt={`${project.title} screenshot`}
                  src={project.image}
                />
              </div>
              <div className="flex flex-col gap-1.5 p-5">
                <h3 className="text-[0.98rem] font-medium transition-colors group-hover:text-accent">{project.title}</h3>
                <p className="text-[0.84rem] leading-relaxed text-muted">{project.description}</p>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* closing CTA */}
      <section className={`${GLASS} px-10 py-12 max-nav:px-6 max-nav:py-8 flex items-center justify-between gap-8 flex-wrap`}>
        <div>
          <h2 className="text-[1.35rem] font-semibold tracking-tight">Have something to build?</h2>
          <p className="mt-2 max-w-[34rem] text-[0.92rem] leading-relaxed text-muted">
            I'm open to opportunities and collaborations — the fastest way to reach me is email,
            and I usually reply within a day.
          </p>
        </div>
        <Link
          to="/contact"
          className="rounded-full bg-ink px-6 py-2.5 text-[0.9rem] font-medium text-page transition-colors hover:bg-ink-dim whitespace-nowrap"
        >
          Get in touch →
        </Link>
      </section>
      </div>
    </div>
    </>
  );
}
