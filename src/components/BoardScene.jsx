// The landing board — the below-fold payoff of the hero ribbon: the same
// kind of rounded slabs that fly along the conveyor up top drop onto a big
// board here and settle into a 3×2 dashboard of projects. Screenshots fade
// onto the faces once the tiles land; hover lifts a tile off the board,
// click opens the project. Same phthalo ramp, same orthographic staging.
import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Html, Lightformer, useTexture } from "@react-three/drei";
import {
  BufferAttribute,
  CanvasTexture,
  Color,
  ExtrudeGeometry,
  Plane,
  RepeatWrapping,
  Shape,
  ShapeGeometry,
  SRGBColorSpace,
  Vector3,
} from "three";
import { useNavigate } from "react-router-dom";
import { COLORS, makeGrainTexture } from "./CuboidScene";
import { projects } from "./Projects";

const TILE_W = 3.4;
const TILE_H = 2.15;
const TILE_D = 0.14;
const SHOT_W = 3.1;   // screenshot plane inset within the tile face
const SHOT_H = 1.9;
const COLS = [-4.4, 0, 4.4];
const ROWS = [1.95, -1.95];
const HOVER_LIFT = 0.55;  // toward the camera, off the board

// Entry choreography: every tile emerges from ONE spawn point off-screen
// right (mid-height, like being dealt from a chute) and flies to its slot,
// one by one — the six paths fan out across the board. Each lands in its
// ramp color, then the face paints dark and the screenshot develops.
const ENTER_WAIT = 0.18;  // s between consecutive tiles
const ENTER_DUR = 1.05;   // s — one tile's flight
const DEPART_N = 6;       // cards that leave the U-turn for the board
// Tiles are dispensed FROM the U-turn: the first six cards of the flow ARE
// the board tiles. At its departure moment each card vanishes from the
// train (its slot stays empty — the gap keeps circulating) and the matching
// board tile continues from the card's exact pose. Departure poses are
// computed below, after the path math.
const PAINT_DELAY = 0.15; // after landing: face starts painting dark…
const PAINT_DUR = 0.45;
const SHOT_DELAY = 0.55;  // …then the screenshot develops
const SHOT_DUR = 0.5;
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const clamp01 = (t) => Math.min(1, Math.max(0, t));
const smoothstep = (t) => t * t * (3 - 2 * t);

// Dashboard reveal, before any tile shows up: two corner border lines trace
// the frame (top-left corner grows right + down, bottom-right grows left +
// up, meeting at the opposite corners), then the glass pane fades in, and
// only then do the tiles start arriving.
const BOARD_W = 13.4;
const BOARD_H = 8.6;
const BORDER_DUR = 0.75;
const PLANE_DELAY = 0.85;
const PLANE_DUR = 0.6;
const FAN_START = 0; // the U starts forming with the border trace itself
const TILES_START = FAN_START + 2.4;             // tiles peel off once the flow is well established
const INTRO_END = TILES_START + 5 * ENTER_WAIT + ENTER_DUR + SHOT_DELAY + SHOT_DUR;

const FACE_DARK = new Color("#1b1d21"); // the "screen" the shot develops on

const REDUCED_MOTION =
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const SHOW_DASH = true;        // the project dashboard
const SHOW_DEBUG_CARD = false; // rotation playground card + path markers (kept, hidden)
const SHOW_PATH_GRAPH = false; // the x/y/z graph editor panel (kept, just hidden)
// The whole conveyor (authored in centered coords) slides right as a unit,
// back to its home beside the pane — only the turn shows, tails run off-page.
const FAN_SHIFT_X = 9.1;

// The board is liquid glass (the site's card language, factory's case
// material), so the page shows through it — labels follow the page ink.
const SKINS = {
  dark: { labelInk: "#e7e9ea", labelMuted: "#8b9096" },
  light: { labelInk: "#1c1e21", labelMuted: "#5b6167" },
};

/* The path graph editor: three rows — X, Y, Z against point number 1..N —
   with draggable dots. Edits write straight into PATH_SAMPLES, which the
   flow reads every frame, so the conveyor reshapes live. "copy path" exports
   the arrays as paste-ready source. */
const GRAPH_AXES = [
  { key: "x", label: "X (screen ←→)", min: -14, max: 14, color: "#ef4444" },
  { key: "y", label: "Y (height)", min: -6, max: 6, color: "#22c55e" },
  { key: "z", label: "Z (depth)", min: -10, max: 10, color: "#3b82f6" },
];
const G_W = 820;
const G_H = 92;
const G_PAD = 10;

