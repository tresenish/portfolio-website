import React from "react";
import SectionLabel from "./SectionLabel";
import mailIcon from "../componentStyle/img/mail.png";
import phoneIcon from "../componentStyle/img/phone.png";
import linkedInIcon from "../componentStyle/img/LIn.png";
import gitIcon from "../componentStyle/img/git.png";
import instIcon from "../componentStyle/img/inst.png";

const CONTACTS = [
  { key: "Email", icon: mailIcon, chip: "bg-white rounded-[0.3rem]", value: "korolvolodymyr0@gmail.com", href: "mailto:korolvolodymyr0@gmail.com" },
  { key: "Phone", icon: phoneIcon, chip: "bg-white rounded-[0.3rem] p-px", value: "+1 431-588-3209", href: "tel:+14315883209" },
  { key: "LinkedIn", icon: linkedInIcon, chip: "rounded-[0.3rem]", value: "volodymyr-korol", href: "https://www.linkedin.com/in/volodymyr-korol/", external: true },
  { key: "GitHub", icon: gitIcon, chip: "bg-white rounded-full", value: "tresenish", href: "https://github.com/tresenish", external: true },
  { key: "Instagram", icon: instIcon, chip: "rounded-[0.3rem]", value: "kusipka", href: "https://www.instagram.com/kusipka/", external: true },
];

const sectionClass = "mb-16 animate-rise motion-reduce:animate-none";

export default function Contact() {
  return (
    <div className="max-w-[64rem] mx-auto px-[8%] pt-16 pb-20 text-ink max-nav:px-[6%] max-nav:pt-12 max-nav:pb-16">
      <header className="mb-14 max-nav:mb-10 animate-rise motion-reduce:animate-none">
        <h1 className="text-[1.5rem] font-semibold" title="Contact">Contact</h1>
        <p className="mt-2 text-[0.95rem] text-muted">Open to opportunities, collaborations, and good conversations.</p>
      </header>

      <section className={sectionClass} style={{ animationDelay: "0.1s" }}>
        <SectionLabel title="Channels" />
        <div className="grid grid-cols-2 gap-4 max-[700px]:grid-cols-1">
          {CONTACTS.map((c) => (
            <a
              key={c.key}
              className="group flex items-center gap-4 border border-hairline rounded-xl px-5 py-4 transition-colors hover:border-accent-dim"
              href={c.href}
              {...(c.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            >
              <img className={`w-6 h-6 shrink-0 ${c.chip}`} alt="" aria-hidden="true" src={c.icon} />
              <span className="min-w-0">
                <span className="block font-plex text-[0.66rem] tracking-[0.18em] uppercase text-muted">{c.key}</span>
                <span className="block mt-1 text-[0.92rem] text-ink-dim truncate transition-colors group-hover:text-accent">
                  {c.value}
                </span>
              </span>
            </a>
          ))}
        </div>
      </section>

      <section className={`${sectionClass} mb-0`} style={{ animationDelay: "0.2s" }}>
        <SectionLabel title="Direct line" />
        <p className="mb-6 max-w-[36rem] text-[0.95rem] leading-[1.8] text-muted">
          The fastest way to reach me is email — I usually reply within a day.
        </p>
        <a
          className="inline-block rounded-full bg-accent px-6 py-2.5 text-[0.9rem] font-medium text-page transition-opacity hover:opacity-85"
          href="mailto:korolvolodymyr0@gmail.com"
        >
          Say hello
        </a>
      </section>
    </div>
  );
}
