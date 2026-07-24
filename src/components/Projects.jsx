import React, { useEffect, useState } from "react";
import SectionLabel from "./SectionLabel";
import expenseTracker from "../componentStyle/img/expense-tracker.png";
import expenseTrackerDemo from "../componentStyle/img/expenseTrackerDemo.gif";
import boardroomScreenshot from "../componentStyle/img/boardroom.png";
import mixerScreenshot from "../componentStyle/img/mixer-screenshot.png";
import mixerDemo from "../componentStyle/img/mixerDemo.gif";
import digiturnScreenshot from "../componentStyle/img/digiturn-screenshot.png";
import digiturnDemo from "../componentStyle/img/digiturnDemo.gif";
import monochromeScreenshot from "../componentStyle/img/monochrome-screenshot.png";
import monochromeDemo from "../componentStyle/img/monochromeDemo.gif";

const projectLinkClass = "text-ink hover:text-accent transition-colors";
const linkIconClass = "material-symbols-outlined text-[1.2rem] ml-1.5 text-faint";
const techPillClass =
  "font-plex text-[0.7rem] text-ink-dim border border-hairline rounded-full px-2.5 py-0.5 whitespace-nowrap";

const projects = [
  {
    title: "Boardroom",
    link: "https://board-room-app.vercel.app/",
    image: boardroomScreenshot,
    overlayImage: boardroomScreenshot,
    description: "Collaborative task management app with Kanban board",
    technologies: ["React", "TypeScript", "Tailwind CSS", "shadcn/ui", "tRPC", "Supabase", "Docker"],
    overlayDescription: `
      Built a collaborative task management app with authentication, Kanban board, real-time updates, and responsive UI.
      Features include task CRUD operations, drag-and-drop functionality, user assignment, and search capabilities.
      Developed with modern tech stack including React, TypeScript, Tailwind CSS, shadcn/ui, tRPC, Supabase, and Docker.`,
  },
  {
    title: "AI Expense tracker",
    link: "https://ai-expense-tracker-alpha.vercel.app/",
    image: expenseTracker,
    overlayImage: expenseTrackerDemo,
    description: "AI categorizes expenses, visualizes data, manages entries.",
    technologies: ["React", "Redux", "REST API", "ChatGPT API"],
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
    technologies: ["React", "REST API", "Spotify API"],
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
    technologies: ["HTML", "CSS", "jQuery", "Figma", "UI/UX"],
    overlayDescription: "Digiturn is a sophisticated and visually appealing landing page designed for a web design agency. The project showcases modern web design principles and provides a seamless user experience through the use of HTML, CSS, UI/UX best practices, JavaScript, and jQuery.",
  },
  {
    title: "Monochrome",
    link: "https://tresenish.github.io/",
    image: monochromeScreenshot,
    overlayImage: monochromeDemo,
    description: "E-commerce portfolio website",
    technologies: ["HTML", "CSS", "UI/UX"],
    overlayDescription: "Monochrome is a sleek and modern e-commerce portfolio website designed to showcase and sell products with a minimalist aesthetic. The project demonstrates proficiency in HTML, CSS, and UI/UX design, creating a seamless experience for users.",
  },
];

export default function Projects() {
  const [openIndex, setOpenIndex] = useState(null);
  const openProject = openIndex !== null ? projects[openIndex] : null;

  useEffect(() => {
    if (openIndex === null) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setOpenIndex(null);
    };
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [openIndex]);

  const handleCardKeyDown = (e, index) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpenIndex(index);
    }
  };

  return (
    <div className="max-w-[64rem] mx-auto px-[8%] pt-16 pb-20 text-ink max-nav:px-[6%] max-nav:pt-12 max-nav:pb-16">
      <header className="mb-14 max-nav:mb-10 animate-rise motion-reduce:animate-none">
        <h1 className="text-[1.5rem] font-semibold" title="Projects">Projects</h1>
        <p className="mt-2 text-[0.95rem] text-muted">Selected work — click any entry for a closer look.</p>
      </header>

      <section>
        <SectionLabel title="Selected work" />
        <ol>
          {projects.map((project, index) => (
            <li
              key={project.title}
              role="button"
              tabIndex={0}
              aria-label={`Open details for ${project.title}`}
              className="group grid nav:grid-cols-[15rem_1fr] gap-8 max-nav:gap-4 items-start py-9 border-t border-hairline first:border-t-0 first:pt-0 cursor-pointer rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent animate-rise motion-reduce:animate-none"
              style={{ animationDelay: `${0.1 + index * 0.08}s` }}
              onClick={() => setOpenIndex(index)}
              onKeyDown={(e) => handleCardKeyDown(e, index)}
            >
              <div className="rounded-xl border border-hairline overflow-hidden">
                <img
                  className="w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  alt="projectDemo"
                  src={project.image}
                />
              </div>
              <div className="flex flex-col gap-2">
                <span className="font-plex text-[0.68rem] text-faint group-hover:text-accent transition-colors">
                  0{index + 1}
                </span>
                <h2 className="flex items-center text-[1.15rem] font-medium">
                  <a
                    className={projectLinkClass}
                    href={project.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {project.title}
                  </a>
                  <span className={linkIconClass}>link</span>
                </h2>
                <p className="text-[0.9rem] text-muted leading-relaxed">{project.description}</p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {project.technologies.map((tech) => (
                    <span className={techPillClass} key={tech}>{tech}</span>
                  ))}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {openProject && (
        <div
          className="fixed inset-0 z-[5] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => setOpenIndex(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={openProject.title}
            className="relative w-[50vw] max-nav:w-[90vw] max-h-[85vh] overflow-y-auto bg-panel border border-hairline rounded-xl shadow-[0_20px_80px_rgba(0,0,0,0.6)] p-6 flex flex-col animate-rise motion-reduce:animate-none"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-4 right-4 text-muted text-2xl leading-none cursor-pointer hover:text-ink transition-colors"
              onClick={() => setOpenIndex(null)}
              aria-label="Close"
            >
              &times;
            </button>
            <h2 className="flex items-center text-[1.25rem] font-medium mb-4">
              <a
                className={projectLinkClass}
                href={openProject.link}
                target="_blank"
                rel="noopener noreferrer"
              >
                {openProject.title}
              </a>
              <span className={linkIconClass}>link</span>
            </h2>
            <img className="w-full max-h-[50vh] object-contain rounded-lg mb-4" alt="projectDemo" src={openProject.overlayImage} />
            <div className="flex flex-wrap gap-1.5 mb-4">
              {openProject.technologies.map((tech) => (
                <span className={techPillClass} key={tech}>{tech}</span>
              ))}
            </div>
            <p className="whitespace-pre-line text-[0.9rem] text-ink-dim leading-relaxed">{openProject.overlayDescription}</p>
          </div>
        </div>
      )}
    </div>
  );
}
