import React from "react";
import "../componentStyle/About.css";
import personal1 from "../componentStyle/img/personal1.jpg";
import personal2 from "../componentStyle/img/personal2.jpg";

export default function About() {
  return (
    <div className="about">
      <h1 className="about " title="About">About</h1>
      <p className="about">
        Full-stack Developer delivering high-performance websites, dashboards, and automation tools for SaaS, AI, and crypto
        projects. Experienced in responsive design, database integration, SQL analytics, and API connectivity, with a focus on
        clean UI and scalable solutions.
      </p>
      <img
        className="about left"
        alt="personalPhoto1"
        src={personal1}
      />
      <br/>
      <p className="about">
        Currently working at Serenity AI where I build and maintain multiple company websites and internal tools using
        Next.js, TypeScript, Vite, Tailwind, shadcn/ui, and Radix UI. I manage state using Redux and integrate backend
        functionality with PHP and GraphQL APIs.
      </p>
      <br/>
      <p className="about">
        I have experience developing customer tracking dashboards powered by SQL, deploying applications using Vercel,
        and building automated Telegram bots for user onboarding flows. Throughout my development process, I leverage
        AI tools like Claude to speed up coding, debugging, and ideation.
      </p>
      <img
        className="about right"
        alt="personalPhoto2"
        src={personal2}
      />
      <br/>
      <p className="about">
        My professional experience spans across cryptocurrency projects, including pre-claim and airdrop management platforms,
        responsive landing pages, and ensuring seamless user experiences with secure data handling and blockchain technology integration.
      </p>
      <br/>
      <p className="about">
        I am passionate about creating innovative web applications and am always eager to learn and implement new
        technologies. Feel free to connect with me to discuss potential collaborations or job opportunities.
      </p>
    </div>
  );
}
