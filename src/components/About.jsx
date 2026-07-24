import React from "react";
import SectionLabel from "./SectionLabel";
import personal1 from "../componentStyle/img/personal1.jpg";
import personal2 from "../componentStyle/img/personal2.jpg";

const sectionClass = "mb-16 animate-rise motion-reduce:animate-none";
const paragraphClass = "text-[0.95rem] leading-[1.9] text-ink-dim";
const imageClass = "w-full rounded-xl border border-hairline object-cover";

export default function About() {
  return (
    <div className="max-w-[64rem] mx-auto px-[8%] pt-16 pb-20 text-ink max-nav:px-[6%] max-nav:pt-12 max-nav:pb-16">
      <header className="mb-14 max-nav:mb-10 animate-rise motion-reduce:animate-none">
        <h1 className="text-[1.5rem] font-semibold" title="About">About</h1>
        <p className="mt-2 text-[0.95rem] text-muted">Background, focus, and how I work.</p>
      </header>

      <section className={sectionClass} style={{ animationDelay: "0.1s" }}>
        <SectionLabel title="Profile" />
        <p className="max-w-[44rem] text-[1.05rem] leading-[1.8] text-ink-dim">
          I am a Frontend Team Lead and full-stack developer specializing in high-performance web applications,
          dashboards, and AI-powered tooling. Over the past four years I have progressed from building landing pages
          to leading frontend development at LTVX.ai, owning features end to end — from component architecture in
          TypeScript and React to backend services in Python and Django.
        </p>
      </section>

      <section className={sectionClass} style={{ animationDelay: "0.2s" }}>
        <SectionLabel title="Now" />
        <div className="grid nav:grid-cols-[1fr_15rem] gap-10 max-nav:gap-6 items-start">
          <div className="flex flex-col gap-5">
            <p className={paragraphClass}>
              At LTVX.ai I lead frontend development for an AI-driven analytics product. I design and ship reusable
              component architecture with TypeScript and Tailwind CSS, build REST APIs backed by PostgreSQL, and
              integrate LLM capabilities through the Claude API to automate workflows inside the product.
            </p>
            <p className={paragraphClass}>
              Beyond feature work, I am responsible for engineering quality across the team: reviewing code, mentoring
              junior developers, maintaining automated test coverage with Jest and Vitest, and managing CI/CD pipelines
              that keep deployments predictable.
            </p>
          </div>
          <img className={imageClass} alt="Volodymyr outdoors" src={personal1} />
        </div>
      </section>

      <section className={sectionClass} style={{ animationDelay: "0.3s" }}>
        <SectionLabel title="How I work" />
        <div className="grid nav:grid-cols-[15rem_1fr] gap-10 max-nav:gap-6 items-start">
          <img className={`${imageClass} max-nav:order-2`} alt="Volodymyr travelling" src={personal2} />
          <div className="flex flex-col gap-5">
            <p className={paragraphClass}>
              I hold a high bar for correctness: edge cases are caught in review and tests, not in production. I take
              initiative on the codebase itself — improving developer experience, tightening processes, and removing
              friction before it slows the team down.
            </p>
            <p className={paragraphClass}>
              I use AI tools such as Claude and Cursor as force multipliers for development, debugging, and design
              exploration — while keeping human judgment responsible for every line that ships.
            </p>
          </div>
        </div>
      </section>

      <section className={`${sectionClass} mb-0`} style={{ animationDelay: "0.4s" }}>
        <SectionLabel title="Beyond the code" />
        <p className={`${paragraphClass} max-w-[44rem]`}>
          I moved to Winnipeg to study Computer Science at the University of Manitoba and built my engineering career
          in Canada from there. Outside of work I spend my time outdoors and travelling — it keeps perspective fresh,
          which I consider part of doing good work. I am open to new opportunities and always glad to connect.
        </p>
      </section>
    </div>
  );
}
