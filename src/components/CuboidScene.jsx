// "2D like 3D" tile ribbon — a chain of thin rounded tiles stacked along the
// x-axis, each twisted around the chain axis, forming a waving fanned ribbon.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { Shape, ExtrudeGeometry, AxesHelper, BufferAttribute, Color } from "three";

const SPACING = 0.55;      // distance between tile centers along the chain
const SCROLL_SPEED = 1.1;  // marquee drift, world units per second
const TILT = 0.45;         // turn each tile's face toward the camera (radians)
// Checkpoints 1..35 are stretched across the full visible width:
// 1 = left screen edge, 35 = right screen edge (step derived from viewport).
const CHECKPOINT_MAX = 35;
const PITCH = 0.25;        // baseline lean of every tile (radians)

// Rotation choreography along the path. Positions are checkpoint numbers
// (0 = screen-left, step = CHECKPOINT_STEP); rot = [x, y, z] radians, same
// convention as the debug tile. Tiles blend smoothly between keyframes and
// ease back to the baseline within KEY_FADE checkpoints of the outer ones.
const BASE_ROT = [PITCH, TILT, 0];
const ROT_KEYFRAMES = [
  { pos: 2, rot: [-2.159, -0.091, 0.279] }, // X -123.7°, Y -5.2°, Z 16.0°
  { pos: 10, rot: [-1.339, 0.328, 0.279] }, // X -76.7°, Y 18.8°, Z 16.0°
  { pos: 19, rot: BASE_ROT },               // back to the resting pose
  { pos: 24, rot: [-0.59, 0.25, 0.45] },
  { pos: 35, rot: [-1.89, -0.28, 0.43] },
];
const KEY_FADE = 3;

// Hand-tuned path baked from the drag editor: y at checkpoints 1..36
// (1 = visible screen-left edge). Interpolated with a Catmull-Rom spline.
const PATH_Y = [
  0.002, -0.692, -0.961, -0.891, -0.853, -0.768, -0.611, -0.517, -0.349,
  -0.265, -0.369, -0.495, -1.075, -1.275, -1.128, -1.16, -1.232, -1.398,
  -1.391, -0.709, 2.403, 1.417, 0.497, -0.009, -0.381, -0.19, -0.581,
  -1.01, -1.647, -2.677, -2.054, -2.194, -1.866, -2.04, -2.218, -3.589,
];

// Depth per checkpoint (world z; 0 = the ribbon's original plane, negative =
// toward the camera). Sculpted by dragging markers horizontally, then baked
// back here like PATH_Y. Current shape: a full-width arc — both screen edges
// closest to the viewer (-5), checkpoint 21 pushed away to +5.
const PATH_Z = [
  -5.0, -4.93, -4.72, -4.39, -3.96, -3.44, -2.84, -2.18, -1.48,
  -0.75, 0.0, 0.75, 1.48, 2.18, 2.84, 3.44, 3.96, 4.39,
  4.72, 4.93, 5.0, 4.85, 4.45, 3.82, 3.02, 2.09, 1.06,
  0.0, -1.06, -2.09, -3.02, -3.82, -4.45, -4.85, -5.0, -5.0,
];

// Smooth curve through a checkpoint-sample array at position p (clamped outside 1..36).
function sampleCurve(arr, p) {
  const n = arr.length;
  const t = p - 1; // 0-based along the samples
  if (t <= 0) return arr[0];
  if (t >= n - 1) return arr[n - 1];
  const i = Math.floor(t);
  const f = t - i;
  const y0 = arr[Math.max(0, i - 1)];
  const y1 = arr[i];
  const y2 = arr[i + 1];
  const y3 = arr[Math.min(n - 1, i + 2)];
  // Catmull-Rom
  return (
    y1 +
    0.5 *
      f *
      (y2 - y0 + f * (2 * y0 - 5 * y1 + 4 * y2 - y3 + f * (3 * (y1 - y2) + y3 - y0)))
  );
}

const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t); // smoothstep

// Fast zone: tiles accelerate between these checkpoints (they travel from
// higher positions to lower ones), which also stretches the gaps there.
const FAST_ZONE = { from: 23, to: 27, ramp: 2, speed: 1.5 };

