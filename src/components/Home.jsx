import React from "react";
// import ThreeDModelViewer from "./ThreeDModelViewer"; // cat model, parked for now
import HoloModelViewer from "./HoloModelViewer";

const CAREER_START = new Date(2022, 7);
const yearsOfExperience = Math.floor((Date.now() - CAREER_START.getTime()) / (365.25 * 24 * 3600 * 1000));

const STATS = [
  { value: `${yearsOfExperience}+`, label: "yrs experience" },
  { value: "5+", label: "projects delivered" },
  { value: "10+", label: "technologies" },
];

/* Default view of the content pane: the model, framed by quiet corner info. */
export default function Home() {
  return (
    <div className="relative h-[calc(100vh-3.5rem)] max-nav:h-[60vh] animate-rise motion-reduce:animate-none">
      <div className="absolute inset-0">
        <HoloModelViewer />
      </div>

      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-10 max-nav:p-6 text-ink">
        {/* top-left: statement */}
        <div>
          <p className="font-plex text-[0.72rem] tracking-[0.3em] uppercase text-accent mb-3">Hello, I am Volodymyr</p>
          <p className="max-w-[26rem] text-[clamp(1.3rem,2vw,1.7rem)] font-medium leading-snug tracking-tight">
            I build high-performance web apps, dashboards & AI-powered tools.
          </p>
        </div>

        {/* bottom: stats + model note */}
        <div className="flex items-end justify-between gap-6 flex-wrap">
          <div className="flex gap-10 max-nav:gap-6">
            {STATS.map((s) => (
              <div key={s.label}>
                <p className="text-[1.5rem] font-semibold leading-none">{s.value}</p>
                <p className="mt-1.5 font-plex text-[0.68rem] tracking-[0.12em] uppercase text-muted">{s.label}</p>
              </div>
            ))}
          </div>
          <p className="font-plex text-[0.68rem] text-faint max-nav:hidden">3D — three.js / react-three-fiber</p>
        </div>
      </div>
    </div>
  );
}
