import React from "react";

import "../componentStyle/Contact.css";

export default function Contact () {

  return (
    <div className="contact">
      <h1 className="contact">Contact</h1>
            <br/>
            <div id="mediaLinks">
              <div className="socMed">
                <a className="socMed" target="_blank" href="mailto:korolvolodymyr0@gmail.com">
                  <img className="socMed" id="mail" alt="instagram" src={require("../componentStyle/img/mail.png")} />
                  <h2 className="socMed">korolvolodymyr0@gmail.com</h2>
                </a>
              </div>
              <div className="socMed">
                <a className="socMed" target="_blank" href="https://www.linkedin.com/in/volodymyr-korol/">
                  <img className="socMed" alt="LinkedIn" src={require("../componentStyle/img/LIn.png")} />
                  <h2 className="socMed">volodymyr-korol</h2>
                </a>
              </div>
              <div className="socMed">
                <a className="socMed" target="_blank" href="https://github.com/tresenish">
                  <img className="socMed" id="github" alt="github" src={require("../componentStyle/img/git.png")} />
                  <h2 className="socMed">tresenish</h2>
                </a>
              </div>
              <div className="socMed">
                <a className="socMed" target="_blank" href="https://www.instagram.com/tresenish/">
                  <img className="socMed" alt="instagram" src={require("../componentStyle/img/inst.png")} />
                  <h2 className="socMed">tresenish</h2>
                </a>
              </div>
            </div>
    </div>
  )
}