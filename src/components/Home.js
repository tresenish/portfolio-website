import React from "react";
import "../componentStyle/Home.css";

export default function Home() {
  return (
    <div>
      <h1 className="home">
        Hello, I'm <span className="glitch1" title="Volodymyr Korol">Volodymyr Korol</span>.<br />
        I am a <span className="glitch1" title="full-stack developer">full-stack developer</span>.
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
              <li className="skills">Node.js</li>
              <li className="skills">REST API</li>
              <li className="skills">UI / UX</li>
              <li className="skills">MySQL</li>
              <li className="skills">MochaJS</li>
              <li className="skills">Java</li>
              <li className="skills">Git</li>
            </ul>
          </div>
        </section>
        <section className="card big RB">
          <h2 className="h2Card">Experience: </h2>
          <h3 className="h3Card">
            <span className="university">Front-end Developer </span>
            <span className="year">01/2024 - Present</span>
          </h3>
          <span className="major">Digiturn (Remote)</span>

          <br/>
          <br/>
          <h3 className="h3Card">
            <span className="university">Software Developer</span> 
            <span className="year">02/2023 - 12/2023</span>
          </h3>
          <span className="major">Freelance (Remote)</span>

        </section>
        <section className="card big RT">
          <h2 className="h2Card">Education: </h2>
          <h3 className="h3Card">
            <span className="university">University of Manitoba </span>
            <span className="year">2020 - 2024</span>
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