function PathGraphEditor({ onChange }) {
  const [, force] = useState(0);
  const dragRef = useRef(null); // { key, idx, min, max, rect }
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(null); // { key, idx } while dragging

  useEffect(() => {
    const move = (e) => {
      const d = dragRef.current;
      if (!d) return;
      const vy = 1 - (e.clientY - d.rect.top - G_PAD) / (G_H - 2 * G_PAD);
      const v = Math.min(d.max, Math.max(d.min, d.min + vy * (d.max - d.min)));
      PATH_SAMPLES[d.key][d.idx] = v;
      force((n) => n + 1);
      onChange?.();
    };
    const up = () => {
      dragRef.current = null;
      setEditing(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [onChange]);

  const copyPath = async () => {
    const fmt = (arr) => arr.map((v) => v.toFixed(3)).join(", ");
    const text = `const PATH_SAMPLES = {\n  x: [${fmt(PATH_SAMPLES.x)}],\n  y: [${fmt(PATH_SAMPLES.y)}],\n  z: [${fmt(PATH_SAMPLES.z)}],\n};`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      window.prompt("Copy path:", text);
    }
  };

  const px = (idx) => G_PAD + (idx * (G_W - 2 * G_PAD)) / (MARKER_COUNT - 1);
  const py = (v, min, max) => G_PAD + (1 - (v - min) / (max - min)) * (G_H - 2 * G_PAD);

  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-50 max-w-[94vw] overflow-x-auto rounded-md border border-hairline bg-page/95 backdrop-blur px-3 py-2 font-plex text-[0.62rem] text-ink select-none">
      <div className="mb-1 flex items-center gap-3">
        <span className="text-muted">conveyor path — drag dots; columns = points 1..{MARKER_COUNT}</span>
        <button
          onClick={copyPath}
          className="border border-hairline rounded px-2 py-0.5 text-ink-dim hover:text-ink hover:border-accent-dim transition-colors cursor-pointer"
        >
          {copied ? "copied!" : "copy path"}
        </button>
        {editing && (
          <span className="text-accent">
            editing point {editing.idx + 1} · {editing.key.toUpperCase()} ={" "}
            {PATH_SAMPLES[editing.key][editing.idx].toFixed(2)}
          </span>
        )}
      </div>
      {GRAPH_AXES.map(({ key, label, min, max, color }) => (
        <div key={key} className="flex items-center gap-2 py-0.5">
          <span className="w-20 shrink-0" style={{ color }}>{label}</span>
          <button
            onClick={() => {
              PATH_SAMPLES[key] = [...BASE_SAMPLES[key]];
              force((n) => n + 1);
              onChange?.();
            }}
            title={`reset ${key.toUpperCase()} to the original U shape`}
            className="shrink-0 border border-hairline rounded px-1.5 py-0.5 text-ink-dim hover:text-ink hover:border-accent-dim transition-colors cursor-pointer"
          >
            reset
          </button>
          <svg width={G_W} height={G_H} className="rounded border border-hairline bg-page">
            {/* zero line */}
            <line x1={G_PAD} x2={G_W - G_PAD} y1={py(0, min, max)} y2={py(0, min, max)} stroke="var(--color-hairline)" />
            <polyline
              fill="none"
              stroke={color}
              strokeWidth="1.5"
              opacity="0.7"
              points={PATH_SAMPLES[key].map((v, i) => `${px(i)},${py(v, min, max)}`).join(" ")}
            />
            {/* point numbers along the bottom; the one being edited lights up */}
            {PATH_SAMPLES[key].map((v, i) => (
              <text
                key={`t${i}`}
                x={px(i)}
                y={G_H - 1}
                textAnchor="middle"
                fontSize="7"
                fill={
                  editing?.key === key && editing?.idx === i
                    ? "var(--color-accent)"
                    : "var(--color-faint)"
                }
              >
                {i + 1}
              </text>
            ))}
            {PATH_SAMPLES[key].map((v, i) => {
              const active = editing?.key === key && editing?.idx === i;
              return (
                <circle
                  key={i}
                  cx={px(i)}
                  cy={py(v, min, max)}
                  r={active ? 6 : 4.5}
                  fill={color}
                  stroke={active ? "var(--color-ink)" : "none"}
                  strokeWidth="1.5"
                  className="cursor-ns-resize"
                  onPointerDown={(e) => {
                    setEditing({ key, idx: i });
                    dragRef.current = {
                      key,
                      idx: i,
                      min,
                      max,
                      rect: e.currentTarget.ownerSVGElement.getBoundingClientRect(),
                    };
                  }}
                >
                  <title>{`point ${i + 1}: ${v.toFixed(2)}`}</title>
                </circle>
              );
            })}
          </svg>
        </div>
      ))}
    </div>
  );
}

// One clock for the whole scene: Board, Fan, and Tiles all read the same
// value, so the card→tile handoff is frame-perfect regardless of when each
// component mounts (Tiles arrives late, behind the texture Suspense).
// Rendered as the FIRST canvas child so it advances before anyone reads.
function ClockDriver({ clockRef }) {
  useFrame((_, delta) => {
    clockRef.current += Math.min(delta, 0.1);
  });
  return null;
}

// Fill the canvas: fit the board comfortably, never crop vertically.
function FitZoom() {
  const camera = useThree((s) => s.camera);
  const width = useThree((s) => s.size.width);
  const height = useThree((s) => s.size.height);
  useEffect(() => {
    camera.zoom = Math.min(width / 21.5, height / 9.6);
    camera.updateProjectionMatrix();
  }, [camera, width, height]);
  return null;
}

/* The dashboard frame + glass pane, revealed in two beats before the tiles
   arrive: corner lines trace the border, then the pane fades in. Each edge
   bar grows from its corner by scaling along its axis while its center
   slides, so the line visibly extends out of the corner. */
const CORNER_R = 0.45;  // frame border radius
const EDGE_W = BOARD_W - 2 * CORNER_R; // straight span between corner arcs
const EDGE_H = BOARD_H - 2 * CORNER_R;
const FRAME_TH = 0.06; // frame stroke: bars and corner arcs share it exactly

// Quarter-ring with the same square cross-section as the straight bars
// (FRAME_TH wide radially × FRAME_TH deep), so corners and bars read as one
// continuous stroke — same silhouette, same flat-face shading.
function makeCornerGeometry() {
  const shape = new Shape();
  shape.absarc(0, 0, CORNER_R + FRAME_TH / 2, 0, Math.PI / 2, false);
  shape.absarc(0, 0, CORNER_R - FRAME_TH / 2, Math.PI / 2, 0, true);
  const geo = new ExtrudeGeometry(shape, { depth: FRAME_TH, bevelEnabled: false, curveSegments: 24 });
  geo.translate(0, 0, -FRAME_TH / 2); // center the depth like the bars
  return geo;
}

// The glass pane, cut to hug the frame from inside: a rounded rectangle
// whose outer edge meets the stroke's inner edge (tiny overlap so no seam)
// and whose corner radius continues the frame's arc exactly.
function roundedRectShape(w, h, r) {
  // w, h are half-extents
  const s = new Shape();
  s.moveTo(-w + r, -h);
  s.lineTo(w - r, -h);
  s.absarc(w - r, -h + r, r, -Math.PI / 2, 0);
  s.lineTo(w, h - r);
  s.absarc(w - r, h - r, r, 0, Math.PI / 2);
  s.lineTo(-w + r, h);
  s.absarc(-w + r, h - r, r, Math.PI / 2, Math.PI);
  s.lineTo(-w, -h + r);
  s.absarc(-w + r, -h + r, r, Math.PI, Math.PI * 1.5);
  return s;
}

function makePaneShape() {
  return roundedRectShape(
    BOARD_W / 2 - FRAME_TH / 2 + 0.02,
    BOARD_H / 2 - FRAME_TH / 2 + 0.02,
    CORNER_R - FRAME_TH / 2 + 0.02
  );
}

// Tile slab with the hero ribbon's corner radius (0.26): only the four face
// corners are rounded — a RoundedBox can't do that on a thin slab, its
// radius is capped by the 0.14 depth.
const TILE_R = 0.26;
function makeBoardTileGeometry() {
  const geo = new ExtrudeGeometry(roundedRectShape(TILE_W / 2, TILE_H / 2, TILE_R), {
    depth: TILE_D,
    bevelEnabled: false,
    curveSegments: 16,
  });
  geo.translate(0, 0, -TILE_D / 2);
  return geo;
}

// The card U-turn beside the pane: hero-sized cards laid tangent along a
// horseshoe path — they come in horizontally from off-page right at the top,
// wheel through a left half circle, and run out horizontally off-page right
// at the bottom. Both ends continue past the canvas edge.
const U_CX = 0;      // U-turn arc center x (y = 0) — conveyor centered on screen
const U_R = 2.4;     // arc radius
const U_OFF = 0.5;   // card centers ride slightly OUTSIDE the path, so the
                     // bases gather toward the U's inside like a gripped fan
const ARC_LEN = Math.PI * U_R;
// Constant flow, hero-conveyor style: cards ride the U forever, wrapping
// off-page. The turn is a slow zone — by conservation of flow the cards
// bunch up there, keeping the fan dense in the curve and looser on the
// straights (the hero's FAST_ZONE trick, inverted).
const U_SLOW = 0.8;                  // arc speed factor (<1 = denser)
const ARC_U = ARC_LEN / U_SLOW;      // the arc's length in uniform flow-units
// The two independent dials of the train:
const FAN_N = 42;      // how many cards ride the loop (bigger now: centering
                       // the arc means much longer off-page tails, and the
                       // loop length derives from the ring size below)
const CARD_GAP = 0.95; // flow-units between consecutive cards
// The loop is sized so the HEALED ring — the survivors after the six depart
// and the train closes ranks — fits it exactly: a full circle, no gap and no
// overlap, forever. The off-page tails absorb whatever length that needs.
// (U_TAIL must stay ≳ 2 so the wrap point remains hidden past the canvas
// edge — with the current dials it's ~3.8.)
const U_LEN = (FAN_N - DEPART_N) * CARD_GAP;
const U_TAIL = (U_LEN - ARC_U) / 2;
const PATH_LEN = 2 * U_TAIL + ARC_LEN;
const FLOW_V = 1.6;                  // cruise speed, flow-units per second
const FLOW_V0 = 8;                   // launch speed — the U forms fast…
const FLOW_TAU = 2.5;                // …then decays to cruise over ~2τ
// distance traveled after T seconds of flow: fast start, exponential decay
// down to the cruise speed
const flowDist = (T) =>
  FLOW_V * T + (FLOW_V0 - FLOW_V) * FLOW_TAU * (1 - Math.exp(-T / FLOW_TAU));

// uniform conveyor coordinate → path arc-length (slow zone stretch)
function uToS(u) {
  if (u < U_TAIL) return u;
  if (u < U_TAIL + ARC_U) return U_TAIL + (u - U_TAIL) * U_SLOW;
  return U_TAIL + ARC_LEN + (u - U_TAIL - ARC_U);
}

// position + blade angle at arc-length s (cards stay perpendicular to the
// path: up on the top tail, wheeling outward through the turn, down on the
// bottom tail) — the ANALYTIC baseline shape
function analyticPathPoint(s) {
  if (s < U_TAIL) return { x: U_CX + U_TAIL - s, y: U_R + U_OFF, rot: 0 };
  if (s > U_TAIL + ARC_LEN)
    return { x: U_CX + (s - U_TAIL - ARC_LEN), y: -U_R - U_OFF, rot: Math.PI };
  const a = Math.PI / 2 + (s - U_TAIL) / U_R;
  const r = U_R + U_OFF;
  return { x: U_CX + r * Math.cos(a), y: r * Math.sin(a), rot: a - Math.PI / 2 };
}

// ——— editable sampled path ———
// The visible stretch (marker 1 → marker N) is sampled into three editable
// arrays — x, y, z per point — that the graph editor mutates live. Between
// samples the curve is Catmull-Rom; outside (the hidden tails) it stays
// analytic. Card facing is derived from the edited curve's travel direction.
const MARKER_COUNT = 28;
const S_IN = Math.max(0, U_CX + U_TAIL - 10.9); // s where the path enters view
const S_OUT = PATH_LEN - S_IN;
// Baked from the graph editor: X/Y keep the analytic U, Z climbs gently
// through the first half, then accelerates hard through the turn's exit and
// plateaus at +10 — the outgoing cards fly close past the camera.
const PATH_SAMPLES = {
  x: [10.900, 9.813, 8.727, 7.640, 6.553, 5.467, 4.380, 3.293, 2.207, 1.120, 0.033, -1.232, -2.256, -2.826, -2.826, -2.256, -1.232, 0.033, 1.120, 2.207, 3.293, 4.380, 5.467, 6.553, 7.640, 8.727, 9.813, 10.900],
  y: [2.900, 2.900, 2.900, 2.900, 2.900, 2.900, 2.900, 2.900, 2.900, 2.900, 2.900, 2.625, 1.822, 0.651, -0.651, -1.822, -2.625, -2.900, -2.900, -2.900, -2.900, -2.900, -2.900, -2.900, -2.900, -2.900, -2.900, -2.900],
  // depth rises steadily to its peak at the turn (point 15), then drops
  // just as steadily back to -8 by the exit — symmetric approach/retreat,
  // and the off-page wrap has no z jump (both ends at -8)
  z: [-8.000, -7.407, -6.815, -6.222, -5.630, -5.037, -4.444, -3.852, -3.259, -2.667, -2.074, -1.481, -0.889, -0.296, 0.296, -0.342, -0.980, -1.618, -2.257, -2.895, -3.533, -4.171, -4.809, -5.447, -6.086, -6.724, -7.362, -8.000],
};
// frozen copy of the analytic baseline, for per-axis resets in the editor
const BASE_SAMPLES = {
  x: [...PATH_SAMPLES.x],
  y: [...PATH_SAMPLES.y],
  z: [...PATH_SAMPLES.z],
};

// Catmull-Rom through an array at 0-based position t (clamped at the ends)
function sampleArr(arr, t) {
  const n = arr.length;
  if (t <= 0) return arr[0];
  if (t >= n - 1) return arr[n - 1];
  const i = Math.floor(t);
  const f = t - i;
  const y0 = arr[Math.max(0, i - 1)];
  const y1 = arr[i];
  const y2 = arr[i + 1];
  const y3 = arr[Math.min(n - 1, i + 2)];
  return (
    y1 +
    0.5 * f * (y2 - y0 + f * (2 * y0 - 5 * y1 + 4 * y2 - y3 + f * (3 * (y1 - y2) + y3 - y0)))
  );
}

function pathPoint(s) {
  if (s <= S_IN || s >= S_OUT) {
    // hidden tails: analytic x/y, depth clamped to the sampled endpoints so
    // there's no z jump at the canvas edge
    const p = analyticPathPoint(s);
    return { ...p, z: s <= S_IN ? PATH_SAMPLES.z[0] : PATH_SAMPLES.z[MARKER_COUNT - 1] };
  }
  const t = ((s - S_IN) / (S_OUT - S_IN)) * (MARKER_COUNT - 1);
  const x = sampleArr(PATH_SAMPLES.x, t);
  const y = sampleArr(PATH_SAMPLES.y, t);
  const z = sampleArr(PATH_SAMPLES.z, t);
  // facing = travel direction − 180°, matching the analytic convention
  const t2 = Math.min(MARKER_COUNT - 1, t + 0.25);
  const dx = sampleArr(PATH_SAMPLES.x, t2) - x;
  const dy = sampleArr(PATH_SAMPLES.y, t2) - y;
  const rot = Math.atan2(dy, dx) - Math.PI;
  return { x, y, z, rot };
}

// Departure choreography: where each of the first six cards is at the
// moment it leaves the flow. The board tile spawns exactly there (converted
// into the board group's shifted coords) with its long axis aligned to the
// card's — the minimal turn from card-portrait to tile-landscape.
// The first six cards of the train — the actual leaders, in roll-in order —
// leave for the board. Each departure leaves a momentary gap that the
// following cards CLOSE UP (they catch forward one spacing, conveyor-style),
// so the circle heals itself instead of carrying a hole. Because the loop
// length equals the healed train exactly (see U_LEN), the end state is a
// perfect uninterrupted ring.
const CLOSE_DELAY = 0.6; // after a card departs, the follower waits a beat…
const CLOSE_DUR = 1.4;   // …then glides forward to close the gap
const departTime = (i) => TILES_START + i * ENTER_WAIT;
// how much card i has closed up by time t (gaps from departures ahead of it)
const closure = (t, i) => {
  let c = 0;
  const n = Math.min(i, DEPART_N);
  for (let j = 0; j < n; j++) {
    c += smoothstep(clamp01((t - departTime(j) - CLOSE_DELAY) / CLOSE_DUR));
  }
  return c * CARD_GAP;
};
const DEPART_POSE = Array.from({ length: DEPART_N }, (_, i) => {
  const u = flowDist(departTime(i) - FAN_START) - i * CARD_GAP + closure(departTime(i), i);
  const s = uToS(((u % U_LEN) + U_LEN) % U_LEN);
  const p = pathPoint(s);
  let rot = (((p.rot + Math.PI / 2) % Math.PI) + Math.PI) % Math.PI;
  if (rot > Math.PI / 2) rot -= Math.PI;
  // direction of travel at the departure point (numeric, so it follows the
  // edited path) — the flight's bezier control point continues along it, so
  // the tile PEELS off the flow instead of reversing on the spot
  const q = pathPoint(Math.min(PATH_LEN, s + 0.3));
  let dirX = q.x - p.x;
  let dirY = q.y - p.y;
  const dl = Math.hypot(dirX, dirY) || 1;
  dirX /= dl;
  dirY /= dl;
  // → board-tile local coords: conveyor group shift + board group shift
  const x = p.x + FAN_SHIFT_X + 2.8;
  return {
    x,
    y: p.y,
    z: p.z,
    rot,
    cx: x + dirX * 2.2,
    cy: p.y + dirY * 2.2,
  };
});

function makeFanTileGeometry() {
  // a touch under hero size (~3.2 × 2.9... held portrait as a card)
  const geo = new ExtrudeGeometry(roundedRectShape(1.0, 1.55, 0.24), {
    depth: 0.1,
    bevelEnabled: false,
    curveSegments: 16,
  });
  geo.translate(0, 0, -0.05);
  return geo;
}

// The hero tiles' baseline pose, mirrored for this scene's +z camera: the
// parent group already supplies the pitch (its -0.22 lean), so each card
// only adds the twist that shows its edge to the camera.
const CARD_TILT = -0.45;

// Rotation choreography along the path, hero-style: keyframes by point
// number (1..MARKER_COUNT, same numbers as the markers and graphs), blended
// over KEY_FADE points on either side. rot = [x, y, z] radians, straight
// from the debug card's copy button. Angles blend via the nearest arc, so a
// keyframe equivalent to the baseline doesn't cause a full spin.
const ROT_KEYFRAMES = [
  // 8→15 refit for even motion: X accelerates smoothly into the flip
  // (16° → 44° → 82° → 108°), Y sweeps linearly (−18° → +18°), Z advances
  // at a near-constant rate — same landing pose at 15 as authored
  { pos: 10, rot: [0.28, -0.314, 0.397] },
  { pos: 12, rot: [0.77, -0.105, 0.95] },
  { pos: 14, rot: [1.43, 0.105, 1.4] },
  { pos: 15, rot: [1.888, 0.314, 1.533] },   // past flat at the far point, tilted open
  // 15→20 refit for even motion: X rolls on at a steady ~16°/pt easing to
  // the 180° landing, Y glides gently from +18° to the mirrored +25.8°,
  // Z unwinds at a near-constant ~17°/pt down to zero — the exit mirrors
  // the entry: the START pose flipped 180°, back to the camera, held out
  { pos: 16, rot: [2.164, 0.358, 1.239] },
  { pos: 17, rot: [2.443, 0.393, 0.925] },
  { pos: 18, rot: [2.723, 0.424, 0.611] },
  // your 16→18 motion continued at its own pace: X finishes the half-flip
  // (180°), Y settles on the start tilt mirrored (+0.45), Z unwinds to zero
  // — the start pose, reverted — landing at 20 and holding to the exit
  { pos: 20, rot: [3.141, 0.45, -6.283] },
  { pos: 28, rot: [3.141, 0.45, -6.283] },
];
const KEY_FADE = 3;
const normAngle = (a) => ((((a + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI;
const pointOf = (s) => 1 + ((s - S_IN) / (S_OUT - S_IN)) * (MARKER_COUNT - 1);
// hero-style: interpolate BETWEEN neighboring keyframes while inside the
// choreography, fade to/from the flowing baseline only at its outer edges —
// so holds between keyframes stay solid instead of sagging toward baseline
function cardRotation(s, baseZ) {
  const base = [0, CARD_TILT, baseZ];
  const kfs = ROT_KEYFRAMES;
  if (!kfs.length) return base;
  const n = pointOf(s);
  const first = kfs[0];
  const last = kfs[kfs.length - 1];
  const mix = (a, b, t) => a.map((v, i) => v + normAngle(b[i] - v) * t);
  if (n <= first.pos - KEY_FADE || n >= last.pos + KEY_FADE) return base;
  if (n < first.pos) return mix(base, first.rot, smoothstep((n - (first.pos - KEY_FADE)) / KEY_FADE));
  if (n > last.pos) return mix(last.rot, base, smoothstep((n - last.pos) / KEY_FADE));
  for (let k = 0; k < kfs.length - 1; k++) {
    const a = kfs[k];
    const b = kfs[k + 1];
    if (n >= a.pos && n <= b.pos) {
      return mix(a.rot, b.rot, smoothstep((n - a.pos) / (b.pos - a.pos)));
    }
  }
  return base;
}

/* Debug card — the hero section's rotation tile, adapted: a lone fan card
   on the left with grabbable world-axis handles. Drag a colored bar (or the
   blue ring for Z) to rotate, scrub the axis labels or type exact degrees
   in the panel, mouse-wheel over the card to roll. Copy exports the pose
   with an optional checkpoint number for pasting into conversation. */
const AXIS_COLORS = { x: "#ef4444", y: "#22c55e", z: "#3b82f6" };
const AXIS_NAMES = { x: "pitch", y: "tilt", z: "roll" };

// Every face/edge of the debug card gets its own color so orientation is
// unambiguous (named for the card at rest, camera on +z).
const CARD_SIDE_COLORS = {
  front: "#d946ef",  // +z — broad face toward the camera (magenta)
  back: "#06b6d4",   // -z — broad face away (cyan)
  top: "#f8fafc",    // +y — top edge (white)
  bottom: "#1e293b", // -y — bottom edge (dark slate)
  right: "#f97316",  // +x — right edge (orange)
  left: "#8b5cf6",   // -x — left edge (violet)
};
const CARD_SIDE_LEGEND = {
  front: "front face",
  back: "back face",
  top: "top edge",
  bottom: "bottom edge",
  right: "right edge",
  left: "left edge",
};

function makeDebugCardGeometry() {
  const geo = makeFanTileGeometry();
  const normal = geo.attributes.normal;
  const colors = new Float32Array(normal.count * 3);
  const c = new Color();
  for (let i = 0; i < normal.count; i++) {
    const nx = normal.getX(i);
    const ny = normal.getY(i);
    const nz = normal.getZ(i);
    const ax = Math.abs(nx);
    const ay = Math.abs(ny);
    const az = Math.abs(nz);
    let side;
    if (az >= ax && az >= ay) side = nz > 0 ? "front" : "back";
    else if (ax >= ay) side = nx > 0 ? "right" : "left";
    else side = ny > 0 ? "top" : "bottom";
    c.set(CARD_SIDE_COLORS[side]);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute("color", new BufferAttribute(colors, 3));
  return geo;
}

function DraggablePanel({ children }) {
  const [off, setOff] = useState({ x: 0, y: 0 });
  const drag = useRef(null); // { px, py, ox, oy }
  useEffect(() => {
    const move = (e) => {
      const d = drag.current;
      if (!d) return;
      setOff({ x: d.ox + e.clientX - d.px, y: d.oy + e.clientY - d.py });
    };
    const up = () => {
      drag.current = null;
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, []);
  return (
    <div className="relative" style={{ transform: `translate(${off.x}px, ${off.y}px)` }}>
      <div
        onPointerDown={(e) => {
          e.stopPropagation();
          drag.current = { px: e.clientX, py: e.clientY, ox: off.x, oy: off.y };
        }}
        title="drag to move this box"
        className="absolute -top-1.5 -left-1.5 z-10 w-3.5 h-3.5 rounded-full bg-page border-2 border-accent-dim hover:border-accent cursor-move"
      />
      {children}
    </div>
  );
}

function AxisHandle({ axis, onPointerDown }) {
  const hoverProps = {
    onPointerDown,
    onPointerOver: () => (document.body.style.cursor = "grab"),
    onPointerOut: () => (document.body.style.cursor = ""),
  };
  if (axis === "z") {
    return (
      <mesh {...hoverProps}>
        <torusGeometry args={[1.6, 0.06, 12, 64]} />
        <meshBasicMaterial color={AXIS_COLORS.z} transparent opacity={0.9} />
      </mesh>
    );
  }
  return (
    <group rotation={axis === "x" ? [0, 0, -Math.PI / 2] : [0, 0, 0]}>
      <mesh position={[0, 1.4, 0]} {...hoverProps}>
        <cylinderGeometry args={[0.08, 0.08, 2.8, 12]} />
        <meshBasicMaterial color={AXIS_COLORS[axis]} transparent opacity={0.9} />
      </mesh>
    </group>
  );
}

function DebugCard({ position = [-7.6, 0.8, 2], picked }) {
  const geometry = useMemo(() => makeDebugCardGeometry(), []);
  const [rot, setRot] = useState({ x: 0, y: CARD_TILT, z: 0 });
  const [checkpoint, setCheckpoint] = useState("");
  const drag = useRef(null); // { axis, px, py, scale }

  // a clicked path point loads that position's live pose into the card
  useEffect(() => {
    if (!picked) return;
    setRot({ x: picked.pose[0], y: picked.pose[1], z: picked.pose[2] });
    setCheckpoint(String(picked.n));
  }, [picked]);

  useEffect(() => {
    const onMove = (e) => {
      const d = drag.current;
      if (!d) return;
      const dx = e.clientX - d.px;
      const dy = e.clientY - d.py;
      d.px = e.clientX;
      d.py = e.clientY;
      setRot((r) => ({ ...r, [d.axis]: r[d.axis] + (dx - dy) * d.scale }));
    };
    const onUp = () => {
      drag.current = null;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  const startDrag = (axis, scale) => (e) => {
    e.stopPropagation();
    if (e.preventDefault) e.preventDefault();
    drag.current = { axis, px: e.clientX, py: e.clientY, scale };
  };

  const setDegrees = (axis) => (e) => {
    const v = parseFloat(e.target.value);
    if (!Number.isNaN(v)) setRot((r) => ({ ...r, [axis]: (v * Math.PI) / 180 }));
  };

  const [copied, setCopied] = useState(false);
  const copyRotation = async () => {
    const deg = (v) => ((v * 180) / Math.PI).toFixed(1);
    const rad = (v) => v.toFixed(3);
    const text =
      `card at point ${checkpoint || "?"}: ` +
      `X ${deg(rot.x)}deg (${rad(rot.x)} rad), ` +
      `Y ${deg(rot.y)}deg (${rad(rot.y)} rad), ` +
      `Z ${deg(rot.z)}deg (${rad(rot.z)} rad)`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      window.prompt("Copy:", text);
    }
  };

  return (
    <group position={position}>
      <AxisHandle axis="x" onPointerDown={startDrag("x", 0.01)} />
      <AxisHandle axis="y" onPointerDown={startDrag("y", 0.01)} />
      <AxisHandle axis="z" onPointerDown={startDrag("z", 0.01)} />

      <group rotation={[rot.x, rot.y, rot.z]}>
        <mesh
          geometry={geometry}
          onWheel={(e) => {
            e.stopPropagation();
            setRot((r) => ({ ...r, z: r.z + e.deltaY * 0.002 }));
          }}
        >
          <meshLambertMaterial vertexColors transparent opacity={0.95} />
        </mesh>
      </group>

      {/* panel tucked into the top-left corner so its DOM box never sits
          over the arc's clickable markers (13–16 live just right of it) */}
      <Html position={[-2.9, 3.9, 0]} style={{ whiteSpace: "nowrap" }} zIndexRange={[50, 41]}>
        <DraggablePanel>
          <div className="font-plex text-[0.7rem] leading-relaxed text-ink bg-page/80 border border-hairline rounded-md px-3 py-1.5 select-none">
            {["x", "y", "z"].map((axis) => (
              <div key={axis} className="flex items-center gap-2 py-0.5">
                <span
                  className="w-16 cursor-ew-resize"
                  style={{ color: AXIS_COLORS[axis] }}
                  onPointerDown={startDrag(axis, 0.005)}
                  title="drag to scrub"
                >
                  {axis.toUpperCase()} ({AXIS_NAMES[axis]})
                </span>
                <input
                  type="number"
                  step="1"
                  value={((rot[axis] * 180) / Math.PI).toFixed(1)}
                  onChange={setDegrees(axis)}
                  className="w-16 bg-transparent border border-hairline rounded px-1 py-0.5 text-ink"
                />
                <span className="text-muted">° | {rot[axis].toFixed(3)} rad</span>
              </div>
            ))}
            <div className="mt-1.5 pt-1.5 border-t border-hairline flex items-center gap-2">
              <span className="text-muted">at pos</span>
              <input
                type="number"
                value={checkpoint}
                onChange={(e) => setCheckpoint(e.target.value)}
                placeholder="14"
                className="w-12 bg-transparent border border-hairline rounded px-1 py-0.5 text-ink"
              />
              <button
                onClick={copyRotation}
                className="border border-hairline rounded px-2 py-0.5 text-ink-dim hover:text-ink hover:border-accent-dim transition-colors cursor-pointer"
              >
                {copied ? "copied!" : "copy"}
              </button>
              <button
                onClick={() => setRot({ x: 0, y: CARD_TILT, z: 0 })}
                title="back to the flow cards' baseline pose"
                className="border border-hairline rounded px-2 py-0.5 text-ink-dim hover:text-ink hover:border-accent-dim transition-colors cursor-pointer"
              >
                reset
              </button>
            </div>
            {/* which color is which side */}
            <div className="mt-1.5 pt-1.5 border-t border-hairline grid grid-cols-3 gap-x-3">
              {Object.entries(CARD_SIDE_LEGEND).map(([side, label]) => (
                <div key={side} className="flex items-center gap-1.5">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-sm border border-hairline"
                    style={{ backgroundColor: CARD_SIDE_COLORS[side] }}
                  ></span>
                  <span className="text-muted">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </DraggablePanel>
      </Html>
    </group>
  );
}

/* Numbered reference points, one per editable path sample (canvas edge →
   top tail → around the turn → bottom tail → canvas edge), for directing
   path edits by number. They re-place themselves when the editor changes
   the path (version bump). */
function PathMarkers({ onPick, version = 0 }) {
  const points = useMemo(
    () =>
      Array.from({ length: MARKER_COUNT }, (_, k) => {
        const s = S_IN + ((S_OUT - S_IN) * k) / (MARKER_COUNT - 1);
        const p = pathPoint(s);
        // the FULL pose a card wears here — baseline + rotation keyframes —
        // so clicking a marker shows the true rotation
        return { n: k + 1, x: p.x, y: p.y, z: p.z, pose: cardRotation(s, p.rot) };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version]
  );
  return points.map(({ n, x, y, z, pose }) => (
    // ride the path's own depth (+0.7 proud of the cards) so dot, hit area,
    // and the spot you SEE all line up even where the path dives in z
    <group key={n} position={[x, y, z + 0.7]}>
      <mesh renderOrder={10}>
        <sphereGeometry args={[0.09, 12, 12]} />
        <meshBasicMaterial color="#facc15" depthTest={false} />
      </mesh>
      {/* fat invisible hit area: click a point to load its live rotation
          into the debug card */}
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onPick?.({ n, pose });
        }}
        onPointerOver={() => (document.body.style.cursor = "pointer")}
        onPointerOut={() => (document.body.style.cursor = "")}
      >
        <sphereGeometry args={[0.36, 8, 8]} />
        <meshBasicMaterial visible={false} />
      </mesh>
      <Html center position={[0, -0.45, 0]} zIndexRange={[40, 30]} style={{ pointerEvents: "none" }}>
        <div className="font-plex text-[0.62rem] text-ink bg-page/70 rounded px-1 leading-tight select-none">{n}</div>
      </Html>
    </group>
  ));
}

function Fan({ clockRef }) {
  const cardRefs = useRef([]);
  const geometry = useMemo(() => makeFanTileGeometry(), []);
  const grain = useMemo(
    () => ({
      relief: makeGrainTexture(), // mid-grey, strong — roughness
      color: makeGrainTexture({ base: 246, amp: 9 }), // near-white, subtle — albedo
    }),
    []
  );
  useFrame(() => {
    const t = clockRef.current;
    // the U forms by itself: the train enters the path card by card from
    // the top tail and rides around until the loop is full — no card is
    // placed, they all ARRIVE. After the lead card laps, it wraps to the
    // back and the steady flow just runs.
    const T = Math.max(0, t - FAN_START);
    cardRefs.current.forEach((g, i) => {
      if (!g) return;
      // the first six cards — the actual leaders — depart for the board;
      // everyone behind closes ranks via closure()
      if (i < DEPART_N && t >= departTime(i)) {
        g.visible = false;
        return;
      }
      const u = flowDist(T) - i * CARD_GAP + closure(t, i);
      g.visible = u >= 0;
      if (u < 0) return;
      const s = uToS(u % U_LEN);
      const p = pathPoint(s);
      // depth follows path progress: cards higher on the U stay closest to
      // the camera, so the hand always layers top → bottom, even mid-flow
      g.position.set(p.x, p.y, p.z);
      // baseline pose (hero twist + path facing) shaped by the rotation
      // keyframes along the path
      const [rx, ry, rz] = cardRotation(s, p.rot);
      g.rotation.set(rx, ry, rz);
    });
  });
  return (
    <group>
      {Array.from({ length: FAN_N }, (_, i) => (
        <group key={i} ref={(g) => (cardRefs.current[i] = g)}>
          {/* raycast disabled: the flow cards are decoration and must never
              swallow clicks meant for the path markers */}
          <mesh geometry={geometry} castShadow raycast={() => {}}>
            {/* the hero tiles' exact surface: grainy matte with speckled
                albedo, so raking light shows texture instead of flat fill */}
            <meshStandardMaterial
              color={COLORS[(i * 3) % COLORS.length]}
              map={grain.color}
              roughnessMap={grain.relief}
              roughness={0.85}
              metalness={0}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function makePaneGeometry() {
  const geo = new ExtrudeGeometry(makePaneShape(), { depth: 0.3, bevelEnabled: false, curveSegments: 24 });
  geo.translate(0, 0, -0.15); // center the depth
  return geo;
}

// Railway-style dot grid living on the pane's face: a tiny dot tile
// repeated in world units (ShapeGeometry UVs are the shape's own coords).
const DOT_SPACING = 0.6; // world units between dots
function makeDotTexture(theme) {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = theme === "light" ? "rgba(28,30,33,0.20)" : "rgba(231,233,234,0.16)";
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, 3.2, 0, Math.PI * 2);
  ctx.fill();
  const tex = new CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.repeat.set(1 / DOT_SPACING, 1 / DOT_SPACING);
  tex.anisotropy = 4;
  return tex;
}

// Diagonal dot-grid reveal: a clipping plane sweeps the grid in from the
// top-left corner toward bottom-right, continuing the border trace's motion.
const DOTS_DELAY = PLANE_DELAY + 0.3;
const DOTS_DUR = 0.8;
const DOTS_SWEEP = (BOARD_W + BOARD_H) / 2 / Math.SQRT2 + 0.5;

function Board({ theme, clockRef }) {
  const glassRef = useRef();
  const shadowRef = useRef();
  const edgeRefs = useRef([]);   // top, left, bottom, right
  const cornerRefs = useRef([]); // tl, br (origins) then tr, bl (meeting points)
  const chromeMats = useRef([]); // window-chrome materials, fade with the pane
  const [chromeIn, setChromeIn] = useState(REDUCED_MOTION);
  // Frame and pane sit close to the page's card language: hairline-dark
  // border, page-tinted translucent glass (the 2D cards' bg-page/60 recipe).
  const frameColor = theme === "light" ? "#c2c8cf" : "#3d4148";
  const glassTarget = theme === "light" ? 0.55 : 0.55;
  const shadowTarget = theme === "light" ? 0.16 : 0.32;
  const cornerGeometry = useMemo(() => makeCornerGeometry(), []);
  const paneGeometry = useMemo(() => makePaneGeometry(), []);
  const dotsGeometry = useMemo(() => new ShapeGeometry(makePaneShape(), 24), []);
  const dotTexture = useMemo(() => makeDotTexture(theme), [theme]);
  // normal (-1, 1, 0): as the constant grows, the visible half-space expands
  // from the top-left corner across to bottom-right
  const dotsClip = useMemo(() => new Plane(new Vector3(-1, 1, 0).normalize(), -DOTS_SWEEP), []);

  useFrame(() => {
    const t = clockRef.current;
    const f = Math.max(0.001, smoothstep(clamp01(t / BORDER_DUR)));
    const [top, left, bottom, right] = edgeRefs.current;
    if (top) {
      // top-left corner: top edge grows rightward, left edge grows downward
      top.scale.x = f;
      top.position.x = -BOARD_W / 2 + CORNER_R + (EDGE_W * f) / 2;
      left.scale.y = f;
      left.position.y = BOARD_H / 2 - CORNER_R - (EDGE_H * f) / 2;
      // bottom-right corner: bottom edge grows leftward, right edge upward
      bottom.scale.x = f;
      bottom.position.x = BOARD_W / 2 - CORNER_R - (EDGE_W * f) / 2;
      right.scale.y = f;
      right.position.y = -BOARD_H / 2 + CORNER_R + (EDGE_H * f) / 2;
    }
    // corner arcs: the two origin corners pop first, the two meeting
    // corners bloom as the lines arrive to close the rectangle
    const s0 = smoothstep(clamp01(t / 0.15));
    const s1 = smoothstep(clamp01((t - BORDER_DUR * 0.8) / (BORDER_DUR * 0.25)));
    cornerRefs.current.forEach((c, idx) => {
      if (c) c.scale.setScalar(Math.max(0.001, idx < 2 ? s0 : s1));
    });
    const g = smoothstep(clamp01((t - PLANE_DELAY) / PLANE_DUR));
    if (glassRef.current) glassRef.current.opacity = glassTarget * g;
    if (shadowRef.current) shadowRef.current.opacity = shadowTarget * g;
    // window chrome (lights + separator) materializes with the pane
    chromeMats.current.forEach((m) => {
      if (m) m.opacity = (m.userData.tg ?? 1) * g;
    });
    if (t > PLANE_DELAY + PLANE_DUR * 0.7 && !chromeIn) setChromeIn(true);
    // sweep the dot grid in behind the glass fade
    const d = smoothstep(clamp01((t - DOTS_DELAY) / DOTS_DUR));
    dotsClip.constant = -DOTS_SWEEP + 2 * DOTS_SWEEP * d;
  });

  return (
    <>
      {/* border frame: four thin bars drawn from two corners, joined by
          quarter-circle arcs — the frame's border radius */}
      {[
        { key: "top", args: [EDGE_W, FRAME_TH, FRAME_TH], pos: [0, BOARD_H / 2, -0.12] },
        { key: "left", args: [FRAME_TH, EDGE_H, FRAME_TH], pos: [-BOARD_W / 2, 0, -0.12] },
        { key: "bottom", args: [EDGE_W, FRAME_TH, FRAME_TH], pos: [0, -BOARD_H / 2, -0.12] },
        { key: "right", args: [FRAME_TH, EDGE_H, FRAME_TH], pos: [BOARD_W / 2, 0, -0.12] },
      ].map((e, i) => (
        <mesh key={e.key} ref={(m) => (edgeRefs.current[i] = m)} position={e.pos}>
          <boxGeometry args={e.args} />
          <meshStandardMaterial color={frameColor} roughness={0.5} metalness={0.3} envMapIntensity={0.45} />
        </mesh>
      ))}
      {[
        { key: "tl", x: -BOARD_W / 2 + CORNER_R, y: BOARD_H / 2 - CORNER_R, rz: Math.PI / 2 },
        { key: "br", x: BOARD_W / 2 - CORNER_R, y: -BOARD_H / 2 + CORNER_R, rz: -Math.PI / 2 },
        { key: "tr", x: BOARD_W / 2 - CORNER_R, y: BOARD_H / 2 - CORNER_R, rz: 0 },
        { key: "bl", x: -BOARD_W / 2 + CORNER_R, y: -BOARD_H / 2 + CORNER_R, rz: Math.PI },
      ].map((c, i) => (
        <mesh
          key={c.key}
          ref={(m) => (cornerRefs.current[i] = m)}
          geometry={cornerGeometry}
          position={[c.x, c.y, -0.12]}
          rotation={[0, 0, c.rz]}
        >
          <meshStandardMaterial color={frameColor} roughness={0.5} metalness={0.3} envMapIntensity={0.45} />
        </mesh>
      ))}
      {/* railway-style dot grid on the pane's face, swept in diagonally by
          the clipping plane */}
      <mesh geometry={dotsGeometry} position={[0, 0, -0.165]}>
        <meshBasicMaterial
          map={dotTexture}
          transparent
          depthWrite={false}
          clippingPlanes={[dotsClip]}
          toneMapped={false}
        />
      </mesh>
      {/* the board: one big liquid-glass pane, edge-to-edge with the frame */}
      <mesh geometry={paneGeometry} position={[0, 0, -0.32]}>
        <meshPhysicalMaterial
          ref={glassRef}
          color={theme === "light" ? "#ffffff" : "#17181b"}
          transparent
          opacity={0}
          roughness={0.08}
          metalness={0}
          envMapIntensity={theme === "light" ? 0.9 : 0.5}
          depthWrite={false}
        />
      </mesh>
      {/* invisible catcher just in front of the glass so the tiles'
          shadows still ground them on the board */}
      <mesh position={[0, 0, -0.13]} receiveShadow>
        <planeGeometry args={[13.0, 8.2]} />
        <shadowMaterial ref={shadowRef} transparent opacity={0} />
      </mesh>

      {/* window chrome: traffic lights, centered title, and a hairline
          separator across the header — the pane reads as a real app window
          (same language as the factory's monitor station) */}
      {["#ff5f57", "#febc2e", "#28c840"].map((c, i) => (
        <mesh
          key={c}
          position={[-BOARD_W / 2 + 0.55 + i * 0.3, BOARD_H / 2 - 0.46, -0.14]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <cylinderGeometry args={[0.068, 0.068, 0.02, 20]} />
          <meshStandardMaterial
            ref={(m) => {
              if (m) m.userData.tg = 1;
              chromeMats.current[i] = m;
            }}
            color={c}
            roughness={0.35}
            transparent
            opacity={0}
          />
        </mesh>
      ))}
      <mesh position={[0, BOARD_H / 2 - 0.82, -0.14]}>
        <boxGeometry args={[BOARD_W - 0.5, 0.018, 0.018]} />
        <meshStandardMaterial
          ref={(m) => {
            if (m) m.userData.tg = 0.85;
            chromeMats.current[3] = m;
          }}
          color={frameColor}
          roughness={0.5}
          metalness={0.3}
          transparent
          opacity={0}
        />
      </mesh>
      <Html
        center
        position={[0, BOARD_H / 2 - 0.46, -0.14]}
        zIndexRange={[10, 0]}
        style={{ pointerEvents: "none" }}
      >
        <p
          className={`font-plex text-[0.6rem] tracking-[0.22em] uppercase whitespace-nowrap select-none transition-opacity duration-700 ${
            chromeIn ? "opacity-100" : "opacity-0"
          }`}
          style={{ color: theme === "light" ? "#5b6167" : "#8b9096" }}
        >
          volodymyr — selected work
        </p>
      </Html>
    </>
  );
}

/* The six tiles: five projects + the "all projects" slab. Owns the drop
   clock, hover lifts, and the wake-up of screenshots and labels. */
function Tiles({ skin, navigate, clockRef }) {
  const shown = projects.slice(0, 5);
  const textures = useTexture(shown.map((p) => p.image));

  // sRGB + cover-crop each screenshot to the plane's aspect (like CSS
  // object-fit: cover), so nothing is squashed
  useEffect(() => {
    textures.forEach((tex) => {
      tex.colorSpace = SRGBColorSpace;
      const img = tex.image;
      if (!img) return;
      const imgAspect = img.width / img.height;
      const planeAspect = SHOT_W / SHOT_H;
      if (imgAspect > planeAspect) {
        tex.repeat.set(planeAspect / imgAspect, 1);
        tex.offset.set((1 - tex.repeat.x) / 2, 0);
      } else {
        tex.repeat.set(1, imgAspect / planeAspect);
        tex.offset.set(0, (1 - tex.repeat.y) / 2);
      }
      tex.needsUpdate = true;
    });
  }, [textures]);

  // slot layout (row-major), stride-ordered ramp colors like the ribbon,
  // and a random tumble that eases out as each tile lands
  const tiles = useMemo(
    () =>
      [...shown.map((p, i) => ({ project: p, tex: textures[i] })), { all: true }].map((t, i) => ({
        ...t,
        x: COLS[i % 3],
        y: ROWS[Math.floor(i / 3)],
        // wear the SOURCE extra-card's color, so the handoff keeps its paint
        color: new Color(COLORS[(i * 3) % COLORS.length]),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [textures]
  );

  const tileGeometry = useMemo(() => makeBoardTileGeometry(), []);
  const groupRefs = useRef([]);
  const tileMatRefs = useRef([]);
  const shotMatRefs = useRef([]);
  const liftsRef = useRef(new Float32Array(6));
  const hoveredRef = useRef(null);
  const [landed, setLanded] = useState(REDUCED_MOTION);

  useFrame((_, delta) => {
    const intro = clockRef.current;
    const lifts = liftsRef.current;
    const ease = Math.min(1, delta * 9);
    tiles.forEach((t, i) => {
      const g = groupRefs.current[i];
      if (!g) return;
      const wait = departTime(i);
      // hidden until its U-turn card departs — then it takes over from the
      // card's exact pose, so the swap is invisible
      g.visible = intro >= wait;
      if (!g.visible) return;
      const k = easeOutCubic(clamp01((intro - wait) / ENTER_DUR));
      const target = hoveredRef.current === i && k >= 1 ? HOVER_LIFT : 0;
      lifts[i] += (target - lifts[i]) * ease;
      const d = DEPART_POSE[i];
      // quadratic bezier: the control point continues the flow direction,
      // so the tile arcs away from the U instead of snapping toward its slot
      const b = 1 - k;
      g.position.set(
        b * b * d.x + 2 * b * k * d.cx + k * k * t.x,
        b * b * d.y + 2 * b * k * d.cy + k * k * t.y,
        d.z * (1 - k) + lifts[i]
      );
      // card tilt and long-axis alignment unwind during the flight
      g.rotation.set(0, CARD_TILT * (1 - k), d.rot * (1 - k));
      // after landing the face paints dark…
      const mat = tileMatRefs.current[i];
      if (mat && !t.all) {
        const paint = clamp01((intro - wait - ENTER_DUR - PAINT_DELAY) / PAINT_DUR);
        mat.color.lerpColors(t.color, FACE_DARK, paint * paint * (3 - 2 * paint));
      }
      // …then the screenshot develops on it
      const shot = shotMatRefs.current[i];
      if (shot) shot.opacity = clamp01((intro - wait - ENTER_DUR - SHOT_DELAY) / SHOT_DUR);
    });
    if (intro > INTRO_END + 0.3 && !landed) setLanded(true);
  });

  return tiles.map((t, i) => (
    <group key={i} ref={(g) => (groupRefs.current[i] = g)} visible={false}>
      <mesh
        geometry={tileGeometry}
        castShadow
        receiveShadow
        onPointerOver={(e) => {
          e.stopPropagation();
          hoveredRef.current = i;
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          if (hoveredRef.current === i) hoveredRef.current = null;
          document.body.style.cursor = "";
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (t.all) navigate("/projects");
          else window.open(t.project.link, "_blank", "noopener,noreferrer");
        }}
      >
        <meshStandardMaterial
          ref={(m) => (tileMatRefs.current[i] = m)}
          color={t.color}
          roughness={0.6}
          metalness={0.05}
          envMapIntensity={0.7}
        />
      </mesh>

      {/* project screenshot, just proud of the face, fading in after landing */}
      {t.tex && (
        <mesh position={[0, 0, TILE_D / 2 + 0.012]}>
          <planeGeometry args={[SHOT_W, SHOT_H]} />
          <meshBasicMaterial
            ref={(m) => (shotMatRefs.current[i] = m)}
            map={t.tex}
            transparent
            opacity={0}
            toneMapped={false}
          />
        </mesh>
      )}

      {/* the sixth slab points at the full list */}
      {t.all && (
        <Html center position={[0, 0, TILE_D / 2 + 0.03]} zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
          <p
            className={`font-plex text-[0.72rem] tracking-[0.2em] uppercase whitespace-nowrap select-none transition-opacity duration-700 ${
              landed ? "opacity-100" : "opacity-0"
            }`}
            style={{ color: "#07503d" }}
          >
            all projects →
          </p>
        </Html>
      )}

      {/* name + stack under each tile, factory-station style; colors keyed
          to the board the label sits over, not the page theme */}
      <Html center position={[0, -TILE_H / 2 - 0.42, 0.1]} zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
        <div
          className={`text-center whitespace-nowrap select-none transition-opacity duration-700 ${
            landed ? "opacity-100" : "opacity-0"
          }`}
        >
          <p className="font-plex text-[0.62rem] tracking-[0.18em] uppercase" style={{ color: skin.labelInk }}>
            {t.all ? "and more" : t.project.title}
          </p>
          <p className="mt-0.5 font-plex text-[0.54rem]" style={{ color: skin.labelMuted }}>
            {t.all ? "the full list on /projects" : t.project.technologies.slice(0, 3).join(" · ")}
          </p>
        </div>
      </Html>
    </group>
  ));
}

export default function BoardScene({ theme = "dark" }) {
  const skin = SKINS[theme] ?? SKINS.dark;
  const navigate = useNavigate(); // router context lives outside the Canvas
  // the scene-wide intro/flow clock (see ClockDriver)
  const clockRef = useRef(REDUCED_MOTION ? INTRO_END + 1 : 0);
  // last clicked path point → loaded into the debug card
  const [picked, setPicked] = useState(null);
  // bumps when the graph editor mutates the path → markers re-place
  const [pathVersion, setPathVersion] = useState(0);
  // Same visibility gate as the hero: no frames while scrolled away.
  const wrapRef = useRef(null);
  const [inView, setInView] = useState(true);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={wrapRef} className="h-full w-full">
      <Canvas
        frameloop={inView ? "always" : "never"}
        orthographic
        shadows="variance"
        gl={{ localClippingEnabled: true }}
        camera={{ zoom: 46, position: [0, 1.4, 14] }}
        onCreated={({ camera }) => camera.lookAt(0, 0.1, 0)}
      >
        <ClockDriver clockRef={clockRef} />
        <FitZoom />
        {/* studio softboxes for specular life on the slab edges */}
        <Environment resolution={256}>
          <Lightformer form="rect" intensity={theme === "light" ? 3 : 2} position={[0, 6, 8]} scale={[12, 6, 1]} />
          <Lightformer form="rect" intensity={1.2} position={[-8, 3, 4]} rotation={[0, Math.PI / 2, 0]} scale={[8, 4, 1]} />
          <Lightformer form="rect" intensity={0.9} color="#dfe6ee" position={[8, 4, 4]} rotation={[0, -Math.PI / 2, 0]} scale={[8, 4, 1]} />
        </Environment>
        <ambientLight intensity={theme === "light" ? 0.9 : 0.65} />
        <hemisphereLight
          intensity={theme === "light" ? 0.7 : 0.5}
          color="#e8edf4"
          groundColor={theme === "light" ? "#c8ccd2" : "#3a3d43"}
        />
        {/* key light throws the falling tiles' shadows across the board */}
        <directionalLight
          position={[4, 7, 6]}
          intensity={theme === "light" ? 1.1 : 1.0}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-left={-9}
          shadow-camera-right={9}
          shadow-camera-top={7}
          shadow-camera-bottom={-7}
          shadow-radius={8}
          shadow-blurSamples={16}
        />
        <directionalLight position={[-4, 5, -8]} intensity={theme === "light" ? 0.3 : 0.9} color="#aac2e2" />
        {/* hero-style glare rig over the card flow: the ribbon's "sun line"
            (two rect strips back-to-back) hung above the U, plus a deep
            point fill with physical falloff — the same light language that
            makes the hero tiles read as objects */}
        <group position={[7.5, 6.5, 1.5]} rotation={[-1.9, 0, 0]}>
          <rectAreaLight width={10} height={1.3} intensity={9} />
          <rectAreaLight rotation={[Math.PI, 0, 0]} width={10} height={1.3} intensity={9} />
        </group>
        <pointLight position={[7.5, 3.2, 4.5]} intensity={26} decay={2} />

        {/* the whole set leans back a touch, like the hero tiles' pitch;
            board sits left of center, the hand fan collects on its right */}
        <group rotation={[-0.22, 0, 0]}>
          <group position={[-2.8, 0, 0]}>
            {/* dashboard parked while the conveyor is being reworked —
                flip SHOW_DASH to bring it back */}
            {SHOW_DASH && (
              <>
                <Board theme={theme} clockRef={clockRef} />
                <Suspense fallback={null}>
                  <Tiles skin={skin} navigate={navigate} clockRef={clockRef} />
                </Suspense>
              </>
            )}
          </group>
          <group position={[FAN_SHIFT_X, 0, 0]}>
            <Fan clockRef={clockRef} />
            {SHOW_DEBUG_CARD && (
              <PathMarkers onPick={(p) => setPicked({ ...p })} version={pathVersion} />
            )}
          </group>
        </group>
        {SHOW_DEBUG_CARD && <DebugCard picked={picked} />}
      </Canvas>
      {SHOW_PATH_GRAPH && <PathGraphEditor onChange={() => setPathVersion((v) => v + 1)} />}
    </div>
  );
}
