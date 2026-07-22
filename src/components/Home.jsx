import React from "react";
import "../componentStyle/Home.css";

export default function Home() {
  return (
    <div>
      <h1 className="home">
        Hello, I'm <span className="" title="Volodymyr Korol">Volodymyr Korol</span>.<br />
        I am a <span className="glitch1" title="full-stack developer">Full-stack Developer</span>.
      </h1>
      <div className="homeGrid">
        <section className="card LT"> 
          <div className="card small LT1">
            <h3 className="hSmall">2+ </h3>
            <p>Years of Experience</p>
          </div>
          <div className="card small LT2">
            <h3 className="hSmall">5+ </h3>
            <p>Projects Delivered</p>
          </div>
          <div className="card small LT3">
            <h3 className="hSmall">3</h3>
            <p>Companies Worked</p>
          </div>
          <div className="card small LT4">
            <h3 className="hSmall">10+</h3>
            <p>Technologies Mastered</p>
          </div>
        </section>
        <section className="card big LB">
          <h2 className="h2Card">Skills:</h2>
          <div className="skills">
            <ul className="skills">
              <li className="skills">React / Next.js</li>
              <li className="skills">TypeScript / JavaScript</li>
              <li className="skills">Redux / State Management</li>
              <li className="skills">REST APIs / GraphQL</li>
              <li className="skills">PHP / Node.js</li>
              <li className="skills">Tailwind CSS / shadcn/ui</li>
              <li className="skills">SQL / Database Integration</li>
              <li className="skills">Vercel / CI/CD</li>
              <li className="skills">Vite / Build Tools</li>
              <li className="skills">Radix UI / Component Libraries</li>
              <li className="skills">Docker / Testing</li>
              <li className="skills">AI Tools (Claude/Cursor)</li>
            </ul>
          </div>
        </section>
      </div>
      <div className="experienceSection">
        <section className="card big experience-full">
          <h2 className="h2Card">Experience: </h2>
          <h3 className="h3Card">
            <span className="university">Full-stack Developer </span>
            <span className="year">May 2025 - Present</span>
          </h3>
          <span className="major">Serenity AI (Remote)</span>
          <br/>
          <p className="job-description">
            Building and maintaining multiple company websites and internal tools using <span className="tech-highlight">Next.js</span>, <span className="tech-highlight">TypeScript</span>, <span className="tech-highlight">Vite</span>, <span className="tech-highlight">Tailwind</span>, <span className="tech-highlight">shadcn/ui</span>, and <span className="tech-highlight">Radix UI</span>. 
            Managing state with <span className="tech-highlight">Redux</span> and integrating backend functionality with <span className="tech-highlight">PHP</span> and <span className="tech-highlight">GraphQL APIs</span>. Developing customer tracking dashboards powered by <span className="tech-highlight">SQL</span> 
            and building automated <span className="tech-highlight">Telegram bots</span> for user onboarding flows.
          </p>
          <br/>
          <br/>
          <h3 className="h3Card">
            <span className="university">Frontend Developer </span>
            <span className="year">Jun 2024 - May 2025</span>
          </h3>
          <span className="major">PICKL (Remote)</span>
          <br/>
          <p className="job-description">
            Specialized in building modern web applications and landing pages using <span className="tech-highlight">Next.js</span>, <span className="tech-highlight">React.js</span>, <span className="tech-highlight">TypeScript</span>, and <span className="tech-highlight">Vite</span>.
            Focused on developing scalable, high-performance solutions for cryptocurrency projects, including pre-claim and airdrop management platforms and responsive landing pages.
            Ensured seamless user experiences, secure data handling, and integration with <span className="tech-highlight">blockchain technologies</span>.
          </p>
          <br/>
          <br/>
          <h3 className="h3Card">
            <span className="university">Frontend Developer </span>
            <span className="year">Sep 2023 - Jun 2024</span>
          </h3>
          <span className="major">Digiturn (Remote)</span>
          <p className="job-description">
            Experienced in creating responsive, visually appealing landing pages with <span className="tech-highlight">HTML</span>, <span className="tech-highlight">CSS</span>, and <span className="tech-highlight">JavaScript</span>, ensuring
            optimized performance, cross-browser compatibility, and seamless user experiences.
          </p>
        </section>
      </div>
      <div className="educationSection">
        <section className="card big education-full">
          <h2 className="h2Card">Education: </h2>
          <h3 className="h3Card">
            <span className="university">University of Manitoba </span>
            <span className="year">2019 - 2023</span>
          </h3>
          <span className="major">Computer Science</span>
        </section>
      </div>
    </div>
  );
}
