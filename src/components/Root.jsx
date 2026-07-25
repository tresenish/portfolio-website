// Root.js
import React, { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import Footer from "./Footer";
import avatar from "../componentStyle/img/avatar.jpg";

const NAV_ITEMS = [
    { to: "/", label: "Home", end: true },
    { to: "/projects", label: "Projects" },
    { to: "/resume", label: "Resume" },
    { to: "/about", label: "About" },
    { to: "/contact", label: "Contact" },
];

const SOCIALS = [
    { icon: "fa-github", label: "GitHub", href: "https://github.com/tresenish", external: true },
    { icon: "fa-linkedin", label: "LinkedIn", href: "https://www.linkedin.com/in/volodymyr-korol/", external: true },
    { icon: "fa-instagram", label: "Instagram", href: "https://www.instagram.com/kusipka/", external: true },
    { icon: "fa-envelope", label: "Email", href: "mailto:korolvolodymyr0@gmail.com" },
    { icon: "fa-phone", label: "Phone", href: "tel:+14315883209" },
];

const navLinkClass = ({ isActive }) =>
    "group flex items-baseline gap-3 py-2 transition-colors " +
    (isActive ? "text-ink" : "text-muted hover:text-ink");

export default function Root() {
    // Toggles every 3D debug rig (checkpoint markers, debug tile, light panel);
    // reaches the scene via Outlet context. Persisted across reloads.
    const [debug, setDebug] = useState(() => localStorage.getItem("debug3d") === "1");
    const toggleDebug = () =>
        setDebug((d) => {
            localStorage.setItem("debug3d", d ? "0" : "1");
            return !d;
        });

    return (
        <div className="min-h-screen bg-page flex flex-col">
            {/* topbar */}
            <header className="sticky top-0 z-20 h-14 shrink-0 flex items-center justify-between gap-6 px-6 max-nav:px-[6%] bg-page/85 backdrop-blur border-b border-hairline">
                <NavLink to="/" className="flex items-center gap-3 group min-w-0">
                    <img
                        className="w-8 h-8 rounded-full border border-hairline object-cover shrink-0"
                        alt="avatar"
                        src={avatar}
                    />
                    <span className="min-w-0 max-nav:hidden">
                        <span className="block text-[0.92rem] font-semibold tracking-tight text-ink transition-colors group-hover:text-accent leading-tight">Volodymyr Korol</span>
                        <span className="block text-[0.68rem] text-muted leading-tight">Frontend Team Lead</span>
                    </span>
                </NavLink>

                <nav className="flex items-center gap-7 max-nav:gap-4">
                    {NAV_ITEMS.map((item, i) => (
                        <NavLink key={item.to} to={item.to} end={item.end} className={navLinkClass}>
                            {({ isActive }) => (
                                <>
                                    <span className={`font-plex text-[0.62rem] transition-colors max-nav:hidden ${isActive ? "text-accent" : "text-faint"}`}>
                                        0{i + 1}
                                    </span>
                                    <span className="text-[0.9rem]">{item.label}</span>
                                </>
                            )}
                        </NavLink>
                    ))}
                </nav>

                <div className="flex items-center gap-4 max-nav:hidden">
                    <button
                        onClick={toggleDebug}
                        title="toggle 3D debug tools"
                        className={`font-plex text-[0.62rem] border rounded px-2 py-1 transition-colors cursor-pointer ${
                            debug
                                ? "border-accent text-accent"
                                : "border-hairline text-muted hover:text-ink hover:border-accent-dim"
                        }`}
                    >
                        debug
                    </button>
                    {SOCIALS.map((s) => (
                        <a
                            key={s.label}
                            className={`fa ${s.icon} text-[1.05rem] text-muted hover:text-accent transition-colors`}
                            href={s.href}
                            {...(s.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                            aria-label={s.label}
                        ></a>
                    ))}
                </div>
            </header>

            <div className="flex flex-1 max-nav:flex-col">
                {/* sidebar parked while the full-width animation is in play */}
                {false && (
                <aside className="nav:w-[300px] nav:shrink-0 nav:sticky nav:top-0 nav:h-screen flex flex-col p-10 max-nav:p-8 max-nav:pb-6 border-r border-hairline max-nav:border-r-0 max-nav:border-b">
                    <NavLink to="/" className="flex items-center gap-4 group">
                        <img
                            className="w-12 h-12 rounded-full border border-hairline object-cover shrink-0"
                            alt="avatar"
                            src={avatar}
                        />
                        <span className="min-w-0">
                            <span className="block text-[1.1rem] font-semibold tracking-tight text-ink transition-colors group-hover:text-accent">Volodymyr Korol</span>
                            <span className="block mt-0.5 text-[0.78rem] text-muted">Frontend Team Lead</span>
                        </span>
                    </NavLink>

                    <nav className="mt-14 max-nav:mt-8 flex flex-col">
                        {NAV_ITEMS.map((item, i) => (
                            <NavLink key={item.to} to={item.to} end={item.end} className={navLinkClass}>
                                {({ isActive }) => (
                                    <>
                                        <span className={`font-plex text-[0.68rem] transition-colors ${isActive ? "text-accent" : "text-faint"}`}>
                                            0{i + 1}
                                        </span>
                                        <span className="text-[1.05rem]">{item.label}</span>
                                    </>
                                )}
                            </NavLink>
                        ))}
                    </nav>

                    <div className="mt-auto max-nav:mt-10 flex flex-col gap-4">
                        <span className="inline-flex w-fit items-center gap-2.5 rounded-full border border-hairline px-3.5 py-1.5 font-plex text-[0.7rem] text-ink-dim">
                            <span className="relative flex w-2 h-2">
                                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping motion-reduce:animate-none"></span>
                                <span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-400"></span>
                            </span>
                            Open to opportunities
                        </span>
                        <div className="flex gap-5">
                            {SOCIALS.map((s) => (
                                <a
                                    key={s.label}
                                    className={`fa ${s.icon} text-[1.3rem] text-muted hover:text-accent transition-colors`}
                                    href={s.href}
                                    {...(s.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                                    aria-label={s.label}
                                ></a>
                            ))}
                        </div>
                    </div>
                </aside>
                )}

                <main className="flex-1 min-w-0 bg-page">
                    <Outlet context={{ debug }} />
                </main>
            </div>
            <Footer />
        </div>
    )
}
