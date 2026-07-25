// "2D like 3D" tile ribbon — a chain of thin rounded tiles stacked along the
// x-axis, each twisted around the chain axis, forming a waving fanned ribbon.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { Shape, ExtrudeGeometry, AxesHelper, BufferAttribute, Color } from "three";

const SPACING = 0.7;       // distance between tile centers along the chain
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

// Smooth curve through PATH_Y at checkpoint position p (clamped outside 1..36).
function pathAt(p) {
  const n = PATH_Y.length;
  const t = p - 1; // 0-based along the samples
  if (t <= 0) return PATH_Y[0];
  if (t >= n - 1) return PATH_Y[n - 1];
  const i = Math.floor(t);
  const f = t - i;
  const y0 = PATH_Y[Math.max(0, i - 1)];
  const y1 = PATH_Y[i];
  const y2 = PATH_Y[i + 1];
  const y3 = PATH_Y[Math.min(n - 1, i + 2)];
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

// palette in the spirit of the reference (pinks / violets / blues)
const COLORS = ["#f9a8d4", "#ec4899", "#be185d", "#a78bfa", "#60a5fa"];

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

function TileRibbon({ geometry }) {
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

  // Fixed hand-tuned path baked into PATH_Y (no randomness anymore).
  const basePathY = useMemo(() => {
    return (x) => pathAt((originX - x) / step + 1);
  }, [originX, step]);

  // Hand-edited per-checkpoint offsets (dragged markers), blended smoothly
  // between neighboring checkpoints on top of the generated path.
  const [offsets, setOffsets] = useState({});
  const pathY = useMemo(() => {
    return (x) => {
      const p = (originX - x) / step + 1;
      const i = Math.floor(p);
      const t = smooth(p - i);
      const o = lerp(offsets[i] || 0, offsets[i + 1] || 0, t);
      return basePathY(x) + o;
    };
  }, [basePathY, offsets, originX, step]);

  // Drag a checkpoint marker up/down to edit the path.
  const dragRef = useRef(null); // { index, py, start }
  const worldPerPx = useThree((s) => s.viewport.height / s.size.height);
  useEffect(() => {
    const move = (e) => {
      const d = dragRef.current;
      if (!d) return;
      const dy = (d.py - e.clientY) * worldPerPx; // screen up = world up
      setOffsets((prev) => ({ ...prev, [d.index]: d.start + dy }));
    };
    const up = () => {
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
      pts.push({ p, x, y: pathY(x) });
    }
    return pts;
  }, [originX, step, pathY]);

  // Copy the whole edited path (final y per checkpoint) to the clipboard.
  const [copied, setCopied] = useState(false);
  const copyPath = () => {
    const text = checkpoints
      .map(({ p, y }) => {
        const off = offsets[p];
        const offNote = off ? ` (offset ${off > 0 ? "+" : ""}${off.toFixed(2)})` : "";
        return `checkpoint ${p}: y ${y.toFixed(3)}${offNote}`;
      })
      .join("\n");
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
      <group>
        {checkpoints.map(({ p, x, y }) => (
          <group key={p} position={[x, y, 0]}>
            <mesh>
              <sphereGeometry args={[0.07, 12, 12]} />
              <meshBasicMaterial color={offsets[p] ? "#fb923c" : "#facc15"} />
            </mesh>
            {/* invisible fat hit area so the marker is easy to grab */}
            <mesh
              onPointerDown={(e) => {
                e.stopPropagation();
                dragRef.current = { index: p, py: e.clientY, start: offsets[p] || 0 };
                document.body.style.cursor = "ns-resize";
              }}
              onPointerOver={() => {
                if (!dragRef.current) document.body.style.cursor = "ns-resize";
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
              style={{ pointerEvents: "none" }}
              zIndexRange={[40, 30]}
            >
              <div className="font-plex text-[0.62rem] text-ink bg-page/70 rounded px-1 leading-tight text-center">
                {p}
                {offsets[p] ? (
                  <div className="text-[0.55rem] text-accent">
                    {offsets[p] > 0 ? "+" : ""}
                    {offsets[p].toFixed(2)}
                  </div>
                ) : null}
              </div>
            </Html>
          </group>
        ))}
      </group>

      {/* copy the full edited path (bottom-center, inside the visible area) */}
      <Html center position={[0, -3.2, 0]} zIndexRange={[40, 30]}>
        <button
          className="font-plex text-[0.62rem] text-ink bg-page/80 border border-hairline rounded px-2 py-1 cursor-pointer hover:text-accent transition-colors whitespace-nowrap"
          onClick={copyPath}
        >
          {copied ? "copied!" : "copy path"}
        </button>
      </Html>
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
      <Html position={[-2.9, 0.6, 0]} style={{ whiteSpace: "nowrap", transform: "translateY(-160px)" }}>
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

export default function CuboidScene() {
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
        <ambientLight intensity={0.5} />
        {/* far screen-left (world +x, camera looks from -z), high above the tiles */}
        <directionalLight
          position={[18, 10, 0]}
          intensity={1.3}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-left={-30}
          shadow-camera-right={30}
          shadow-camera-top={15}
          shadow-camera-bottom={-15}
          shadow-camera-near={0.1}
          shadow-camera-far={60}
          shadow-radius={10}
          shadow-blurSamples={16}
        />
        <TileRibbon geometry={geometry} />
        <DebugTile geometry={debugGeometry} />
      </Canvas>
    </div>
  );
}
