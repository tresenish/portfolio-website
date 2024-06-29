// Home.js

import React from "react";
import "../componentStyle/Home.css";

export default function Home() {
  return (
    <div>
      <p>This is HOME page.</p>
      <div className="homeGrid">
        <section className="card LT"> 
          <div className="card small LT1">LT1</div>
          <div className="card small LT2">LT2</div>
          <div className="card small LT3">LT3</div>
          <div className="card small LT4">LT4</div>
        </section>
        <section className="card big RT">
          
        </section>
        <section className="card big LB">
        Skills:
          <div className="skills">
            <ul className="skills">
              <li className="skills">JavaScript / TypeScript</li>
              <li className="skills">React.js / Redux</li>
              <li className="skills">HTML / CSS</li>
              <li className="skills">Node.js</li>
              <li className="skills">REST API</li>
            </ul>
            <ul className="skills">
              <li className="skills">UI / UX</li>
              <li className="skills">MySQL</li>
              <li className="skills">MochaJS</li>
              <li className="skills">Java</li>
              <li className="skills">Python/C++</li>
            </ul>
          </div></section>
      </div>
    </div>
  );
}
