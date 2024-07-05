import React, { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import "../componentStyle/Header.css";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const handleToggle = () => {
    setMenuOpen(!menuOpen);
  };

  const handleLinkClick = () => {
    setMenuOpen(false);
  };

  const handleMouseMove = (e) => {
    const firstLogo = document.querySelector(".cursorChaser.one");
    const firstLogoRect = firstLogo.getBoundingClientRect();
    const relativeX = e.clientX - firstLogoRect.left;
    const relativeY = e.clientY - firstLogoRect.top;
    setMousePosition({ x: relativeX, y: relativeY });
  };

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  useEffect(() => {
    const logos = document.querySelectorAll(".cursorChaser");
    logos.forEach(logo => {
      const factorX = parseFloat(getComputedStyle(logo).getPropertyValue('--factor-x'));
      const factorY = parseFloat(getComputedStyle(logo).getPropertyValue('--factor-y'));
      logo.style.setProperty('--x', `${mousePosition.x * factorX}px`);
      logo.style.setProperty('--y', `${mousePosition.y * factorY}px`);
    });
  }, [mousePosition]);

  return (
    <>
      <div className="header">
        <NavLink className="nav-link" to="/">
          <img id="avatar" alt="avatar" src={require("../componentStyle/img/avatar.jpg")} />
        </NavLink>
        <NavLink className="nav-link" to="/" end>Home</NavLink>
        <NavLink className="nav-link" to="/projects">Projects</NavLink>
        <NavLink className="nav-link" to="/about">About</NavLink>
        <NavLink className="nav-link" to="/contact">Contact</NavLink>
        <img alt="smallLogo1" className="cursorChaser one" src={require("../componentStyle/img/logo/logo1.png")} />
        <img alt="smallLogo2" className="cursorChaser two" src={require("../componentStyle/img/logo/logo2.png")} />
        <img alt="smallLogo3" className="cursorChaser three" src={require("../componentStyle/img/logo/logo3.png")} />
        <img alt="smallLogo4" className="cursorChaser four" src={require("../componentStyle/img/logo/logo4.png")} />
        <img alt="smallLogo5" className="cursorChaser five" src={require("../componentStyle/img/logo/logo5.png")} />
        <img alt="smallLogo5" className="cursorChaser six" src={require("../componentStyle/img/logo/logo6.png")} />
        <img alt="smallLogo5" className="cursorChaser seven" src={require("../componentStyle/img/logo/logo7.png")} />
        <img alt="smallLogo5" className="cursorChaser eight" src={require("../componentStyle/img/logo/logo8.png")} />
        <img alt="smallLogo5" className="cursorChaser nine" src={require("../componentStyle/img/logo/logo9.png")} />
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
