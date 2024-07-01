import React from "react";
import "../componentStyle/Projects.css";

export default function Projects() {
  return (
    <div className="projects">
      <h1 className="projects">Projects</h1>
      <div className="projectGrid">
        <div className="projectCard">
          <h2 className="projectCard">
            <a className="projectLink" href="https://tresenish.github.io/spotifyproject/">
              Mixer for Spotify
            </a>
            <span className="linkIcon material-symbols-outlined">link</span>
          </h2>
          <img className="projectCard" alt="projectDemo" src={require("../componentStyle/img/mixer-screenshot.png")} />
          <div className="overlay">
            <h2 className="overlayTitle">
              <a className="projectLink" href="https://tresenish.github.io/spotifyproject/">
                Mixer for Spotify
              </a>
              <span className="linkIcon material-symbols-outlined">link</span>
            </h2>
            <img className="overlayImage" alt="projectDemo" src={require("../componentStyle/img/mixerDemo.gif")} />
            <p className="overlayDescription">
              <br/>
              Use for test login:
              <br/>
              username: test01201081@gmail.com
              <br/>
              password: qwerty123qwerty
              <br/><br/>
              React Spotify Manager is a web application that integrates with the Spotify API,
              allowing users to manage their Spotify profiles and playlists seamlessly. 
              Key features include fetching user profile information, viewing and managing playlists,
              searching for tracks, and adding tracks to playlists.
              <br/>
              User logs in via Spotify OAuth
              <br/>
            </p>
          </div>
          <p className="projectCard">
            <br/>
            Fetch profile, playlist, search, add to playlist<br/>
            ● React, REST API (Spotify API)<br/>
          </p>
        </div>
        <div className="projectCard">
          <h2 className="projectCard">
            <a className="projectLink" href="https://tresenish.github.io/digiturn/#">
              Digiturn
            </a>
            <span className="linkIcon material-symbols-outlined">link</span>
          </h2>
          <img className="projectCard" alt="projectDemo" src={require("../componentStyle/img/digiturn-screenshot.png")} />
          <div className="overlay">
            <h2 className="overlayTitle">
              <a className="projectLink" href="https://tresenish.github.io/digiturn/#">
                Digiturn
              </a>
              <span className="linkIcon material-symbols-outlined">link</span>
            </h2>
            <img className="overlayImage" alt="projectDemo" src={require("../componentStyle/img/digiturnDemo.gif")} />
            <p className="overlayDescription">
            Digiturn is a sophisticated and visually appealing landing page designed for
             a web design agency. The project showcases modern web design principles and
              provides a seamless user experience through the use of HTML, CSS, UI/UX best
               practices, JavaScript, and jQuery.
            </p>
          </div>
          <p className="projectCard">
            <br/>
            Landing page for Web Design Agency<br/>
            ● HTML, CSS, and jQuery<br/>
            ● Figma, UI/UX<br/>
          </p>
        </div>
      </div>
    </div>
  );
}
