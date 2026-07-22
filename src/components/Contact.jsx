import React from "react";
import "../componentStyle/Contact.css";
import mailIcon from "../componentStyle/img/mail.png";
import phoneIcon from "../componentStyle/img/phone.png";
import linkedInIcon from "../componentStyle/img/LIn.png";
import gitIcon from "../componentStyle/img/git.png";
import instIcon from "../componentStyle/img/inst.png";

export default function Contact() {
  return (
    <div className="contact">
      <h1 className="contact " title="Contact">Contact</h1>
      <div id="mediaLinks">
        <div className="socMed">
          <a className="socMed" href="mailto:korolvolodymyr0@gmail.com">
            <img className="socMed" id="mail" alt="mail" src={mailIcon} />
            <h2 className="socMed">korolvolodymyr0@gmail.com</h2>
          </a>
        </div>
        <div className="socMed">
          <a className="socMed" href="tel:+14315883209">
            <img className="socMed" id="phone" alt="phone" src={phoneIcon} />
            <h2 className="socMed">+1 431-588-3209</h2>
          </a>
        </div>
        <div className="socMed">
          <a className="socMed" href="https://www.linkedin.com/in/volodymyr-korol/" target="_blank" rel="noopener noreferrer">
            <img className="socMed" alt="LinkedIn" src={linkedInIcon} />
            <h2 className="socMed">volodymyr-korol</h2>
          </a>
        </div>
        <div className="socMed">
          <a className="socMed" href="https://github.com/tresenish" target="_blank" rel="noopener noreferrer">
            <img className="socMed" id="github" alt="github" src={gitIcon} />
            <h2 className="socMed">tresenish</h2>
          </a>
        </div>
        <div className="socMed">
          <a className="socMed" href="https://www.instagram.com/tresenish/" target="_blank" rel="noopener noreferrer">
            <img className="socMed" alt="instagram" src={instIcon} />
            <h2 className="socMed">tresenish</h2>
          </a>
        </div>
      </div>
    </div>
  );
}
