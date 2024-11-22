import React from "react";
import "../componentStyle/Home.css";

export default function Home() {
  return (
    <div>
      <h1 className="home">
        Hello, I'm <span className="" title="Volodymyr Korol">Volodymyr Korol</span>.<br />
        I am a <span className="glitch1" title="front-end developer">Fronted Developer</span>.
      </h1>
      <div className="homeGrid">
        <section className="card LT"> 
          <div className="card small LT1">
            <h3 className="hSmall">1+ </h3>
            <p>Year of Experience</p>
          </div>
          <div className="card small LT2">
            <h3 className="hSmall">5+ </h3>
            <p>Projects Delivered</p>
          </div>
          <div className="card small LT3">
            <h3 className="hSmall">3</h3>
            <p>Professional Certifications</p>
          </div>
          <div className="card small LT4">
            <h3 className="hSmall">1</h3>
            <p>Hackathon Participant</p>
          </div>
        </section>
        <section className="card big LB">
          <h2 className="h2Card">Skills:</h2>
          <div className="skills">
            <ul className="skills">
              <li className="skills">JavaScript / TypeScript</li>
              <li className="skills">React.js / Redux</li>
              <li className="skills">HTML / CSS</li>
              <li className="skills">PHP</li>
              <li className="skills">Node.js</li>
              <li className="skills">REST API</li>
              <li className="skills">UI / UX</li>
              <li className="skills">Figma</li>
              <li className="skills">MySQL</li>
              <li className="skills">MochaJS</li>
              <li className="skills">Jest</li>
              <li className="skills">Git</li>
            </ul>
          </div>
        </section>
        <section className="card big RB">
          <h2 className="h2Card">Experience: </h2>
          <h3 className="h3Card">
            <span className="university">Front-end Developer </span>
            <span className="year">08/2024 - Present</span>
          </h3>
          <span className="major">PICKL(On-site)</span>
          <br/>
          <p className="job-description">
            Specialized in building modern web applications and landing pages using Next.js, React.js, TypeScript, and Vite.
            Focused on developing scalable, high-performance solutions for cryptocurrency projects, including pre-claim and airdrop management platforms and responsive landing pages.
            Ensured seamless user experiences, secure data handling, and integration with blockchain technologies.
          </p>
          <br/>
          <br/>
          <h3 className="h3Card">
            <span className="university">Front-end Developer </span>
            <span className="year">01/2024 - 08/2024</span>
          </h3>
          <span className="major">Digiturn (Remote)</span>
          <p className="job-description">
          Experienced in developing responsive and visually appealing landing websites using HTML, CSS, and JavaScript.
           Focused on delivering ui/ux designs, cross-browser compatibility, and optimized performance.
            Adept at implementing modern web design principles to create user-friendly interfaces and ensuring seamless functionality across devices.
          </p>

        </section>
        <section className="card big RT">
          <h2 className="h2Card">Education: </h2>
          <h3 className="h3Card">
            <span className="university">University of Manitoba </span>
            <span className="year">2020 - 2023</span>
          </h3>
          <span className="major">Computer Science</span>
          <br/>
          <br/>
          <h3 className="h3Card">
            <span className="university">International College of Manitoba</span> 
            <span className="year">2019 - 2020</span>
          </h3>
          <span className="major">Science</span>

        </section>
      </div>
    </div>
  );
}
