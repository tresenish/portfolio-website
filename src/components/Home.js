import React from "react";
import "../componentStyle/Home.css";

export default function Home() {
  return (
    <div>
      <h1 className="home">Hello, I'm Volodymyr Korol.<br/>
      I am a full-stack developer.</h1>
      <div className="homeGrid">
        <section className="card LT"> 
          <div className="card small LT1">LT1</div>
          <div className="card small LT2">LT2</div>
          <div className="card small LT3">LT3</div>
          <div className="card small LT4">LT4</div>
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
              <li className="skills">Python/C++</li>
            </ul>
          </div>
        </section>
        <section className="card big RB">
          <h2 className="h2Card">Experience: </h2>
          <h3 className="h3Card">
            <span className="university">Front-end developer </span>
            <span className="year">01/2024 - Present</span>
          </h3>
          <span className="major">Digiturn (Remote)</span>

          <br/>
          <br/>
          <h3 className="h3Card">
            <span className="university">Software developer</span> 
            <span className="year">02/2023 - 12/2023</span>
          </h3>
          <span className="major">Freelanse (Remote)</span>

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
