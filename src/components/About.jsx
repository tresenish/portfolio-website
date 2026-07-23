import React from "react";
import personal1 from "../componentStyle/img/personal1.jpg";
import personal2 from "../componentStyle/img/personal2.jpg";

const paragraphClass = "text-[1rem] leading-[1.8] text-ink-dim";
const imageClass = "h-60 m-4 rounded-lg border border-hairline";

export default function About() {
  return (
    <div className="text-ink my-16 mx-auto w-[70%] max-nav:w-[85%]">
      <h1 className="text-[1.5rem] font-semibold mb-6" title="About">About</h1>
      <p className={paragraphClass}>
        Full-stack Developer delivering high-performance websites, dashboards, and automation tools for SaaS, AI, and crypto
        projects. Experienced in responsive design, database integration, SQL analytics, and API connectivity, with a focus on
        clean UI and scalable solutions.
      </p>
      <img
        className={`${imageClass} float-left`}
        alt="personalPhoto1"
        src={personal1}
      />
      <br/>
      <p className={paragraphClass}>
        Currently working at Serenity AI where I build and maintain multiple company websites and internal tools using
        Next.js, TypeScript, Vite, Tailwind, shadcn/ui, and Radix UI. I manage state using Redux and integrate backend
        functionality with PHP and GraphQL APIs.
      </p>
      <br/>
      <p className={paragraphClass}>
        I have experience developing customer tracking dashboards powered by SQL, deploying applications using Vercel,
        and building automated Telegram bots for user onboarding flows. Throughout my development process, I leverage
        AI tools like Claude to speed up coding, debugging, and ideation.
      </p>
      <img
        className={`${imageClass} float-right`}
        alt="personalPhoto2"
        src={personal2}
      />
      <br/>
      <p className={paragraphClass}>
        My professional experience spans across cryptocurrency projects, including pre-claim and airdrop management platforms,
        responsive landing pages, and ensuring seamless user experiences with secure data handling and blockchain technology integration.
      </p>
      <br/>
      <p className={paragraphClass}>
        I am passionate about creating innovative web applications and am always eager to learn and implement new
        technologies. Feel free to connect with me to discuss potential collaborations or job opportunities.
      </p>
    </div>
  );
}
