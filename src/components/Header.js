// src/components/Header.js

import React from "react";
import { NavLink } from "react-router-dom";
import "../componentStyle/Header.css";

export default function Header() {
  return (
    <div className="header">
      
      <NavLink className="nav-link" to="/home"><img id="avatar" alt="avatar" src={require("../componentStyle/avatar.jpg")} /></NavLink>
      <NavLink className="nav-link" to="/home">Home</NavLink>
      <NavLink className="nav-link" to="/projects">Projects</NavLink>
      <NavLink className="nav-link" to="/about">About</NavLink>
      <NavLink className="nav-link" to="/contact">Contact</NavLink>
    </div>
  );
}
