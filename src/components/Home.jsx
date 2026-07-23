import React from "react";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const CAREER_START = { year: 2022, month: 8 };

/* Months between two dates, inclusive of the current month (LinkedIn-style). */
function monthsBetween(start, end) {
  const e = end ? new Date(end.year, end.month - 1) : new Date();
  return (e.getFullYear() - start.year) * 12 + (e.getMonth() + 1 - start.month) + 1;
}

function formatDuration(start, end) {
  const total = monthsBetween(start, end);
  const yrs = Math.floor(total / 12);
  const mos = total % 12;
  const parts = [];
  if (yrs > 0) parts.push(`${yrs} ${yrs === 1 ? "yr" : "yrs"}`);
  if (mos > 0) parts.push(`${mos} ${mos === 1 ? "mo" : "mos"}`);
  return parts.length ? parts.join(" ") : "1 mo";
}

function formatRange(start, end) {
  const from = `${MONTHS[start.month - 1]} ${start.year}`;
  const to = end ? `${MONTHS[end.month - 1]} ${end.year}` : "Present";
  return `${from} – ${to}`;
}

const T = ({ children }) => <span className="text-ink">{children}</span>;

const EXPERIENCE = [
  {
    role: "Frontend Team Lead",
    company: "LTVX.ai",
    type: "Permanent Full-time",
    location: "Remote",
    start: { year: 2024, month: 5 },
    end: null,
    bullets: [
      <>Build front-end features with <T>TypeScript</T>, <T>HTML5</T>, <T>Tailwind CSS</T>, and reusable component architecture</>,
      <>Build back-end features using <T>Python</T> and <T>Django</T>, integrating <T>REST APIs</T> and <T>PostgreSQL</T> database queries</>,
      <>Integrated AI/LLM features (<T>Claude API</T>) to automate workflows and enhance user experiences</>,
      <>Assure product quality through automated testing (<T>Jest</T>, <T>Vitest</T>), catching edge cases before production</>,
      <>Collaborate on cross-functional team through design, development, testing, and iteration planning</>,
      <>Take initiative to identify opportunities to improve codebase, processes, and developer experience</>,
      <>Deploy and monitor applications with <T>CI/CD pipelines</T> and infrastructure-as-code practices</>,
      <>Mentor junior developers through code reviews with meticulous attention to correctness and code quality</>,
    ],
  },
  {
    role: "Frontend Developer",
    company: "KYNTRA",
    type: "Permanent Full-time",
    location: "Winnipeg, Manitoba, Canada · On-site",
    start: { year: 2023, month: 5 },
    end: { year: 2024, month: 4 },
    bullets: [
      <>Built modern web applications using <T>Next.js</T>, <T>React</T>, <T>TypeScript</T>, and <T>Tailwind CSS</T></>,
      <>Developed platforms with secure data handling and <T>REST API</T> integration</>,
      <>Wrote unit and integration tests using <T>Jest</T>, catching edge cases before production</>,
      <>Implemented reusable UI components with meticulous attention to detail and cross-browser compatibility</>,
    ],
  },
  {
    role: "Frontend Developer",
    company: "Digiturn",
    type: "Permanent Full-time",
    location: "Remote",
    start: { year: 2022, month: 8 },
    end: { year: 2023, month: 4 },
    bullets: [
      <>Developed responsive landing pages with <T>HTML5</T>, <T>CSS3</T>, <T>JavaScript</T>, and <T>TypeScript</T></>,
      <>Collaborated on cross-functional team through design, development, and testing cycles</>,
      <>Took initiative to identify and implement performance optimizations</>,
    ],
  },
];

const SKILLS = [
  "React / Next.js",
  "TypeScript / JavaScript",
  "Redux / State Management",
  "REST APIs / GraphQL",
  "Python / Django",
  "Tailwind CSS / shadcn/ui",
  "SQL / PostgreSQL",
  "Jest / Vitest",
  "Vite / Build Tools",
  "Radix UI / Component Libraries",
  "Docker / CI/CD",
  "AI Tools (Claude / Cursor)",
];

const sectionClass = "mb-16 animate-rise motion-reduce:animate-none";

const SectionLabel = ({ title }) => (
  <div className="flex items-center gap-4 mb-7">
    <h2 className="font-plex text-[0.72rem] tracking-[0.22em] uppercase text-muted whitespace-nowrap">{title}</h2>
    <span className="flex-1 h-px bg-hairline" aria-hidden="true"></span>
  </div>
);

const xpEntryClass =
  "relative pb-12 last:pb-2 " +
  "before:content-[''] before:absolute before:left-[calc(-2rem_-_3.5px)] before:top-[0.55em] " +
  "before:w-[7px] before:h-[7px] before:rounded-full before:bg-accent " +
  "max-nav:before:left-[calc(-1.5rem_-_3.5px)]";
