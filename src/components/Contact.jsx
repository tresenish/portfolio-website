import React from "react";
import mailIcon from "../componentStyle/img/mail.png";
import phoneIcon from "../componentStyle/img/phone.png";
import linkedInIcon from "../componentStyle/img/LIn.png";
import gitIcon from "../componentStyle/img/git.png";
import instIcon from "../componentStyle/img/inst.png";

const CONTACTS = [
  { key: "mail", icon: mailIcon, chip: "bg-white rounded-[0.3rem]", label: "korolvolodymyr0@gmail.com", href: "mailto:korolvolodymyr0@gmail.com" },
  { key: "phone", icon: phoneIcon, chip: "bg-white rounded-[0.3rem] p-px", label: "+1 431-588-3209", href: "tel:+14315883209" },
  { key: "linkedin", icon: linkedInIcon, chip: "rounded-[0.3rem]", label: "volodymyr-korol", href: "https://www.linkedin.com/in/volodymyr-korol/", external: true },
  { key: "github", icon: gitIcon, chip: "bg-white rounded-full", label: "tresenish", href: "https://github.com/tresenish", external: true },
  { key: "instagram", icon: instIcon, chip: "rounded-[0.3rem]", label: "tresenish", href: "https://www.instagram.com/tresenish/", external: true },
];

export default function Contact() {
  return (
    <div className="text-ink mt-12 ml-32 w-[70%] max-nav:my-12 max-nav:mx-auto max-nav:w-[90%]">
      <h1 className="text-[1.5rem] font-semibold mb-3" title="Contact">Contact</h1>
      <div className="flex flex-col">
        {CONTACTS.map((c) => (
          <div className="w-fit" key={c.key}>
            <a
              className="group flex items-center gap-3 my-3 whitespace-nowrap text-[0.95rem]"
              href={c.href}
              {...(c.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            >
              <img className={`w-6 h-6 ${c.chip}`} alt={c.key} src={c.icon} />
              <span className="text-ink-dim transition-colors group-hover:text-accent">{c.label}</span>
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
