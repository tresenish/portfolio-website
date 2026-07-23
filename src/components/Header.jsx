// src/components/Header.js
import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import avatar from "../componentStyle/img/avatar.jpg";
import ThreeDModelViewer from './ThreeDModelViewer';

const NAV_ITEMS = [
  { to: "/", label: "Home", end: true },
  { to: "/projects", label: "Projects" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

const desktopLinkClass = ({ isActive }) =>
  "rounded-md px-3 py-2 text-[0.9rem] transition-colors " +
  (isActive ? "bg-card text-ink" : "text-muted hover:text-ink hover:bg-card/50");

const mobileLinkClass = ({ isActive }) =>
  "inline-block text-[1.8rem] font-medium leading-[2.4] transition-colors hover:text-ink " +
  (isActive ? "text-accent" : "text-ink-dim");

const togglerLineClass = "block w-6 h-[2px] bg-ink transition-all duration-300";

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
      {/* desktop sidebar */}
      <div className="[grid-area:header] hidden nav:block bg-panel border-r border-hairline">
        <div className="sticky top-0 flex flex-col h-screen overflow-hidden">
          <NavLink to="/" className="flex items-center gap-3 px-5 pt-8 pb-6 min-w-0" onClick={handleLinkClick}>
            <img
              className="w-14 h-14 rounded-full border border-hairline object-cover shrink-0"
              alt="avatar"
              src={avatar}
            />
            <div className="min-w-0">
              <p className="text-[0.95rem] font-medium text-ink truncate">Volodymyr Korol</p>
              <p className="text-[0.75rem] text-muted truncate">Frontend Team Lead</p>
            </div>
          </NavLink>
          <nav className="flex flex-col gap-1 px-3 mt-2">
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.to} className={desktopLinkClass} to={item.to} end={item.end} onClick={handleLinkClick}>
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-auto relative z-[1] w-full h-[320px] max-[1200px]:h-[240px]">
            <ThreeDModelViewer scale={[2.5, 2.5, 2.5]} />
          </div>
        </div>
      </div>

      {/* mobile: toggler + slide-in menu */}
      <div className="block nav:hidden">
        <button
          type="button"
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
          onClick={handleToggle}
          className="fixed right-5 bottom-5 w-14 h-14 rounded-full bg-card border border-hairline shadow-lg z-10 flex flex-col items-center justify-center gap-[5px] cursor-pointer"
        >
          <span className={`${togglerLineClass} ${menuOpen ? "translate-y-[7px] rotate-45" : ""}`}></span>
          <span className={`${togglerLineClass} ${menuOpen ? "opacity-0" : ""}`}></span>
          <span className={`${togglerLineClass} ${menuOpen ? "-translate-y-[7px] -rotate-45" : ""}`}></span>
        </button>
        <aside
          className={`fixed top-0 left-0 h-screen w-full bg-panel z-[3] flex flex-col justify-start items-center transition-all duration-[400ms] ease-out ${
            menuOpen ? "translate-x-0 opacity-[.98]" : "-translate-x-full opacity-50"
          }`}
        >
          <div className="absolute top-0 z-[1] w-full h-[50vh]">
            <ThreeDModelViewer scale={[2, 2, 2]} />
          </div>
          <ul className="relative z-[2] w-full my-auto">
            {NAV_ITEMS.map((item) => (
              <li key={item.to} className="w-full text-center">
                <NavLink className={mobileLinkClass} to={item.to} end={item.end} onClick={handleLinkClick}>
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </>
  );
}
