import React from "react";
import "../componentStyle/Contact.css";

export default function Contact() {
  return (
    <div className="contact">
      <h1 className="contact glitch4" title="Contact">Contact</h1>
      <div id="mediaLinks">
        <div className="socMed">
          <a className="socMed" href="mailto:korolvolodymyr0@gmail.com">
            <img className="socMed" id="mail" alt="mail" src={require("../componentStyle/img/mail.png")} />
            <h2 className="socMed">korolvolodymyr0@gmail.com</h2>
          </a>
        </div>
        <div className="socMed">
          <a className="socMed" href="tel:+14315883209">
            <img className="socMed" id="phone" alt="phone" src={require("../componentStyle/img/phone.png")} />
            <h2 className="socMed">+1 431-588-3209</h2>
          </a>
        </div>
        <div className="socMed">
          <a className="socMed" href="https://www.linkedin.com/in/volodymyr-korol/" target="_blank" rel="noopener noreferrer">
            <img className="socMed" alt="LinkedIn" src={require("../componentStyle/img/LIn.png")} />
            <h2 className="socMed">volodymyr-korol</h2>
          </a>
        </div>
        <div className="socMed">
          <a className="socMed" href="https://github.com/tresenish" target="_blank" rel="noopener noreferrer">
            <img className="socMed" id="github" alt="github" src={require("../componentStyle/img/git.png")} />
            <h2 className="socMed">tresenish</h2>
          </a>
        </div>
        <div className="socMed">
          <a className="socMed" href="https://www.instagram.com/tresenish/" target="_blank" rel="noopener noreferrer">
            <img className="socMed" alt="instagram" src={require("../componentStyle/img/inst.png")} />
            <h2 className="socMed">tresenish</h2>
          </a>
        </div>
      </div>
    </div>
  );
}
