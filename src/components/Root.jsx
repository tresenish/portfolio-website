// Root.js
import React from "react";
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
    { icon: "fa-instagram", label: "Instagram", href: "https://www.instagram.com/tresenish/", external: true },
    { icon: "fa-envelope", label: "Email", href: "mailto:korolvolodymyr0@gmail.com" },
    { icon: "fa-phone", label: "Phone", href: "tel:+14315883209" },
];

const navLinkClass = ({ isActive }) =>
    "group flex items-baseline gap-3 py-2 transition-colors " +
    (isActive ? "text-ink" : "text-muted hover:text-ink");

export default function Root() {
    return (
        <div className="min-h-screen bg-page flex flex-col">
            <div className="flex flex-1 max-nav:flex-col">
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

                <main className="flex-1 min-w-0 bg-page">
                    <Outlet />
                </main>
            </div>
            <Footer />
        </div>
    )
}