function speedAt(p) {
  const { from, to, ramp, speed } = FAST_ZONE;
  if (p <= from - ramp || p >= to + ramp) return 1;
  if (p < from) return 1 + (speed - 1) * smooth((p - (from - ramp)) / ramp);
  if (p <= to) return speed;
  return 1 + (speed - 1) * smooth((to + ramp - p) / ramp);
}

function rotAtPos(p) {
  const kfs = ROT_KEYFRAMES;
  if (!kfs.length) return BASE_ROT;
  const first = kfs[0];
  const last = kfs[kfs.length - 1];
  if (p <= first.pos - KEY_FADE || p >= last.pos + KEY_FADE) return BASE_ROT;
  if (p < first.pos) {
    const t = smooth((p - (first.pos - KEY_FADE)) / KEY_FADE);
    return BASE_ROT.map((v, i) => lerp(v, first.rot[i], t));
  }
  if (p > last.pos) {
    const t = smooth((p - last.pos) / KEY_FADE);
    return last.rot.map((v, i) => lerp(v, BASE_ROT[i], t));
  }
  for (let k = 0; k < kfs.length - 1; k++) {
    const a = kfs[k];
    const b = kfs[k + 1];
    if (p >= a.pos && p <= b.pos) {
      const t = smooth((p - a.pos) / (b.pos - a.pos));
      return a.rot.map((v, i) => lerp(v, b.rot[i], t));
    }
  }
  return BASE_ROT;
}

// all white for now; previous palette (pinks / violets / blues) kept for reference:
// ["#f9a8d4", "#ec4899", "#be185d", "#a78bfa", "#60a5fa"]
const COLORS = ["#ffffff"];

// Rounded-rectangle slab: footprint width x depth, thin along y,
// only the 4 footprint corners rounded.
function makeTileGeometry({ width = 3.0, depth = 1.9, height = 0.1, radius = 0.22 } = {}) {
  const w = width / 2;
  const d = depth / 2;
  const r = radius;
  const shape = new Shape();
  shape.moveTo(-w + r, -d);
  shape.lineTo(w - r, -d);
  shape.absarc(w - r, -d + r, r, -Math.PI / 2, 0);
  shape.lineTo(w, d - r);
  shape.absarc(w - r, d - r, r, 0, Math.PI / 2);
  shape.lineTo(-w + r, d);
  shape.absarc(-w + r, d - r, r, Math.PI / 2, Math.PI);
  shape.lineTo(-w, -d + r);
  shape.absarc(-w + r, -d + r, r, Math.PI, Math.PI * 1.5);

  const geo = new ExtrudeGeometry(shape, { depth: height, bevelEnabled: false, curveSegments: 16 });
  geo.rotateX(-Math.PI / 2); // extrude runs along +z; make it the slab's thickness (y)
  geo.translate(0, -height / 2, 0);
  return geo;
}

// Debug: every side of the slab gets its own vertex color so orientation is
// obvious. Sides are named for how the tile stands in the ribbon (after the
// 90° stand-up, at zero pitch/tilt, camera on -z).
const SIDE_COLORS = {
  top: "#f8fafc",     // local +x -> card's top edge (white)
  bottom: "#1e293b",  // local -x -> card's bottom edge (dark slate)
  faceA: "#f97316",   // local +y -> broad face pointing screen-right (orange)
  faceB: "#8b5cf6",   // local -y -> broad face pointing screen-left (violet)
  back: "#06b6d4",    // local +z -> long edge away from camera (cyan)
  front: "#d946ef",   // local -z -> long edge toward camera (magenta)
};

function makeDebugTileGeometry() {
  const geo = makeTileGeometry();
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
    if (ay >= ax && ay >= az) side = ny > 0 ? "faceA" : "faceB";
    else if (ax >= az) side = nx > 0 ? "top" : "bottom";
    else side = nz > 0 ? "back" : "front";
    c.set(SIDE_COLORS[side]);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute("color", new BufferAttribute(colors, 3));
  return geo;
}

