import React, { useState } from "react";
import "../componentStyle/Projects.css";
import expenseTracker from "../componentStyle/img/expense-tracker.png";
import expenseTrackerDemo from "../componentStyle/img/expenseTrackerDemo.gif";
import mixerScreenshot from "../componentStyle/img/mixer-screenshot.png";
import mixerDemo from "../componentStyle/img/mixerDemo.gif";
import digiturnScreenshot from "../componentStyle/img/digiturn-screenshot.png";
import digiturnDemo from "../componentStyle/img/digiturnDemo.gif";
import monochromeScreenshot from "../componentStyle/img/monochrome-screenshot.png";
import monochromeDemo from "../componentStyle/img/monochromeDemo.gif";

export default function Projects() {
  const [hoveredProject, setHoveredProject] = useState(null);

  const handleMouseEnter = (index) => {
    setHoveredProject(index);
  };

  const handleMouseLeave = () => {
    setHoveredProject(null);
  };

  const handleCloseOverlay = () => {
    setHoveredProject(null);
  };

  const projects = [
    {
      title: "AI Expense tracker",
      link: "https://ai-expense-tracker-alpha.vercel.app/",
      image: expenseTracker,
      overlayImage: expenseTrackerDemo,
      description: "AI categorizes expenses, visualizes data, manages entries.",
      technologies: ["● React, Redux , REST API (ChatGPT API)"],
      overlayDescription: `
        An AI-powered expense tracker that categorizes your expenses automatically,
         visualizes spending with dynamic charts, supports multiple currencies, and
          allows easy management of entries. Perfect for keeping track of finances efficiently and smartly.`,
    },
    {
      title: "Mixer for Spotify",
      link: "https://tresenish.github.io/spotifyproject/",
      image: mixerScreenshot,
      overlayImage: mixerDemo,
      description: "Fetch profile, playlist, search, add to playlist",
      technologies: ["● React, REST API (Spotify API)"],
      overlayDescription: `Use for test login:
        username: test01201081@gmail.com
        password: qwerty123qwerty

        React Spotify Manager is a web application that integrates with the Spotify API,
        allowing users to manage their Spotify profiles and playlists seamlessly. 
        Key features include fetching user profile information, viewing and managing playlists,
        searching for tracks, and adding tracks to playlists.
        User logs in via Spotify OAuth`,
    },
    {
      title: "Digiturn",
      link: "https://tresenish.github.io/digiturn/#",
      image: digiturnScreenshot,
      overlayImage: digiturnDemo,
      description: "Landing page for Web Design Agency",
      technologies: ["● HTML, CSS, and jQuery", "● Figma, UI/UX"],
      overlayDescription: "Digiturn is a sophisticated and visually appealing landing page designed for a web design agency. The project showcases modern web design principles and provides a seamless user experience through the use of HTML, CSS, UI/UX best practices, JavaScript, and jQuery.",
    },
    {
      title: "Monochrome",
      link: "https://tresenish.github.io/",
      image: monochromeScreenshot,
      overlayImage: monochromeDemo,
      description: "E-commerce portfolio website",
      technologies: ["● HTML, CSS", "● UI/UX"],
      overlayDescription: "Monochrome is a sleek and modern e-commerce portfolio website designed to showcase and sell products with a minimalist aesthetic. The project demonstrates proficiency in HTML, CSS, and UI/UX design, creating a seamless experience for users.",
    },
  ];

  return (
    <div className="projects">
      <h1 className=" projects" title="Projects">Projects</h1>
      <div className="projectGrid">
        {projects.map((project, index) => (
          <div
            key={index}
            className="projectCard"
            onMouseEnter={() => handleMouseEnter(index)}
            onMouseLeave={handleMouseLeave}
          >
            <h2 className="projectCard">
              <a className="projectLink" href={project.link}>
                {project.title}
              </a>
              <span className="linkIcon material-symbols-outlined">link</span>
            </h2>
            <img className="projectCard" alt="projectDemo" src={project.image} />
            <div className={`overlay ${hoveredProject === index ? 'visible' : ''}`}>
              <button className="closeButton" onClick={handleCloseOverlay}>&times;</button>
              <h2 className="overlayTitle">
                <a className="projectLink" href={project.link}>
                  {project.title}
                </a>
                <span className="linkIcon material-symbols-outlined">link</span>
              </h2>
              <img className="overlayImage" alt="projectDemo" src={project.overlayImage} />
              <p className="overlayDescription">{project.overlayDescription}</p>
            </div>
            <p className="projectCard">
              <br />
              {project.description}<br />
              {project.technologies.map((tech, i) => (
                <React.Fragment key={i}>
                  {tech}
                  <br />
                </React.Fragment>
              ))}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}