const xpHeadClass = "flex justify-between items-baseline gap-4 flex-wrap max-nav:flex-col max-nav:gap-[0.2rem]";
const xpRoleClass = "text-[1.1rem] font-medium text-ink";
const xpDatesClass = "font-plex text-[0.75rem] text-muted whitespace-nowrap";
const xpCompanyClass = "text-[0.92rem] text-ink-dim mt-[0.45rem]";
const xpLocationClass = "font-plex text-[0.72rem] text-faint mt-1";
const xpListClass = "pl-8 border-l border-hairline max-nav:pl-6";
const xpBulletClass =
  "relative pl-[1.4rem] mb-2 text-[0.9rem] leading-[1.8] text-muted " +
  "before:content-['–'] before:absolute before:left-0 before:text-faint";

const statClass =
  "flex flex-col gap-2 px-6 py-7 border-l border-hairline first:border-l-0 first:pl-0 " +
  "max-[900px]:odd:border-l-0 max-[900px]:odd:pl-0 max-[900px]:[&:nth-child(n+3)]:border-t " +
  "max-[400px]:border-l-0 max-[400px]:pl-0 max-[400px]:py-4 max-[400px]:[&:nth-child(n+2)]:border-t";

export default function Home() {
  const yearsOfExperience = Math.floor(monthsBetween(CAREER_START, null) / 12);

  const stats = [
    { value: `${yearsOfExperience}+`, label: "Years of Experience" },
    { value: "5+", label: "Projects Delivered" },
    { value: "3", label: "Companies Worked" },
    { value: "10+", label: "Technologies Mastered" },
  ];

  return (
    <div className="max-w-[64rem] mx-auto px-[8%] pt-16 pb-20 text-ink max-nav:px-[6%] max-nav:pt-12 max-nav:pb-16">
      <header className="mb-16 max-nav:mb-12 animate-rise motion-reduce:animate-none">
        <p className="font-plex text-[0.72rem] tracking-[0.3em] uppercase text-accent mb-4">Hello, I am</p>
        <h1 className="text-[clamp(2.4rem,5vw,3.8rem)] font-semibold tracking-tight leading-[1.1] text-ink">Volodymyr Korol</h1>
        <p className="mt-4 text-[1.05rem] text-muted">Frontend Team Lead — Full-stack Developer</p>
      </header>

      <section className={sectionClass} style={{ animationDelay: "0.1s" }}>
        <SectionLabel title="Overview" />
        <div className="grid grid-cols-4 border-y border-hairline max-[900px]:grid-cols-2 max-[400px]:grid-cols-1">
          {stats.map((s) => (
            <div className={statClass} key={s.label}>
              <span className="text-[2.2rem] font-semibold leading-none text-ink">{s.value}</span>
              <span className="font-plex text-[0.68rem] tracking-[0.15em] uppercase text-muted">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className={sectionClass} style={{ animationDelay: "0.2s" }}>
        <SectionLabel title="Competencies" />
        <ul className="flex flex-wrap gap-[0.6rem]">
          {SKILLS.map((skill) => (
            <li
              className="text-[0.85rem] text-ink-dim border border-hairline rounded-full px-4 py-1.5 transition-colors duration-[250ms] hover:text-ink hover:border-accent-dim"
              key={skill}
            >
              {skill}
            </li>
          ))}
        </ul>
      </section>

      <section className={sectionClass} style={{ animationDelay: "0.3s" }}>
        <SectionLabel title="Experience" />
        <ol className={xpListClass}>
          {EXPERIENCE.map((job) => (
            <li className={xpEntryClass} key={`${job.company}-${job.role}`}>
              <div className={xpHeadClass}>
                <h3 className={xpRoleClass}>{job.role}</h3>
                <span className={xpDatesClass}>
                  {formatRange(job.start, job.end)} · {formatDuration(job.start, job.end)}
                </span>
              </div>
              <p className={xpCompanyClass}>{job.company} · {job.type}</p>
              <p className={xpLocationClass}>{job.location}</p>
              <ul className="mt-[1.1rem]">
                {job.bullets.map((bullet, i) => (
                  <li className={xpBulletClass} key={i}>{bullet}</li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </section>

      <section className={sectionClass} style={{ animationDelay: "0.4s" }}>
        <SectionLabel title="Education" />
        <ol className={xpListClass}>
          <li className={xpEntryClass}>
            <div className={xpHeadClass}>
              <h3 className={xpRoleClass}>University of Manitoba</h3>
              <span className={xpDatesClass}>2019 – 2023</span>
            </div>
            <p className={xpCompanyClass}>Bachelor of Science · Computer Science</p>
            <p className={xpLocationClass}>Winnipeg, Manitoba, Canada</p>
          </li>
        </ol>
      </section>
    </div>
  );
}