function TileRibbon({ geometry, debug }) {
  const ribbonRef = useRef();
  // Fill the visible width (plus margin) with tiles; they wrap around the
  // span like a conveyor belt, so the ribbon scrolls forever.
  const viewportWidth = useThree((s) => s.viewport.width);
  const count = Math.ceil((viewportWidth + 4) / SPACING);
  const span = count * SPACING;
  // Checkpoint mapping: p = 1 at the VISIBLE left edge of the canvas
  // (world +x = screen-left), p = CHECKPOINT_MAX at the right edge.
  const originX = viewportWidth / 2;
  const step = viewportWidth / (CHECKPOINT_MAX - 1);
  const pOf = (x) => (originX - x) / step + 1;

  // Hand-edited per-checkpoint offsets (dragged markers): { [p]: { y, z } },
  // blended smoothly between neighboring checkpoints on top of the baked path.
  const [offsets, setOffsets] = useState({});
  const { pathY, pathZ } = useMemo(() => {
    const make = (arr, axis) => (x) => {
      const p = (originX - x) / step + 1;
      const i = Math.floor(p);
      const t = smooth(p - i);
      const o = lerp(offsets[i]?.[axis] || 0, offsets[i + 1]?.[axis] || 0, t);
      return sampleCurve(arr, p) + o;
    };
    return { pathY: make(PATH_Y, "y"), pathZ: make(PATH_Z, "z") };
  }, [offsets, originX, step]);

  // Selected checkpoint — a plain click (no drag) on a marker opens its
  // coordinate editor next to the marker.
  const [selected, setSelected] = useState(null);

  // Drag a checkpoint marker to edit the path: vertical = y, horizontal = z
  // (x is the travel direction, so screen-horizontal is free for depth;
  // dragging right pulls the checkpoint toward the camera).
  const dragRef = useRef(null); // { index, px, py, startY, startZ, moved }
  const worldPerPx = useThree((s) => s.viewport.height / s.size.height);
  useEffect(() => {
    const move = (e) => {
      const d = dragRef.current;
      if (!d) return;
      // ignore sub-4px jitter so a click doesn't nudge the path
      if (Math.abs(e.clientX - d.px) + Math.abs(e.clientY - d.py) > 4) d.moved = true;
      if (!d.moved) return;
      const dy = (d.py - e.clientY) * worldPerPx; // screen up = world up
      const dz = (d.px - e.clientX) * worldPerPx; // screen right = toward camera (-z)
      setOffsets((prev) => ({
        ...prev,
        [d.index]: { y: d.startY + dy, z: d.startZ + dz },
      }));
    };
    const up = () => {
      const d = dragRef.current;
      if (d && !d.moved) setSelected((s) => (s === d.index ? null : d.index));
      dragRef.current = null;
      document.body.style.cursor = "";
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [worldPerPx]);

  // Speed warp: tiles flow uniformly in conveyor coordinate u, and a warp
  // u -> x stretches the fast zone. By conservation of flow this makes tiles
  // both move faster AND spread apart there, with a seamless wrap.
  const warpX = useMemo(() => {
    const N = 512;
    const dx = span / N;
    const xs = new Float64Array(N + 1);
    const us = new Float64Array(N + 1);
    let acc = 0;
    let prevInv = 1 / speedAt((originX + span / 2) / step + 1); // p at x = -span/2
    xs[0] = -span / 2;
    for (let k = 1; k <= N; k++) {
      const x = -span / 2 + k * dx;
      const inv = 1 / speedAt((originX - x) / step + 1);
      acc += ((prevInv + inv) / 2) * dx; // trapezoid integration of 1/speed
      prevInv = inv;
      xs[k] = x;
      us[k] = acc;
    }
    const scale = span / acc; // normalize so u also spans [0, span]
    for (let k = 0; k <= N; k++) us[k] *= scale;
    return (u) => {
      let lo = 0;
      let hi = N;
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (us[mid] <= u) lo = mid;
        else hi = mid;
      }
      const t = (u - us[lo]) / (us[hi] - us[lo]);
      return xs[lo] + t * (xs[hi] - xs[lo]);
    };
  }, [span, originX, step]);

  useFrame(({ clock }) => {
    const scroll = clock.elapsedTime * SCROLL_SPEED;
    ribbonRef.current.children.forEach((tile, i) => {
      const u = (i * SPACING + scroll) % span; // uniform conveyor coordinate
      const x = warpX(u);
      tile.position.x = x;
      tile.position.y = pathY(x); // fixed curvy path in space
      tile.position.z = pathZ(x); // sculpted depth along the same path
      // rotation choreography, keyed by checkpoint position (1 = screen-left edge)
      const p = pOf(x);
      const [rx, ry, rz] = rotAtPos(p);
      tile.rotation.set(rx, ry, rz);
    });
  });

  // Numbered debug checkpoints stretched across the visible width
  // (1 = left screen edge, CHECKPOINT_MAX = right screen edge).
  const checkpoints = useMemo(() => {
    const pts = [];
    for (let p = 1; p <= CHECKPOINT_MAX; p++) {
      const x = originX - (p - 1) * step;
      pts.push({ p, x, y: pathY(x), z: pathZ(x) });
    }
    return pts;
  }, [originX, step, pathY, pathZ]);

  // Copy the whole edited path as ready-to-paste PATH_Y / PATH_Z source.
  const [copied, setCopied] = useState(false);
  const copyPath = () => {
    const fmt = (v) => {
      const s = v.toFixed(3);
      return s === "-0.000" ? "0.000" : s;
    };
    // checkpoints cover 1..35; keep the baked 36th (off-screen right) sample
    const ys = [...checkpoints.map((c) => fmt(c.y)), fmt(PATH_Y[PATH_Y.length - 1])];
    const zs = [...checkpoints.map((c) => fmt(c.z)), fmt(PATH_Z[PATH_Z.length - 1])];
    const wrap = (name, vals) => {
      const lines = [];
      for (let i = 0; i < vals.length; i += 9) lines.push("  " + vals.slice(i, i + 9).join(", ") + ",");
      return `const ${name} = [\n${lines.join("\n")}\n];`;
    };
    const text = `${wrap("PATH_Y", ys)}\n${wrap("PATH_Z", zs)}`;
    const done = () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(done, () => window.prompt("Copy path:", text));
    } else {
      window.prompt("Copy path:", text);
    }
  };

  return (
    <>
      <group ref={ribbonRef}>
        {Array.from({ length: count }, (_, i) => (
          <group
            key={i}
            position={[i * SPACING - span / 2, 0, 0]}
            rotation={BASE_ROT}
          >
            {/* stand the slab on edge so its thin side runs along the chain */}
            <mesh geometry={geometry} rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
              <meshLambertMaterial color={COLORS[(i * 3) % COLORS.length]} />
            </mesh>
          </group>
        ))}
      </group>

      {/* checkpoint markers — static, tiles flow through them; drag to edit path */}
      {debug && (
      <group>
        {checkpoints.map(({ p, x, y, z }) => (
          <group key={p} position={[x, y, z]}>
            {/* renderOrder + depthTest off so markers always draw above the tiles;
                red = inside the fast zone (speed > 1), orange = hand-edited */}
            <mesh renderOrder={10}>
              <sphereGeometry args={[0.07, 12, 12]} />
              <meshBasicMaterial
                color={
                  selected === p
                    ? "#6ea8fe"
                    : offsets[p]?.y || offsets[p]?.z
                      ? "#fb923c"
                      : speedAt(p) > 1
                        ? "#ef4444"
                        : "#facc15"
                }
                depthTest={false}
              />
            </mesh>
            {/* invisible fat hit area so the marker is easy to grab */}
            <mesh
              onPointerDown={(e) => {
                e.stopPropagation();
                dragRef.current = {
                  index: p,
                  px: e.clientX,
                  py: e.clientY,
                  startY: offsets[p]?.y || 0,
                  startZ: offsets[p]?.z || 0,
                  moved: false,
                };
                document.body.style.cursor = "move";
              }}
              onPointerOver={() => {
                if (!dragRef.current) document.body.style.cursor = "move";
              }}
              onPointerOut={() => {
                if (!dragRef.current) document.body.style.cursor = "";
              }}
            >
              <sphereGeometry args={[0.22, 8, 8]} />
              <meshBasicMaterial visible={false} />
            </mesh>
            <Html
              center
              position={[0, -0.5, 0]}
              style={{ pointerEvents: selected === p ? "auto" : "none" }}
              zIndexRange={selected === p ? [50, 41] : [40, 30]}
            >
              {selected === p ? (
                /* per-checkpoint coordinate editor (click marker to toggle) */
                <div className="font-plex text-[0.62rem] leading-relaxed text-ink bg-page/90 border border-hairline rounded-md px-2 py-1.5 text-left select-none">
                  <div className="mb-0.5 text-muted">checkpoint {p}</div>
                  {["y", "z"].map((axis) => (
                    <div key={axis} className="flex items-center gap-1.5 py-0.5">
                      <span className="w-3 text-muted">{axis}</span>
                      <input
                        type="number"
                        step="0.1"
                        value={(axis === "y" ? y : z).toFixed(2)}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          if (Number.isNaN(v)) return;
                          const base = (axis === "y" ? PATH_Y : PATH_Z)[p - 1];
                          setOffsets((prev) => ({
                            ...prev,
                            [p]: { y: 0, z: 0, ...prev[p], [axis]: v - base },
                          }));
                        }}
                        className="w-16 bg-transparent border border-hairline rounded px-1 py-0.5 text-ink"
                      />
                    </div>
                  ))}
                  <div className="mt-1 flex items-center gap-1.5">
                    <button
                      onClick={() =>
                        setOffsets(({ [p]: _drop, ...rest }) => rest)
                      }
                      className="border border-hairline rounded px-1.5 py-0.5 text-ink-dim hover:text-ink hover:border-accent-dim transition-colors cursor-pointer"
                    >
                      clear
                    </button>
                    <button
                      onClick={() => setSelected(null)}
                      className="border border-hairline rounded px-1.5 py-0.5 text-ink-dim hover:text-ink hover:border-accent-dim transition-colors cursor-pointer"
                    >
                      close
                    </button>
                  </div>
                </div>
              ) : (
                <div className="font-plex text-[0.62rem] text-ink bg-page/70 rounded px-1 leading-tight text-center">
                  {p}
                  {offsets[p]?.y ? (
                    <div className="text-[0.55rem] text-accent">
                      y {offsets[p].y > 0 ? "+" : ""}
                      {offsets[p].y.toFixed(2)}
                    </div>
                  ) : null}
                  {offsets[p]?.z ? (
                    <div className="text-[0.55rem] text-accent">
                      z {offsets[p].z > 0 ? "+" : ""}
                      {offsets[p].z.toFixed(2)}
                    </div>
                  ) : null}
                </div>
              )}
            </Html>
          </group>
        ))}
      </group>
      )}

      {/* copy the full edited path (bottom-center, inside the visible area) */}
      {debug && (
      <Html center position={[0, -3.2, 0]} zIndexRange={[40, 30]}>
        <button
          className="font-plex text-[0.62rem] text-ink bg-page/80 border border-hairline rounded px-2 py-1 cursor-pointer hover:text-accent transition-colors whitespace-nowrap"
          onClick={copyPath}
        >
          {copied ? "copied!" : "copy path"}
        </button>
      </Html>
      )}
    </>
  );
}

