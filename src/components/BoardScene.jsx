// The landing board — the below-fold payoff of the hero ribbon: the same
// kind of rounded slabs that fly along the conveyor up top drop onto a big
// board here and settle into a 3×2 dashboard of projects. Screenshots fade
// onto the faces once the tiles land; hover lifts a tile off the board,
// click opens the project. Same phthalo ramp, same orthographic staging.
import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Html, Lightformer, useTexture } from "@react-three/drei";
import {
  AdditiveBlending,
  BufferAttribute,
  CanvasTexture,
  Color,
  ExtrudeGeometry,
  NormalBlending,
  Plane,
  RepeatWrapping,
  Shape,
  ShapeGeometry,
  SRGBColorSpace,
  Vector3,
} from "three";
import { useNavigate } from "react-router-dom";
import { COLORS, makeDotTexture as makeMoteTexture, makeGrainTexture } from "./CuboidScene";
import { projects } from "./Projects";

const TILE_W = 3.8;
const TILE_H = 2.4;
const TILE_D = 0.14;
const SHOT_INSET = 0.02; // screenshot covers the full face (hairline inset)
const COLS = [-4.4, 0, 4.4];
const ROWS = [1.95, -1.95];
const HOVER_LIFT = 0.55;  // toward the camera, off the board

// Entry choreography: every tile emerges from ONE spawn point off-screen
// right (mid-height, like being dealt from a chute) and flies to its slot,
// one by one — the six paths fan out across the board. Each lands in its
// ramp color, then the face paints dark and the screenshot develops.
const ENTER_WAIT = 0.35;  // s between consecutive tiles — brisk but readable
const ENTER_DUR = 2.6;    // s — one tile's flight (slowed for readability)
const FLIGHT_DIP = 2.6;   // how far below both endpoints the swoop bottoms out
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
// Which debug tools appear while the in-page "debug" switch is ON:
const SHOW_DEBUG_CARD = false; // rotation playground card + path markers
const SHOW_PATH_GRAPH = false; // the x/y/z graph editor panel
const SHOW_LIGHT_LAB = true;   // movable lamps with position/intensity panel
// The whole conveyor (authored in centered coords) slides right as a unit,
// back to its home beside the pane — only the turn shows, tails run off-page.
const FAN_SHIFT_X = 10.3;
// The dashboard sits well behind the card flow's plane, raised slightly,
// scaled up a touch, and turned toward the conveyor — the yaw is what
// makes it read as an object in space instead of a flat overlay.
const BOARD_Y = 0.8;
const BOARD_Z = -9;
const BOARD_SCALE = 1.12;
const BOARD_ROT_Y = 0.3;

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
    // Same scale curve as the hero: baseline through Full HD, growing
    // linearly to the 1.33 cap at 2K. A height guard bounds the zoom so
    // the tile flights' bottom swoop never clips the fixed-height band.
    const scaleW = Math.min(1.33, Math.max(1, width / 1920));
    camera.zoom = Math.min(Math.min(width / 27, height / 12) * scaleW, height / 11.2);
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

