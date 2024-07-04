import React from "react";
import "../componentStyle/About.css";

export default function About() {
  return (
    <div className="about">
      <h1 className="about">About</h1>
      <p className="about">
        Hello! I'm Volodymyr Korol, a dedicated Full-stack Software Developer
        with a passion for creating innovative and engaging web applications.
      </p>
      <img
        className="about left"
        alt="personalPhoto1"
        src={require("../componentStyle/img/personal1.jpg")}
      />
      <br/>
      <p className="about">
        Currently pursuing my degree in Computer Science at the University of
        Manitoba, I have developed a strong foundation in both front-end and
        back-end technologies.
      </p>
      <br/>

      <p className="about">
        I work remotely, which allows me to collaborate effectively with teams
        across different time zones. My professional experience includes
        developing and maintaining landing pages, focusing on responsive design,
        and ensuring cross-browser compatibility. I thrive in dynamic
        environments and am always eager to learn and implement new
        technologies.
      </p>
      <img
        className="about right"
        alt="personalPhoto2"
        src={require("../componentStyle/img/personal2.jpg")}
      />
      <br/>
      <p className="about">
        In addition to my professional pursuits, I am a good student and
        maintain a strong academic record. Outside of work and studies, I enjoy
        traveling, which broadens my perspective and inspires my creativity.
      </p>
      <br/>

      <p className="about">
        I am open to new opportunities and look forward to contributing my
        skills and enthusiasm to exciting projects. Feel free to connect with me
        to discuss potential collaborations or job opportunities.
      </p>
    </div>
  );
}