// Axes helper with custom per-axis colors (order: X, Y, Z).
function ColoredAxes({ size, colors }) {
  const helper = useMemo(() => {
    const h = new AxesHelper(size);
    h.setColors(...colors);
    return h;
  }, [size, colors]);
  return <primitive object={helper} />;
}

// world axes = saturated, tile-local axes = pale (same hue = same axis)
const WORLD_AXES = ["#ef4444", "#22c55e", "#3b82f6"]; // X red, Y green, Z blue
const LOCAL_AXES = ["#fda4af", "#bbf7d0", "#bfdbfe"]; // pale rose / mint / sky

const AXIS_NAMES = { x: "pitch", y: "tilt", z: "roll" };
const SIDE_LEGEND = {
  top: "top edge",
  bottom: "bottom edge",
  faceA: "face A",
  faceB: "face B",
  front: "front edge",
  back: "back edge",
};
const AXIS_COLORS = { x: WORLD_AXES[0], y: WORLD_AXES[1], z: WORLD_AXES[2] };

// Grabbable rotation handle. X and Y are fat bars along their axis; Z points
// straight at the camera (invisible end-on), so it's a ring around the tile
// instead — grab the blue circle to roll.
function AxisHandle({ axis, onPointerDown }) {
  const hoverProps = {
    onPointerDown,
    onPointerOver: () => (document.body.style.cursor = "grab"),
    onPointerOut: () => (document.body.style.cursor = ""),
  };

  if (axis === "z") {
    return (
      <mesh {...hoverProps}>
        {/* torus lies in the XY plane = circles the Z axis */}
        <torusGeometry args={[1.7, 0.07, 12, 64]} />
        <meshBasicMaterial color={AXIS_COLORS.z} transparent opacity={0.9} />
      </mesh>
    );
  }

  return (
    <group rotation={axis === "x" ? [0, 0, -Math.PI / 2] : [0, 0, 0]}>
      <mesh position={[0, 1.5, 0]} {...hoverProps}>
        <cylinderGeometry args={[0.09, 0.09, 3, 12]} />
        <meshBasicMaterial color={AXIS_COLORS[axis]} transparent opacity={0.9} />
      </mesh>
    </group>
  );
}

