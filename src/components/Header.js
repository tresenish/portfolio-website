// src/components/Header.js
import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import "../componentStyle/Header.css";
import ThreeDModelViewer from './ThreeDModelViewer';

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  const handleToggle = () => {
    setMenuOpen(!menuOpen);
  };

  const handleLinkClick = () => {
    setMenuOpen(false);
  };

  return (
    <>
      <div className="header">
        <NavLink className="nav-link" to="/">
          <img id="avatar" alt="avatar" src={require("../componentStyle/img/avatar.jpg")} />
        </NavLink>
        <NavLink className="nav-link" to="/" end onClick={handleLinkClick}>Home</NavLink>
        <NavLink className="nav-link" to="/projects" onClick={handleLinkClick}>Projects</NavLink>
        <NavLink className="nav-link" to="/about" onClick={handleLinkClick}>About</NavLink>
        <NavLink className="nav-link" to="/contact" onClick={handleLinkClick}>Contact</NavLink>
        <div className="model-container">
          <ThreeDModelViewer scale={[2.5, 2.5, 2.5]} />
        </div>
      </div>
      <div className="mobileHeader">
        <input
          type="checkbox"
          id="toggle"
          className="input-toggler"
          checked={menuOpen}
          onChange={handleToggle}
        />
        <label htmlFor="toggle" className="menu-toggler">
          <span className="menu-toggler-line"></span>
          <span className="menu-toggler-line"></span>
          <span className="menu-toggler-line"></span>
        </label>
        <aside className="sidebar">
          <div className="model-container">
            <ThreeDModelViewer scale={[2, 2, 2]} />
          </div>
          <ul className="menu">
            <li className="menuElem"><NavLink className="menu-link nav-link" to="/" end onClick={handleLinkClick}>Home</NavLink></li>
            <li className="menuElem"><NavLink className="menu-link nav-link" to="/projects" onClick={handleLinkClick}>Projects</NavLink></li>
            <li className="menuElem"><NavLink className="menu-link nav-link" to="/about" onClick={handleLinkClick}>About</NavLink></li>
            <li className="menuElem"><NavLink className="menu-link nav-link" to="/contact" onClick={handleLinkClick}>Contact</NavLink></li>
          </ul>
        </aside>
      </div>
    </>
  );
}