// The screenshot layer: a rounded rect matching the tile's footprint and
// corner radius, so the image fills the face edge to edge.
function makeShotGeometry() {
  return new ShapeGeometry(
    roundedRectShape(TILE_W / 2 - SHOT_INSET, TILE_H / 2 - SHOT_INSET, TILE_R - SHOT_INSET),
    24
  );
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
// Where each of the first six cards is — and the FULL keyframed pose it
// wears — at the instant it leaves the flow. The board tile takes over from
// exactly that pose and unwinds it to flat along the shortest arcs during
// the flight, so the swap is invisible even mid-flip. Computed lazily on
// first use (the rotation keyframes are declared further down the file).
let DEPART_CACHE = null;
function departPoses() {
  if (DEPART_CACHE) return DEPART_CACHE;
  DEPART_CACHE = Array.from({ length: DEPART_N }, (_, i) => {
    const u = flowDist(departTime(i) - FAN_START) - i * CARD_GAP + closure(departTime(i), i);
    const s = uToS(((u % U_LEN) + U_LEN) % U_LEN);
    const p = pathPoint(s);
    // the exact pose the fan card wears at this moment — baseline + keyframes,
    // with the board's yaw subtracted so the pose is expressed in the
    // board's rotated frame
    const pose = cardRotation(s, p.rot).map(normAngle);
    pose[1] = normAngle(pose[1] - BOARD_ROT_Y);
    // world → board-local: undo the board group's shift, yaw, AND scale
    // (the flight's swoop control point is computed live in the frame loop)
    const wx = p.x + FAN_SHIFT_X + 2.8;
    const wy = p.y - BOARD_Y;
    const wz = p.z - BOARD_Z;
    const cosR = Math.cos(BOARD_ROT_Y);
    const sinR = Math.sin(BOARD_ROT_Y);
    return {
      x: (wx * cosR - wz * sinR) / BOARD_SCALE,
      y: wy / BOARD_SCALE,
      z: (wx * sinR + wz * cosR) / BOARD_SCALE,
      pose,
    };
  });
  return DEPART_CACHE;
}

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

/* Dust motes, hero-style: a sparse Points cloud drifting along the conveyor
   path in a halo around the cards — each mote a little slower or faster
   than the flow, bobbing gently, wrapping off-page with the loop. One draw
   call; per frame it refills a small position buffer. */
const DUST_N = 60;
const DUST_START = TILES_START + 2.0; // breathe in once the deal is underway
const DUST_DUR = 1.6;

function BoardDust({ theme, clockRef }) {
  const pointsRef = useRef();
  const matRef = useRef();
  const sprite = useMemo(() => makeMoteTexture(), []);
  const { params, positions, colors } = useMemo(() => {
    const params = Array.from({ length: DUST_N }, () => ({
      u0: Math.random() * U_LEN,             // start point on the loop
      speed: 0.4 + Math.random() * 0.7,      // × FLOW_V — calmer than the cards
      // each mote rides its own concentric lane around the U — mostly
      // outside the card ring, a few drifting through the inside
      lane: (Math.random() < 0.75 ? 1 : -1) * (1.7 + Math.random() * 1.8),
      z0: -2.5 + Math.random() * 3,          // flat-ish depth shell, no diving
      amp: 0.05 + Math.random() * 0.12,      // bob
      freq: 0.4 + Math.random() * 0.8,
      phase: Math.random() * Math.PI * 2,
    }));
    const positions = new Float32Array(DUST_N * 3);
    const colors = new Float32Array(DUST_N * 3);
    for (let i = 0; i < DUST_N; i++) {
      const b = 0.35 + Math.random() * 0.65; // per-mote brightness
      colors[i * 3] = colors[i * 3 + 1] = colors[i * 3 + 2] = b;
    }
    return { params, positions, colors };
  }, []);

  const targetOpacity = theme === "light" ? 0.35 : 0.55;
  useFrame(() => {
    const t = clockRef.current;
    // entrance: hold invisible until the pane lands, then breathe in
    if (matRef.current && t < DUST_START + DUST_DUR) {
      matRef.current.opacity = targetOpacity * smoothstep(clamp01((t - DUST_START) / DUST_DUR));
    }
    const pos = pointsRef.current?.geometry.attributes.position;
    if (!pos) return;
    for (let i = 0; i < DUST_N; i++) {
      const d = params[i];
      const u = (d.u0 + t * FLOW_V * d.speed) % U_LEN;
      // the CLEAN analytic U, not the sculpted card path: each mote is
      // pushed outward along the local normal onto its own wider ring, so
      // the swarm reads as loose concentric drift around the flow — and it
      // floats in a flat depth shell instead of miming the cards' dives
      const p = analyticPathPoint(uToS(u));
      const lane = d.lane + Math.sin(t * 0.35 + d.phase) * 0.35;
      pos.setXYZ(
        i,
        p.x - Math.sin(p.rot) * lane,
        p.y + Math.cos(p.rot) * lane + Math.sin(t * d.freq + d.phase) * d.amp,
        d.z0 + Math.sin(t * 0.4 + d.phase * 2) * 0.4
      );
    }
    pos.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} frustumCulled={false} raycast={() => {}}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={positions} count={DUST_N} itemSize={3} />
        <bufferAttribute attach="attributes-color" array={colors} count={DUST_N} itemSize={3} />
      </bufferGeometry>
      {/* faint glow on dark (additive pale mint), pigment dust on light */}
      <pointsMaterial
        ref={matRef}
        map={sprite}
        vertexColors
        transparent
        opacity={targetOpacity}
        color={theme === "light" ? "#07503d" : "#cfeee2"}
        size={theme === "light" ? 5.5 : 3.5}
        sizeAttenuation={false}
        depthWrite={false}
        blending={theme === "light" ? NormalBlending : AdditiveBlending}
      />
    </points>
  );
}

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

/* Light lab: one movable point light with a marker dot and an info panel.
   Scrub the colored labels (drag left/right–up/down) or type exact values
   for X, Y, Z and intensity; copy exports paste-ready props. */
const LIGHT_ROWS = [
  { key: "x", label: "X (screen ←→)", color: "#ef4444", scale: 0.03 },
  { key: "y", label: "Y (height)", color: "#22c55e", scale: 0.03 },
  { key: "z", label: "Z (depth)", color: "#3b82f6", scale: 0.03 },
  { key: "intensity", label: "intensity", color: "#facc15", scale: 0.8 },
];
// extra rows while the line light is selected (rotations in degrees)
const LINE_ROWS = [
  { key: "width", label: "width (length)", color: "#f472b6", scale: 0.06 },
  { key: "height", label: "height (thick)", color: "#f472b6", scale: 0.01 },
  { key: "rx", label: "rot X (aim ↕)", color: "#ef4444", scale: 2 },
  { key: "ry", label: "rot Y (swing ↔)", color: "#22c55e", scale: 2 },
  { key: "rz", label: "rot Z (roll)", color: "#3b82f6", scale: 2 },
];
const degToRad = (d) => (d * Math.PI) / 180;

// The working rig — lives at scene level so lamp edits survive toggling
// the debug tools on/off (debug OFF = clean preview of these same values).
const DEFAULT_LAMPS = [
  { x: 4.1, y: -3.2, z: 1.0, intensity: 20 },   // lamp 1 — low left of the turn
  { x: 7.4, y: 5.0, z: -1.0, intensity: 25 },   // lamp 2 — high over the turn
  { x: 11.2, y: -1.0, z: -3.0, intensity: 20 }, // lamp 3 — right of the turn, deep
  // line light — the hero's "sun line": two rect strips back to back,
  // radiating both ways; a long vertical strip close to the camera,
  // washing across the whole scene from the front
  { line: true, x: 3.0, y: -1.0, z: 12.5, intensity: 8, width: 20, height: 1.2, rx: -5, ry: -615, rz: -90 },
];

function LightLab({ lamps, setLamps }) {
  const [active, setActive] = useState(1);
  const drag = useRef(null); // scrub: { key, px, py, scale }
  const markerDrag = useRef(null); // marker drag: { i, px, py, startX, startY }
  const [copied, setCopied] = useState(false);
  // px → world units at the camera plane, for dragging the markers
  const worldPerPx = useThree((s) => s.viewport.height / s.size.height);

  const patch = (i, fn) =>
    setLamps((ls) => ls.map((l, k) => (k === i ? { ...l, ...fn(l) } : l)));

  useEffect(() => {
    const onMove = (e) => {
      const m = markerDrag.current;
      if (m) {
        // grab-and-pull a lamp across the screen: x/y follow the pointer
        patch(m.i, () => ({
          x: m.startX + (e.clientX - m.px) * worldPerPx,
          y: m.startY + (m.py - e.clientY) * worldPerPx,
        }));
        return;
      }
      const d = drag.current;
      if (!d) return;
      const dx = e.clientX - d.px;
      const dy = e.clientY - d.py;
      d.px = e.clientX;
      d.py = e.clientY;
      // drag right or up = increase
      patch(d.i, (l) => {
        const v = l[d.key] + (dx - dy) * d.scale;
        const clamped =
          d.key === "intensity" ? Math.max(0, v)
          : d.key === "width" || d.key === "height" ? Math.max(0.05, v)
          : v;
        return { [d.key]: clamped };
      });
    };
    const onUp = () => {
      drag.current = null;
      markerDrag.current = null;
      document.body.style.cursor = "";
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [worldPerPx]);

  const startDrag = (key, scale) => (e) => {
    e.stopPropagation();
    if (e.preventDefault) e.preventDefault();
    drag.current = { i: active, key, px: e.clientX, py: e.clientY, scale };
  };

  const setValue = (key) => (e) => {
    const v = parseFloat(e.target.value);
    if (Number.isNaN(v)) return;
    const clamped =
      key === "intensity" ? Math.max(0, v)
      : key === "width" || key === "height" ? Math.max(0.05, v)
      : v;
    patch(active, () => ({ [key]: clamped }));
  };

  const copyLamps = async () => {
    const text = lamps
      .map((l, i) => {
        const base = `lamp ${i + 1}: position={[${l.x.toFixed(1)}, ${l.y.toFixed(1)}, ${l.z.toFixed(1)}]} intensity={${Math.round(l.intensity)}}`;
        return l.line
          ? `${base} rot={[${Math.round(l.rx)}, ${Math.round(l.ry)}, ${Math.round(l.rz)}]}deg width={${l.width.toFixed(1)}} height={${l.height.toFixed(2)}} // line`
          : base;
      })
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      window.prompt("Copy:", text);
    }
  };

  const lamp = lamps[active];
  return (
    <>
      {lamps.map((l, i) => (
        <group key={i}>
          {/* marker: yellow = selected, grey = other; drag either to move it.
              the line light draws as a bar matching its size and aim */}
          {l.line ? (
            <mesh
              position={[l.x, l.y, l.z]}
              rotation={[degToRad(l.rx), degToRad(l.ry), degToRad(l.rz)]}
              renderOrder={12}
            >
              <boxGeometry args={[l.width, l.height, 0.06]} />
              <meshBasicMaterial
                color={i === active ? "#facc15" : "#8b9096"}
                transparent
                opacity={0.55}
                depthTest={false}
              />
            </mesh>
          ) : (
            <mesh position={[l.x, l.y, l.z]} renderOrder={12}>
              <sphereGeometry args={[0.12, 12, 12]} />
              <meshBasicMaterial color={i === active ? "#facc15" : "#8b9096"} depthTest={false} />
            </mesh>
          )}
          <mesh
            position={[l.x, l.y, l.z]}
            onPointerDown={(e) => {
              e.stopPropagation();
              setActive(i);
              markerDrag.current = { i, px: e.clientX, py: e.clientY, startX: l.x, startY: l.y };
              document.body.style.cursor = "move";
            }}
            onPointerOver={() => {
              if (!markerDrag.current) document.body.style.cursor = "move";
            }}
            onPointerOut={() => {
              if (!markerDrag.current) document.body.style.cursor = "";
            }}
          >
            <sphereGeometry args={[0.45, 8, 8]} />
            <meshBasicMaterial visible={false} />
          </mesh>
        </group>
      ))}
      <Html position={[-10.4, 4.5, 0]} style={{ whiteSpace: "nowrap" }} zIndexRange={[50, 41]}>
        <DraggablePanel>
          <div className="font-plex text-[0.7rem] leading-relaxed text-ink bg-page/80 border border-hairline rounded-md px-3 py-1.5 select-none">
            {/* which lamp the rows edit */}
            <div className="mb-1 flex items-center gap-1.5">
              {lamps.map((l, i) => (
                <button
                  key={i}
                  onClick={() => setActive(i)}
                  className={`border rounded px-1.5 py-0.5 transition-colors cursor-pointer ${
                    active === i
                      ? "border-accent text-accent"
                      : "border-hairline text-ink-dim hover:text-ink hover:border-accent-dim"
                  }`}
                >
                  {l.line ? "line" : `light ${i + 1}`}
                </button>
              ))}
            </div>
            {[...LIGHT_ROWS, ...(lamp.line ? LINE_ROWS : [])].map(({ key, label, color, scale }) => (
              <div key={key} className="flex items-center gap-2 py-0.5">
                <span
                  className="w-24 cursor-ew-resize"
                  style={{ color }}
                  onPointerDown={startDrag(key, scale)}
                  title="drag to scrub"
                >
                  {label}
                </span>
                <input
                  type="number"
                  step={key === "intensity" ? "5" : key === "rx" || key === "ry" || key === "rz" ? "5" : "0.5"}
                  value={key === "intensity" ? Math.round(lamp[key]) : lamp[key].toFixed(1)}
                  onChange={setValue(key)}
                  className="w-16 bg-transparent border border-hairline rounded px-1 py-0.5 text-ink"
                />
              </div>
            ))}
            <div className="mt-1.5 pt-1.5 border-t border-hairline flex items-center gap-2">
              <button
                onClick={copyLamps}
                className="border border-hairline rounded px-2 py-0.5 text-ink-dim hover:text-ink hover:border-accent-dim transition-colors cursor-pointer"
              >
                {copied ? "copied!" : "copy all"}
              </button>
            </div>
          </div>
        </DraggablePanel>
      </Html>
    </>
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

// hero-style hover: the card under the pointer eases up a little and
// settles back down when the pointer leaves
const CARD_HOVER_LIFT = 0.7;
const CARD_HOVER_EASE = 10;

function Fan({ clockRef }) {
  const cardRefs = useRef([]);
  const hoveredRef = useRef(null);
  const liftsRef = useRef(new Float32Array(FAN_N));
  const geometry = useMemo(() => makeFanTileGeometry(), []);
  const grain = useMemo(
    () => ({
      relief: makeGrainTexture(), // mid-grey, strong — roughness
      color: makeGrainTexture({ base: 246, amp: 9 }), // near-white, subtle — albedo
    }),
    []
  );
  useFrame((_, delta) => {
    const t = clockRef.current;
    // the U forms by itself: the train enters the path card by card from
    // the top tail and rides around until the loop is full — no card is
    // placed, they all ARRIVE. After the lead card laps, it wraps to the
    // back and the steady flow just runs.
    const T = Math.max(0, t - FAN_START);
    const lifts = liftsRef.current;
    const ease = Math.min(1, delta * CARD_HOVER_EASE);
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
      // hover lift blends into the path position — but OUTWARD, along the
      // path's local normal (away from the U's center): up on the top tail,
      // left at the far point, down on the bottom tail
      const target = hoveredRef.current === i ? CARD_HOVER_LIFT : 0;
      lifts[i] += (target - lifts[i]) * ease;
      // depth follows path progress: cards higher on the U stay closest to
      // the camera, so the hand always layers top → bottom, even mid-flow
      g.position.set(
        p.x - Math.sin(p.rot) * lifts[i],
        p.y + Math.cos(p.rot) * lifts[i],
        p.z
      );
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
          {/* hoverable like the hero tiles (markers still win clicks —
              they sit in front and stop propagation) */}
          <mesh
            geometry={geometry}
            castShadow
            onPointerOver={(e) => {
              e.stopPropagation();
              hoveredRef.current = i;
            }}
            onPointerOut={() => {
              if (hoveredRef.current === i) hoveredRef.current = null;
            }}
          >
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

// Liquid-glass helpers: the pane's vertical sheen gradient (lighter at the
// top, like the navbar island's inset highlight falling down the surface)
// and a blurred rounded-rect shadow that floats the panel off the page.
function makePaneGradient(theme) {
  const canvas = document.createElement("canvas");
  canvas.width = 2;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  if (theme === "light") {
    g.addColorStop(0, "#ffffff");
    g.addColorStop(1, "#e9efec");
  } else {
    g.addColorStop(0, "#3e434a");
    g.addColorStop(1, "#191b1e");
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 2, 256);
  const tex = new CanvasTexture(canvas);
  // the pane's extruded UVs are world coords: map [−H/2..H/2] → [0..1]
  tex.repeat.set(1 / BOARD_W, 1 / BOARD_H);
  tex.offset.set(0.5, 0.5);
  return tex;
}

// The dot grid's area: the pane shape MINUS the header strip — dots start
// just below the separator, so the window chrome sits on clean glass with
// no covering slab needed.
function makeDotsAreaGeometry() {
  const w = BOARD_W / 2 - FRAME_TH / 2 + 0.02;
  const hTop = BOARD_H / 2 - 0.84; // just under the separator
  const hBot = BOARD_H / 2 - FRAME_TH / 2 + 0.02;
  const r = CORNER_R - FRAME_TH / 2 + 0.02;
  const s = new Shape();
  s.moveTo(-w + r, -hBot);
  s.lineTo(w - r, -hBot);
  s.absarc(w - r, -hBot + r, r, -Math.PI / 2, 0);
  s.lineTo(w, hTop);
  s.lineTo(-w, hTop);
  s.lineTo(-w, -hBot + r);
  s.absarc(-w + r, -hBot + r, r, Math.PI, Math.PI * 1.5);
  return new ShapeGeometry(s, 24);
}

function makeSoftShadowTexture() {
  const w = 256;
  const h = 176;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.filter = "blur(16px)";
  ctx.fillStyle = "rgba(0,0,0,1)";
  ctx.beginPath();
  ctx.roundRect(34, 34, w - 68, h - 68, 18);
  ctx.fill();
  return new CanvasTexture(canvas);
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
  ctx.fillStyle = theme === "light" ? "rgba(7,80,61,0.18)" : "rgba(231,233,234,0.15)";
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
  // Frame and pane carry the site's phthalo identity in muted form: deep
  // desaturated green border, green-cast translucent glass — same family as
  // the tile ramp, dialed way down.
  const frameColor = theme === "light" ? "#b8c8c3" : "#565c65";
  const glassTarget = theme === "light" ? 0.55 : 0.72;
  const shadowTarget = theme === "light" ? 0.16 : 0.32;
  const cornerGeometry = useMemo(() => makeCornerGeometry(), []);
  const paneGeometry = useMemo(() => makePaneGeometry(), []);
  const paneGradient = useMemo(() => makePaneGradient(theme), [theme]);
  const softShadow = useMemo(() => makeSoftShadowTexture(), []);
  const dotsGeometry = useMemo(() => makeDotsAreaGeometry(), []);
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
      <mesh geometry={dotsGeometry} position={[0, 0, -0.165]} renderOrder={1}>
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
        {/* liquid-glass pane: fully self-lit from a vertical gradient
            (lighter top, like the 2D cards' inset highlight) so the panel's
            shade is deterministic regardless of the lamp rig; matte, no
            specular gloss */}
        <meshStandardMaterial
          ref={glassRef}
          color="#000000"
          emissive="#ffffff"
          emissiveMap={paneGradient}
          emissiveIntensity={theme === "light" ? 0.95 : 0.85}
          transparent
          opacity={0}
          roughness={0.92}
          metalness={0}
          depthWrite={false}
        />
      </mesh>
      {/* invisible catcher just in front of the glass so the tiles'
          shadows still ground them on the board */}
      <mesh position={[0, 0, -0.13]} receiveShadow>
        <planeGeometry args={[13.0, 8.2]} />
        <shadowMaterial ref={shadowRef} transparent opacity={0} />
      </mesh>

      {/* liquid-glass details: the 2D cards' inset top highlight, rendered
          as a hairline bright strip inside the frame's top edge… */}
      <mesh position={[0, BOARD_H / 2 - 0.09, -0.14]}>
        <boxGeometry args={[BOARD_W - 1.1, 0.03, 0.01]} />
        <meshBasicMaterial
          ref={(m) => {
            if (m) m.userData.tg = theme === "light" ? 0.75 : 0.16;
            chromeMats.current[4] = m;
          }}
          color="#ffffff"
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>
      {/* …and a soft blurred shadow floating the panel off the page,
          offset down like the cards' lift shadow */}
      <mesh position={[0.3, -0.55, -0.8]}>
        <planeGeometry args={[BOARD_W + 2.6, BOARD_H + 2.6]} />
        <meshBasicMaterial
          ref={(m) => {
            if (m) m.userData.tg = theme === "light" ? 0.22 : 0.5;
            chromeMats.current[5] = m;
          }}
          map={softShadow}
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>

      {/* window chrome: traffic lights, centered title, and a hairline
          separator across the header — the pane reads as a real app window
          (same language as the factory's monitor station) */}
      {["#ff5f57", "#febc2e", "#28c840"].map((c, i) => (
        <mesh
          key={c}
          position={[-BOARD_W / 2 + 0.62 + i * 0.36, BOARD_H / 2 - 0.46, -0.1]}
          rotation={[Math.PI / 2, 0, 0]}
          renderOrder={3}
        >
          <cylinderGeometry args={[0.1, 0.1, 0.02, 24]} />
          {/* self-lit: the dash sits beyond the lamps' reach, so lit
              materials would render black — basic keeps the buttons true */}
          <meshBasicMaterial
            ref={(m) => {
              if (m) m.userData.tg = 1;
              chromeMats.current[i] = m;
            }}
            color={c}
            transparent
            opacity={0}
          />
        </mesh>
      ))}
      <mesh position={[0, BOARD_H / 2 - 0.82, -0.14]}>
        <boxGeometry args={[BOARD_W - 0.5, 0.018, 0.018]} />
        <meshBasicMaterial
          ref={(m) => {
            if (m) m.userData.tg = 0.85;
            chromeMats.current[3] = m;
          }}
          color={frameColor}
          transparent
          opacity={0}
        />
      </mesh>
      <Html
        transform
        scale={0.34}
        position={[0, BOARD_H / 2 - 0.46, -0.14]}
        zIndexRange={[10, 0]}
        style={{ pointerEvents: "none" }}
      >
        <p
          className={`font-plex text-[1.5rem] tracking-[0.22em] uppercase whitespace-nowrap select-none transition-opacity duration-700 ${
            chromeIn ? "opacity-100" : "opacity-0"
          }`}
          style={{ color: theme === "light" ? "#4f6a60" : "#8b9096" }}
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

  // sRGB + cover-crop each screenshot to the tile face's aspect (like CSS
  // object-fit: cover). The rounded-rect geometry's UVs are the shape's own
  // coords (± half-extents), so the crop is remapped into that space.
  useEffect(() => {
    textures.forEach((tex) => {
      tex.colorSpace = SRGBColorSpace;
      const img = tex.image;
      if (!img) return;
      const imgAspect = img.width / img.height;
      const faceAspect = TILE_W / TILE_H;
      let rx = 1;
      let ry = 1;
      let ox = 0;
      let oy = 0;
      if (imgAspect > faceAspect) {
        rx = faceAspect / imgAspect;
        ox = (1 - rx) / 2;
      } else {
        ry = imgAspect / faceAspect;
        oy = (1 - ry) / 2;
      }
      tex.repeat.set(rx / TILE_W, ry / TILE_H);
      tex.offset.set(ox + rx * 0.5, oy + ry * 0.5);
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
  const shotGeometry = useMemo(() => makeShotGeometry(), []);
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
      const d = departPoses()[i];
      // parabolic swoop: the bezier control sits at the midpoint, pulled
      // well below both ends — the tile dives off the turn, sweeps left
      // through the bottom of the arc, and rises up into its slot
      const cx = (d.x + t.x) / 2;
      const cy = Math.min(d.y, t.y) - FLIGHT_DIP;
      const b = 1 - k;
      g.position.set(
        b * b * d.x + 2 * b * k * cx + k * k * t.x,
        b * b * d.y + 2 * b * k * cy + k * k * t.y,
        d.z * (1 - k) + lifts[i]
      );
      // the inherited card pose unwinds to flat during the flight
      g.rotation.set(d.pose[0] * (1 - k), d.pose[1] * (1 - k), d.pose[2] * (1 - k));
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

      {/* project screenshot, edge to edge on the face, fading in after landing */}
      {t.tex && (
        <mesh geometry={shotGeometry} position={[0, 0, TILE_D / 2 + 0.012]}>
          <meshBasicMaterial
            ref={(m) => (shotMatRefs.current[i] = m)}
            map={t.tex}
            transparent
            opacity={0}
            toneMapped={false}
          />
        </mesh>
      )}

      {/* the sixth slab points at the full list. transform mode: the DOM
          text is CSS-3D-transformed with the scene, so it skews with the
          board's yaw instead of billboarding flat */}
      {t.all && (
        <Html
          transform
          scale={0.34}
          position={[0, 0, TILE_D / 2 + 0.03]}
          zIndexRange={[10, 0]}
          style={{ pointerEvents: "none" }}
        >
          <p
            className={`font-plex text-[1.25rem] tracking-[0.2em] uppercase whitespace-nowrap select-none transition-opacity duration-700 ${
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
      <Html
        transform
        scale={0.34}
        position={[0, -TILE_H / 2 - 0.42, 0.1]}
        zIndexRange={[10, 0]}
        style={{ pointerEvents: "none" }}
      >
        <div
          className={`text-center whitespace-nowrap select-none transition-opacity duration-700 ${
            landed ? "opacity-100" : "opacity-0"
          }`}
        >
          <p className="font-plex text-[1.1rem] tracking-[0.18em] uppercase" style={{ color: skin.labelInk }}>
            {t.all ? "and more" : t.project.title}
          </p>
          <p className="mt-0.5 font-plex text-[0.95rem]" style={{ color: skin.labelMuted }}>
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
  // master switch: hides/shows every debug tool at once (in-page button)
  const [debugOn, setDebugOn] = useState(false);
  // the light rig — persists across debug toggles; the lab edits it in place
  const [lamps, setLamps] = useState(DEFAULT_LAMPS);
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
        {/* the rig itself always renders from the live lamp values; the lab
            (markers + panel) just edits them — so toggling debug off is a
            clean preview, never a reset */}
        {lamps.map((l, i) =>
          l.line ? (
            <group
              key={i}
              position={[l.x, l.y, l.z]}
              rotation={[degToRad(l.rx), degToRad(l.ry), degToRad(l.rz)]}
            >
              <rectAreaLight width={l.width} height={l.height} intensity={l.intensity} />
              <rectAreaLight rotation={[Math.PI, 0, 0]} width={l.width} height={l.height} intensity={l.intensity} />
            </group>
          ) : (
            <pointLight key={i} position={[l.x, l.y, l.z]} intensity={l.intensity} decay={2} />
          )
        )}
        {debugOn && SHOW_LIGHT_LAB && <LightLab lamps={lamps} setLamps={setLamps} />}

        {/* the whole set leans back a touch, like the hero tiles' pitch;
            board sits left of center, the hand fan collects on its right */}
        <group rotation={[-0.22, 0, 0]}>
          <group position={[-2.8, BOARD_Y, BOARD_Z]} scale={BOARD_SCALE} rotation={[0, BOARD_ROT_Y, 0]}>
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
            <BoardDust theme={theme} clockRef={clockRef} />
            {debugOn && SHOW_DEBUG_CARD && (
              <PathMarkers onPick={(p) => setPicked({ ...p })} version={pathVersion} />
            )}
          </group>
        </group>
        {debugOn && SHOW_DEBUG_CARD && <DebugCard picked={picked} />}
      </Canvas>
      {debugOn && SHOW_PATH_GRAPH && (
        <PathGraphEditor onChange={() => setPathVersion((v) => v + 1)} />
      )}
      {/* master debug switch, tucked in the section's top-right corner */}
      <button
        onClick={() => setDebugOn((d) => !d)}
        className={`absolute top-2 right-3 z-20 font-plex text-[0.62rem] border rounded px-2 py-1 bg-page/85 backdrop-blur transition-colors cursor-pointer ${
          debugOn
            ? "border-accent text-accent"
            : "border-hairline text-muted hover:text-ink hover:border-accent-dim"
        }`}
      >
        debug {debugOn ? "on" : "off"}
      </button>
    </div>
  );
}