// Lone interactive tile above the ribbon. Starts at the ribbon's orientation
// (X = PITCH, Y = TILT). Grab a colored axis bar and drag to rotate around
// that axis. In the info box: type exact degrees, or scrub by dragging the
// axis label left/right. Mouse wheel over the tile still rolls Z.
function DebugTile({ geometry, position = [0, 3.6, 0] }) {
  const [rot, setRot] = useState({ x: PITCH, y: TILT, z: 0 });
  const drag = useRef(null); // { axis, px, py, scale }

  useEffect(() => {
    const onMove = (e) => {
      const d = drag.current;
      if (!d) return;
      const dx = e.clientX - d.px;
      const dy = e.clientY - d.py;
      d.px = e.clientX;
      d.py = e.clientY;
      // drag right or up = increase
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

  const [checkpoint, setCheckpoint] = useState("");
  const [copied, setCopied] = useState(false);
  const copyRotation = async () => {
    const deg = (v) => ((v * 180) / Math.PI).toFixed(1);
    const rad = (v) => v.toFixed(3);
    const text =
      `checkpoint ${checkpoint || "?"}: ` +
      `X ${deg(rot.x)}deg (${rad(rot.x)} rad), ` +
      `Y ${deg(rot.y)}deg (${rad(rot.y)} rad), ` +
      `Z ${deg(rot.z)}deg (${rad(rot.z)} rad)`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // clipboard unavailable (permissions) — show the text so it can be copied manually
      window.prompt("Copy:", text);
    }
  };

  return (
    <group position={position}>
      {/* grabbable world-axis bars */}
      <AxisHandle axis="x" onPointerDown={startDrag("x", 0.01)} />
      <AxisHandle axis="y" onPointerDown={startDrag("y", 0.01)} />
      <AxisHandle axis="z" onPointerDown={startDrag("z", 0.01)} />

      <group rotation={[rot.x, rot.y, rot.z]}>
        <ColoredAxes size={1.8} colors={LOCAL_AXES} />
        <mesh
          geometry={geometry}
          rotation={[0, 0, Math.PI / 2]}
          onWheel={(e) => {
            e.stopPropagation();
            setRot((r) => ({ ...r, z: r.z + e.deltaY * 0.002 }));
          }}
        >
          <meshLambertMaterial vertexColors transparent opacity={0.95} />
        </mesh>
      </group>

      {/* anchored on the tile's screen-right side (world -x), grows away from it */}
      <Html position={[-8.0, 2.0, 0]} style={{ whiteSpace: "nowrap" }}>
        <div className="font-plex text-[0.7rem] leading-relaxed text-ink bg-page/80 border border-hairline rounded-md px-2.5 py-1.5 select-none">
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
              placeholder="32"
              className="w-12 bg-transparent border border-hairline rounded px-1 py-0.5 text-ink"
            />
            <button
              onClick={copyRotation}
              className="border border-hairline rounded px-2 py-0.5 text-ink-dim hover:text-ink hover:border-accent-dim transition-colors cursor-pointer"
            >
              {copied ? "copied!" : "copy"}
            </button>
            <button
              onClick={() => setRot({ x: PITCH, y: TILT, z: 0 })}
              title="back to the ribbon tiles' current rotation"
              className="border border-hairline rounded px-2 py-0.5 text-ink-dim hover:text-ink hover:border-accent-dim transition-colors cursor-pointer"
            >
              reset
            </button>
          </div>
          {/* load a choreography keyframe onto the tile to inspect / retune it */}
          <div className="mt-1.5 pt-1.5 border-t border-hairline flex items-center gap-1.5 flex-wrap">
            <span className="text-muted">show kf</span>
            {ROT_KEYFRAMES.map(({ pos, rot: kfRot }) => (
              <button
                key={pos}
                onClick={() => {
                  setRot({ x: kfRot[0], y: kfRot[1], z: kfRot[2] });
                  setCheckpoint(String(pos));
                }}
                className={`border rounded px-1.5 py-0.5 transition-colors cursor-pointer ${
                  checkpoint === String(pos)
                    ? "border-accent text-accent"
                    : "border-hairline text-ink-dim hover:text-ink hover:border-accent-dim"
                }`}
              >
                {pos}
              </button>
            ))}
          </div>
          <div className="mt-1.5 pt-1.5 border-t border-hairline grid grid-cols-2 gap-x-3">
            {Object.entries(SIDE_LEGEND).map(([side, label]) => (
              <div key={side} className="flex items-center gap-1.5">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-sm border border-hairline"
                  style={{ backgroundColor: SIDE_COLORS[side] }}
                ></span>
                <span className="text-muted">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </Html>
    </group>
  );
}

// Two movable lamps with an info panel: pick a light (1/2), scrub the axis
// labels (or type values) to reposition it and adjust intensity live, toggle
// it on/off, then copy the result as ready-to-paste JSX props. X scrub is
// inverted so dragging right moves the lamp screen-right (world -x, camera
// looks from -z).
// Ordered screen-left to screen-right (world +x = screen-left).
const LIGHT_DEFAULTS = [
  { x: 8.5, y: 5.0, z: -6.0, intensity: 90, on: true },   // light 1 — left (key)
  { x: -1.8, y: 3.3, z: 4.5, intensity: 10, on: true },   // light 2 — center (deep fill)
  { x: -10.0, y: 2.5, z: -2.5, intensity: 60, on: true }, // light 3 — right (accent)
];
const LIGHT_ROWS = [
  { key: "x", label: "X (screen ←→)", color: AXIS_COLORS.x, scale: -0.03 },
  { key: "y", label: "Y (height)", color: AXIS_COLORS.y, scale: 0.03 },
  { key: "z", label: "Z (depth)", color: AXIS_COLORS.z, scale: 0.03 },
  { key: "intensity", label: "intensity", color: "#facc15", scale: 0.8 },
];

function DebugLight({ debug }) {
  const [lights, setLights] = useState(LIGHT_DEFAULTS);
  const [active, setActive] = useState(0);
  const light = lights[active];
  const drag = useRef(null); // { key, px, py, scale }

  // Patch only the currently selected light.
  const patchActive = (patch) =>
    setLights((ls) => ls.map((l, i) => (i === active ? { ...l, ...patch(l) } : l)));

  useEffect(() => {
    const onMove = (e) => {
      const d = drag.current;
      if (!d) return;
      const dx = e.clientX - d.px;
      const dy = e.clientY - d.py;
      d.px = e.clientX;
      d.py = e.clientY;
      // drag right or up = increase (X row inverts via negative scale)
      setLights((ls) =>
        ls.map((l, i) => {
          if (i !== active) return l;
          const v = l[d.key] + (dx - dy) * d.scale;
          return { ...l, [d.key]: d.key === "intensity" ? Math.max(0, v) : v };
        })
      );
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
  }, [active]);

  const startDrag = (key, scale) => (e) => {
    e.stopPropagation();
    if (e.preventDefault) e.preventDefault();
    drag.current = { key, px: e.clientX, py: e.clientY, scale };
  };

  const setValue = (key) => (e) => {
    const v = parseFloat(e.target.value);
    if (!Number.isNaN(v)) patchActive(() => ({ [key]: v }));
  };

  const [copied, setCopied] = useState(false);
  const copyLights = async () => {
    const text = lights
      .map(
        (l, i) =>
          `${l.on ? "" : "// (off) "}position={[${l.x.toFixed(1)}, ${l.y.toFixed(1)}, ${l.z.toFixed(1)}]} intensity={${Math.round(l.intensity)}}`
      )
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      window.prompt("Copy:", text);
    }
  };

  return (
    <>
      {lights.map(
        (l, i) =>
          l.on && (
            <pointLight
              key={i}
              position={[l.x, l.y, l.z]}
              intensity={l.intensity}
              decay={2}
              castShadow
              shadow-intensity={0.55}
              shadow-mapSize-width={1024}
              shadow-mapSize-height={1024}
              shadow-camera-near={0.5}
              shadow-camera-far={60}
              shadow-radius={16}
              shadow-blurSamples={24}
            />
          )
      )}
      {debug && (
      <>
      {/* lamp markers — yellow = selected, grey = the other one, faded = off */}
      {lights.map((l, i) => (
        <mesh key={i} position={[l.x, l.y, l.z]} renderOrder={11}>
          <sphereGeometry args={[0.14, 12, 12]} />
          <meshBasicMaterial
            color={i === active ? "#facc15" : "#8b9096"}
            transparent
            opacity={l.on ? 1 : 0.35}
            depthTest={false}
          />
        </mesh>
      ))}

      {/* panel sits just left of the debug tile's info box (which anchors at
          world [-8, 5.6]); this one grows rightward toward it */}
      <Html position={[-3.2, 5.6, 0]} style={{ whiteSpace: "nowrap" }}>
        <div className="font-plex text-[0.7rem] leading-relaxed text-ink bg-page/80 border border-hairline rounded-md px-2.5 py-1.5 select-none">
          <div className="mb-1 flex items-center gap-1.5">
            {lights.map((l, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                className={`border rounded px-1.5 py-0.5 transition-colors cursor-pointer ${
                  active === i
                    ? "border-accent text-accent"
                    : "border-hairline text-ink-dim hover:text-ink hover:border-accent-dim"
                }`}
              >
                light {i + 1}
              </button>
            ))}
            <button
              onClick={() => patchActive((l) => ({ on: !l.on }))}
              title="toggle the selected light"
              className={`border rounded px-1.5 py-0.5 transition-colors cursor-pointer ${
                light.on
                  ? "border-emerald-400/60 text-emerald-300"
                  : "border-hairline text-faint hover:text-ink"
              }`}
            >
              {light.on ? "on" : "off"}
            </button>
          </div>
          {LIGHT_ROWS.map(({ key, label, color, scale }) => (
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
                step={key === "intensity" ? "10" : "0.5"}
                value={key === "intensity" ? Math.round(light[key]) : light[key].toFixed(1)}
                onChange={setValue(key)}
                className="w-16 bg-transparent border border-hairline rounded px-1 py-0.5 text-ink"
              />
            </div>
          ))}
          <div className="mt-1.5 pt-1.5 border-t border-hairline flex items-center gap-2">
            <button
              onClick={copyLights}
              className="border border-hairline rounded px-2 py-0.5 text-ink-dim hover:text-ink hover:border-accent-dim transition-colors cursor-pointer"
            >
              {copied ? "copied!" : "copy"}
            </button>
            <button
              onClick={() => patchActive(() => ({ ...LIGHT_DEFAULTS[active] }))}
              className="border border-hairline rounded px-2 py-0.5 text-ink-dim hover:text-ink hover:border-accent-dim transition-colors cursor-pointer"
            >
              reset
            </button>
          </div>
        </div>
      </Html>
      </>
      )}
    </>
  );
}

export default function CuboidScene({ debug = false }) {
  const geometry = useMemo(() => makeTileGeometry(), []);
  const debugGeometry = useMemo(() => makeDebugTileGeometry(), []);
  return (
    <div className="h-full w-full">
      <Canvas
        shadows="variance"
        orthographic
        camera={{ zoom: 55, position: [0, 1.2, -14] }}
        onCreated={({ camera }) => camera.lookAt(0, 0, 0)}
      >
        <ambientLight intensity={0.28} />
        {/* lamp hung high above the ribbon, pulled slightly toward the camera.
            decay=2 is physical inverse-square falloff: the lower a tile dips,
            the farther it is from the lamp, the darker it gets — for free.
            With decay 2, intensity is in candela-like units, hence the big number.
            DebugLight wraps the point light with a live position/intensity panel. */}
        <DebugLight debug={debug} />
        <TileRibbon geometry={geometry} debug={debug} />
        {debug && <DebugTile geometry={debugGeometry} />}
      </Canvas>
    </div>
  );
}
