import React, { useEffect, useState } from "react";

const LEVEL_CLASSES = [
  "bg-hairline",
  "bg-accent/25",
  "bg-accent/45",
  "bg-accent/70",
  "bg-accent",
];

/* Renders the last year of GitHub contributions as a heatmap in theme colors. */
export default function ContributionGraph({ username }) {
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`https://github-contributions-api.jogruber.de/v4/${username}?y=last`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((json) => { if (!cancelled) setData(json); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [username]);

  if (failed) {
    return (
      <a
        className="font-plex text-[0.8rem] text-muted hover:text-accent transition-colors"
        href={`https://github.com/${username}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        github.com/{username}
      </a>
    );
  }

  if (!data) {
    return <p className="font-plex text-[0.72rem] text-faint">Loading activity…</p>;
  }

  const days = data.contributions;
  // Pad the first column so weeks align Sunday-first, like on GitHub.
  const cells = [...Array(new Date(days[0].date).getDay()).fill(null), ...days];
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  const total = data.total?.lastYear;

  return (
    <div>
      <div className="flex gap-[3px] justify-end overflow-hidden" aria-label={`GitHub contributions of ${username}`}>
        {weeks.map((week, wi) => (
          <div className="flex flex-col gap-[3px]" key={wi}>
            {week.map((day, di) =>
              day ? (
                <span
                  key={di}
                  title={`${day.date}: ${day.count} contributions`}
                  className={`w-2 h-2 rounded-[2px] ${LEVEL_CLASSES[day.level] ?? LEVEL_CLASSES[0]}`}
                />
              ) : (
                <span key={di} className="w-2 h-2" />
              )
            )}
          </div>
        ))}
      </div>
      {total != null && (
        <p className="mt-3 font-plex text-[0.72rem] text-muted">{total} contributions in the last year</p>
      )}
    </div>
  );
}
