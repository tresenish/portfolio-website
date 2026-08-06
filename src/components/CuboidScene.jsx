// "2D like 3D" tile ribbon — a chain of thin rounded tiles stacked along the
// x-axis, each twisted around the chain axis, forming a waving fanned ribbon.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import {
  Shape,
  ExtrudeGeometry,
  AdditiveBlending,
  AxesHelper,
  BufferAttribute,
  Color,
  CanvasTexture,
  NormalBlending,
  RepeatWrapping,
  Euler,
  Vector3,
} from "three";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";

// RectAreaLight needs its BRDF lookup tables initialized once per app.
RectAreaLightUniformsLib.init();

const SPACING = 0.7;       // distance between tile centers along the chain
const HOVER_LIFT = 0.9;    // how far a hovered tile rises (world units)
const HOVER_EASE = 10;     // lift ease-in/out speed (higher = snappier)
const SCROLL_SPEED = 1.0;  // marquee drift, world units per second
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
  { pos: 1, rot: [-2.038, -0.154, 0.310] }, // X -116.7°, Y -8.8°, Z 17.7°
  { pos: 2, rot: [-2.159, -0.091, 0.490] }, // X -123.7°, Y -5.2°, Z 28.1°
  { pos: 10, rot: [-1.339, -0.021, 0.492] }, // X -76.7°, Y -1.2°, Z 28.2°
  { pos: 19, rot: [-2.612, -0.452, 0.112] }, // X -149.6°, Y -25.9°, Z 6.4°
  { pos: 21, rot: [-2.310, -0.452, 0.112] }, // X -132.4°, Y -25.9°, Z 6.4° — at the spike
  { pos: 27, rot: [-1.171, 0.212, 0.605] },  // X -67.1°, Y 12.2°, Z 34.7° — recover in the U
  { pos: 30, rot: [-1.768, 0.177, 0.826] },  // X -101.3°, Y 10.1°, Z 47.3°
  { pos: 35, rot: [-1.89, -0.28, 0.43] },
];
const KEY_FADE = 3;

// Hand-tuned path baked from the drag editor: y at checkpoints 1..36
// (1 = visible screen-left edge). Interpolated with a Catmull-Rom spline.
const PATH_Y = [
  0.502, -0.192, -0.461, -0.391, -0.353, -0.268, -0.111, -0.017, 0.151,
  0.235, 0.367, 0.205, 0.101, -0.104, -0.470, -0.726, -0.979, -0.934,
  -0.803, -0.209, 1.997, 0.909, 0.275, -0.130, -0.421, -0.561, -0.629,
  -0.378, 0.001, 0.276, 0.635, 0.459, 0.330, 0.421, 0.457, 0.500,
];

// Depth per checkpoint (world z; 0 = the ribbon's original plane, negative =
// toward the camera). Current shape: one smooth run from -5 (left edge,
// closest to the viewer) to +5 (off-screen right, farthest) — an eased
// smoothstep ramp, no return arc. Previous full-width arc (edges near,
// checkpoint 21 far): [-5.000, -4.930, -4.720, -4.390, -3.960, -3.440,
// -2.840, -2.180, -1.480, -0.750, -0.048, 0.711, 1.353, 2.044, 2.744,
// 3.431, 3.914, 4.380, 4.724, 4.930, 5.027, 4.777, 4.419, 3.764, 3.031,
// 2.157, 1.060, 0.072, -1.136, -2.291, -3.103, -3.877, -4.536, -4.902,
// -5.031, -5.000]
const PATH_Z = [
  -5.000, -4.976, -4.906, -4.792, -4.638, -4.446, -4.219, -3.960, -3.671,
  -3.356, -3.017, -2.658, -2.280, -1.886, -1.480, -1.064, -0.641, -0.214,
  0.214, 0.641, 1.064, 1.480, 1.886, 2.280, 2.658, 3.017, 3.356,
  3.671, 3.960, 4.219, 4.446, 4.638, 4.792, 4.906, 4.976, 5.000,
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

// Entrance choreography: tiles start sunk below their path and rise into
// place in a wave sweeping screen-left → screen-right; the dust holds back
// and fades in once the ribbon has assembled. Reduced motion skips it all.
const INTRO_SWEEP = 1.2;   // s — delay spread across the screen width
const INTRO_RISE = 2.0;    // s — one tile's rise duration
const INTRO_DROP = 11;     // world units below the path at t = 0 (well below the canvas)
const INTRO_END = INTRO_SWEEP + INTRO_RISE;
const DUST_FADE_START = 2.4; // s — dust waits for the ribbon…
const DUST_FADE_DUR = 1.4;   // …then breathes in
const REDUCED_MOTION =
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// Fast zone: tiles accelerate between these checkpoints (they travel from
// higher positions to lower ones), which also stretches the gaps there.
// speed: 1 = disabled (uniform flow); raise to re-enable the warp.
const FAST_ZONE = { from: 27, to: 30, ramp: 2, speed: 2.0 };

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

// polarized phthalo green ramp — near-whites and deep blue-greens, no
// yellowish middle: the hue stays pinned on the pigment's cool green, the
// ramp just walks lightness from almost-white down to deep phthalo. 7 stops,
// coprime with the i*3 stride: the visit order (0,3,6,2,5,1,4) interleaves
// pale and deep stops, so the ribbon alternates white-ish and green tiles.
// Previous palettes for reference —
// polarized red ramp: ["#fff1ef", "#ffd6d1", "#ffb4ad", "#ef6a63", "#e14b44", "#d0322c", "#b71c1c"]
// blue ramp: ["#b5dcff", "#8ec8fd", "#67b1fa", "#4497f4", "#277ee9", "#1663d3", "#0d4bb5"]
// mineral (light): ["#d29285", "#d4ab88", "#e0ceaa", "#b3c19f", "#96b3a7", "#94b6c2", "#92a9c9", "#9ca2c4", "#ae9cbb", "#c495a2", "#aeb0b5"]
// pastel spectrum: ["#f59a90", "#f7b581", "#f5d27d", "#cfe184", "#96dd92", "#82dcbf", "#84cfec", "#8fb3f2", "#a893f0", "#d38fe4", "#f090bf"]
// shades of white: ["#ffffff", "#fafbfc", "#f5f7f9", "#f0f3f5", "#ebeef1", "#e5e9ed", "#dfe4e9"]
// faded red/orange/blue/purple (stride-ordered): ["#d05f50", "#bf5546", "#9678c2", "#5f8ecb", "#a184cf", "#82a9d6", "#dd8a55"]
// graphite: ["#3a3d43", "#43474e", "#4d5159", "#575c64", "#61666f", "#6b717b", "#757c86"]
export const COLORS = [
  "#eff9f5", // almost white
  "#cfeee2", // pale mint
  "#a0dcc6", // soft jade
  "#4fb494", // jade
  "#1f9377", // light phthalo
  "#0b7458", // phthalo
  "#07503d", // deep phthalo
];

// Rounded-rectangle slab: footprint width x depth, thin along y,
// only the 4 footprint corners rounded.
function makeTileGeometry({ width = 3.6, depth = 2.3, height = 0.06, radius = 0.26 } = {}) {
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

// Fine monochrome noise, generated once on a canvas. Used two ways:
// - relief variant (mid-grey, high contrast) as bump + roughness map — shows
//   where light rakes the surface at an angle (edges, tilted tiles);
// - color variant (near-white, low contrast) as albedo map — a subtle speckle
//   that stays visible even under head-on light, where bump shading vanishes.
export function makeGrainTexture({ size = 256, base = 108, amp = 48 } = {}) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = base + Math.random() * amp;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = RepeatWrapping;
  // UVs of the extruded shape are in world units (~3 across a face), so keep
  // the repeat low: one grain texel should span a couple of SCREEN pixels —
  // higher repeats minify the noise into flat grey via mipmapping.
  tex.repeat.set(0.12, 0.12);
  tex.anisotropy = 8; // keep the grain crisp at glancing angles
  return tex;
}

// Soft round sprite for the dust motes: a white radial gradient fading to
// transparent, so points render as feathered dots instead of hard squares.
export function makeDotTexture(size = 64) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.4, "rgba(255,255,255,0.6)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new CanvasTexture(canvas);
}

/* Sparse dust motes drifting along the ribbon's path — same conveyor flow as
   the tiles (each mote a little slower or faster), scattered loosely around
   the curve, bobbing gently, wrapping at the span edges like the tiles do.
   One Points cloud = one draw call; per frame it just refills a small
   position buffer, so the layer is essentially free. */
const DUST_PER_UNIT = 2.2; // motes per world unit of span…
const DUST_MAX = 70;       // …capped so wide screens stay sparse

// The dust rides its own copy of the path: same curve, but with the spike
// around checkpoint 21 leveled out (linear blend across the flanking
// samples), so the halo glides calmly past while the tiles whip through it.
const DUST_PATH_Y = (() => {
  const arr = [...PATH_Y];
  const from = 18; // 0-based: checkpoint 19, before the climb into the spike
  const to = 23;   // checkpoint 24, after the recovery
  for (let i = from + 1; i < to; i++) {
    arr[i] = lerp(PATH_Y[from], PATH_Y[to], (i - from) / (to - from));
  }
  return arr;
})();

function PathDust({ theme = "dark" }) {
  const pointsRef = useRef();
  const matRef = useRef();
  // Same layout math as TileRibbon, so the dust rides exactly the tiles' path.
  const screenWidth = useThree((s) => s.size.width);
  const viewportWidth = screenWidth / zoomFor(screenWidth);
  const span = Math.ceil((viewportWidth + 4) / SPACING) * SPACING;
  const originX = viewportWidth / 2;
  const step = viewportWidth / (CHECKPOINT_MAX - 1);
  const count = Math.min(DUST_MAX, Math.round(span * DUST_PER_UNIT));

  const sprite = useMemo(() => makeDotTexture(), []);
  const { params, positions, colors } = useMemo(() => {
    const params = Array.from({ length: count }, () => ({
      u0: Math.random() * span,               // start point on the conveyor
      speed: 0.55 + Math.random() * 0.9,      // × SCROLL_SPEED — slipstream spread
      // scatter in a halo AROUND the ribbon: the keep-out band of ±2 keeps
      // motes clear of the tiles themselves (slabs reach ~±1.8 around the
      // path), slightly more of them floating above than below
      dy: (Math.random() < 0.55 ? 1 : -1) * (2.0 + Math.random() * 1.8),
      dz: (Math.random() - 0.5) * 1.6,
      amp: 0.04 + Math.random() * 0.1,        // bob
      freq: 0.5 + Math.random() * 0.9,
      phase: Math.random() * Math.PI * 2,
    }));
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const b = 0.35 + Math.random() * 0.65; // per-mote brightness
      colors[i * 3] = colors[i * 3 + 1] = colors[i * 3 + 2] = b;
    }
    return { params, positions, colors };
  }, [count, span]);

  // Own accumulated time, same reason as the ribbon: survives frameloop
  // pauses. Starts past the fade-in under reduced motion (dust at full).
  const timeRef = useRef(REDUCED_MOTION ? DUST_FADE_START + DUST_FADE_DUR : 0);
  const targetOpacity = theme === "light" ? 0.35 : 0.55;
  useFrame((_, delta) => {
    timeRef.current += Math.min(delta, 0.1);
    const t = timeRef.current;
    // entrance: hold invisible while the ribbon assembles, then breathe in
    if (matRef.current && t < DUST_FADE_START + DUST_FADE_DUR) {
      const f = Math.min(1, Math.max(0, (t - DUST_FADE_START) / DUST_FADE_DUR));
      matRef.current.opacity = targetOpacity * smooth(f);
    }
    const pos = pointsRef.current?.geometry.attributes.position;
    if (!pos) return;
    for (let i = 0; i < count; i++) {
      const d = params[i];
      const u = (d.u0 + t * SCROLL_SPEED * d.speed) % span;
      const x = u - span / 2;
      const p = (originX - x) / step + 1;
      pos.setXYZ(
        i,
        x,
        sampleCurve(DUST_PATH_Y, p) + d.dy + Math.sin(t * d.freq + d.phase) * d.amp,
        sampleCurve(PATH_Z, p) + d.dz
      );
    }
    pos.needsUpdate = true;
  });

  return (
    /* key remounts the buffer when a resize changes the count; raycast is
       disabled so the cloud never blocks the tiles' hover lift */
    <points key={count} ref={pointsRef} frustumCulled={false} raycast={() => {}}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={positions} count={count} itemSize={3} />
        <bufferAttribute attach="attributes-color" array={colors} count={count} itemSize={3} />
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

function TileRibbon({ geometry, debug, grain }) {
  const ribbonRef = useRef();
  // Fill the visible width (plus margin) with tiles; they wrap around the
  // span like a conveyor belt, so the ribbon scrolls forever. The width is
  // derived from the same zoomFor() the camera uses — fiber's viewport state
  // is computed with the initial zoom and lags manual zoom changes, which
  // left edge gaps on scaled-down small screens.
  const screenWidth = useThree((s) => s.size.width);
  const viewportWidth = screenWidth / zoomFor(screenWidth);
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

  // Hover lift: the tile under the pointer eases up a little and settles
  // back down when the pointer leaves. Lift amounts live in a ref (no
  // re-renders) and blend into the frame loop's path position.
  const hoveredRef = useRef(null);
  const liftsRef = useRef(new Float32Array(0));
  if (liftsRef.current.length !== count) liftsRef.current = new Float32Array(count);

  // Conveyor progress is accumulated from deltas (not clock.elapsedTime) so
  // pausing the frameloop off-screen resumes exactly where it left off. The
  // delta clamp swallows the one big step after a pause.
  const scrollRef = useRef(0);
  // Intro clock: starts past the end under reduced motion (tiles in place).
  const introRef = useRef(REDUCED_MOTION ? INTRO_END : 0);
  useFrame((_, delta) => {
    scrollRef.current += Math.min(delta, 0.1) * SCROLL_SPEED;
    introRef.current += Math.min(delta, 0.1);
    const scroll = scrollRef.current;
    const intro = introRef.current;
    const lifts = liftsRef.current;
    const ease = Math.min(1, delta * HOVER_EASE);
    ribbonRef.current.children.forEach((tile, i) => {
      const u = (i * SPACING + scroll) % span; // uniform conveyor coordinate
      const x = warpX(u);
      const target = hoveredRef.current === i ? HOVER_LIFT : 0;
      lifts[i] += (target - lifts[i]) * ease;
      tile.position.x = x;
      tile.position.y = pathY(x) + lifts[i]; // fixed curvy path + hover lift
      tile.position.z = pathZ(x); // sculpted depth along the same path
      // rotation choreography, keyed by checkpoint position (1 = screen-left edge)
      const p = pOf(x);
      const [rx, ry, rz] = rotAtPos(p);
      tile.rotation.set(rx, ry, rz);
      // entrance wave: each tile slides up from below the canvas, in screen order
      if (intro < INTRO_END) {
        const wait = ((p - 1) / (CHECKPOINT_MAX - 1)) * INTRO_SWEEP;
        const k = smooth(Math.min(1, Math.max(0, (intro - wait) / INTRO_RISE)));
        tile.position.y -= (1 - k) * INTRO_DROP;
      }
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
            <mesh
              geometry={geometry}
              rotation={[0, 0, Math.PI / 2]}
              castShadow
              receiveShadow
              onPointerOver={(e) => {
                e.stopPropagation();
                hoveredRef.current = i;
              }}
              onPointerOut={() => {
                if (hoveredRef.current === i) hoveredRef.current = null;
              }}
            >
              <meshStandardMaterial
                color={COLORS[(i * 3) % COLORS.length]}
                map={grain.color}
                roughness={0.85}
                metalness={0}
                roughnessMap={grain.relief}
              />
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
                <DraggablePanel>
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
                </DraggablePanel>
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

// Wraps an info box with a screen-space drag offset: grab the dot at the
// top-left corner to move the box anywhere (offset is in CSS pixels, so it
// survives camera/viewport math untouched).
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

      {/* anchored on the tile's screen-right side (world -x), grows away from
          it; laid out as side-by-side columns to stay short and not cover
          the ribbon below */}
      <Html position={[-8.0, 2.0, 0]} style={{ whiteSpace: "nowrap" }}>
        <DraggablePanel>
        <div className="font-plex text-[0.7rem] leading-relaxed text-ink bg-page/80 border border-hairline rounded-md px-3 py-1.5 select-none flex gap-4">
          {/* column 1: live rotation + controls */}
          <div>
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
            <div className="mt-1.5 pt-1.5 border-t border-hairline grid grid-cols-3 gap-x-3">
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
          {/* column 2: the full choreography; click a row to load it */}
          <div className="border-l border-hairline pl-4">
            <div className="text-muted mb-0.5">keyframes (click to load)</div>
            <div>
              {ROT_KEYFRAMES.map(({ pos, rot: kfRot }) => {
                const deg = (v) => ((v * 180) / Math.PI).toFixed(1);
                const isActive = checkpoint === String(pos);
                return (
                  <div
                    key={pos}
                    onClick={() => {
                      setRot({ x: kfRot[0], y: kfRot[1], z: kfRot[2] });
                      setCheckpoint(String(pos));
                    }}
                    className={`flex items-baseline gap-2 py-0.5 cursor-pointer transition-colors ${
                      isActive ? "text-accent" : "text-ink-dim hover:text-ink"
                    }`}
                  >
                    <span className={`w-6 shrink-0 text-right ${isActive ? "" : "text-muted"}`}>{pos}</span>
                    <span className="whitespace-nowrap tabular-nums">
                      X {deg(kfRot[0])}° · Y {deg(kfRot[1])}° · Z {deg(kfRot[2])}°
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        </DraggablePanel>
      </Html>
    </group>
  );
}

// Two movable lamps with an info panel: pick a light (1/2), scrub the axis
// labels (or type values) to reposition it and adjust intensity live, toggle
// it on/off, then copy the result as ready-to-paste JSX props. X scrub is
// inverted so dragging right moves the lamp screen-right (world -x, camera
// looks from -z).
// Ordered screen-left to screen-right (world +x = screen-left). The last
// entry is a RectAreaLight "line" strip: it runs along x above the ribbon,
// faces straight down, and exposes width (length) + height (strip thickness)
// on top of the usual coords. Area lights don't cast shadows.
const degToRad = (d) => (d * Math.PI) / 180;
// Per-theme default rigs (same lamps, different on/off): dark runs just the
// center fill + line strip; light turns all three point lights on. Light 4
// is the line strip above the ribbon; rx/ry/rz aim it (degrees, rx -90 =
// straight down, rx 0 = at the camera side). ry slants the strip along the
// ribbon's depth ramp (PATH_Z runs -5 near / left edge to +5 far / right
// edge); 160 ≈ the 20° slant with the strip flipped, hand-tuned.
const LIGHT_DEFAULTS = {
  dark: [
    { x: 12.5, y: -3.5, z: -6.0, intensity: 40, on: false }, // light 1 — left (key, low)
    { x: 0.7, y: 3.3, z: 4.5, intensity: 30, on: true },     // light 2 — center (deep fill)
    { x: -9.0, y: 4.5, z: -7.0, intensity: 130, on: false }, // light 3 — right (accent)
    { x: 0.0, y: 8.5, z: 0.0, intensity: 10, width: 30, height: 1.4, rx: -230, ry: 160, rz: 0, on: true, line: true },
  ],
  light: [
    { x: 12.5, y: -3.5, z: -6.0, intensity: 40, on: true },  // light 1 — left (key, low)
    { x: 0.7, y: 3.3, z: 4.5, intensity: 30, on: true },     // light 2 — center (deep fill)
    { x: -9.0, y: 4.5, z: -7.0, intensity: 130, on: true },  // light 3 — right (accent)
    { x: 0.0, y: 8.5, z: 0.0, intensity: 10, width: 30, height: 1.4, rx: -230, ry: 160, rz: 0, on: true, line: true },
  ],
};
const LIGHT_ROWS = [
  { key: "x", label: "X (screen ←→)", color: AXIS_COLORS.x, scale: -0.03 },
  { key: "y", label: "Y (height)", color: AXIS_COLORS.y, scale: 0.03 },
  { key: "z", label: "Z (depth)", color: AXIS_COLORS.z, scale: 0.03 },
  { key: "intensity", label: "intensity", color: "#facc15", scale: 0.8 },
];
// Extra rows shown only while the line light is selected. Rotations are in
// degrees; the rays in the scene follow them live.
const LINE_ROWS = [
  { key: "width", label: "width (length)", color: "#f472b6", scale: 0.06 },
  { key: "height", label: "height (thick)", color: "#f472b6", scale: 0.01 },
  { key: "rx", label: "rot X (aim ↕)", color: AXIS_COLORS.x, scale: 2 },
  { key: "ry", label: "rot Y (swing ↔)", color: AXIS_COLORS.y, scale: 2 },
  { key: "rz", label: "rot Z (roll)", color: AXIS_COLORS.z, scale: 2 },
];

function DebugLight({ debug, theme = "dark" }) {
  const defaults = LIGHT_DEFAULTS[theme] ?? LIGHT_DEFAULTS.dark;
  const [lights, setLights] = useState(defaults);
  // Switching themes swaps in that theme's rig (drops unsaved panel edits).
  useEffect(() => {
    setLights(defaults);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);
  // uniform base fill; off by default so the line light owns the scene
  const [ambient, setAmbient] = useState({ intensity: 0.28, on: false });
  // shadow rig: RectAreaLights can't cast shadows, so a dim directional
  // light projects tile-on-tile shadows — but it also adds steady top light
  const [shadowRig, setShadowRig] = useState({ intensity: 0.9, on: true });
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
          const clamped =
            d.key === "intensity" ? Math.max(0, v)
            : d.key === "width" || d.key === "height" ? Math.max(0.05, v)
            : v;
          return { ...l, [d.key]: clamped };
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
    const text = [
      `${ambient.on ? "" : "// (off) "}ambient intensity={${ambient.intensity.toFixed(2)}}`,
      `${shadowRig.on ? "" : "// (off) "}shadow-rig directional intensity={${shadowRig.intensity.toFixed(1)}}`,
      ...lights.map((l) => {
        const base = `${l.on ? "" : "// (off) "}position={[${l.x.toFixed(1)}, ${l.y.toFixed(1)}, ${l.z.toFixed(1)}]}`;
        return l.line
          ? `${base} rot={[${Math.round(l.rx)}, ${Math.round(l.ry)}, ${Math.round(l.rz)}]}deg width={${l.width.toFixed(1)}} height={${l.height.toFixed(2)}} intensity={${Math.round(l.intensity)}} // line`
          : `${base} intensity={${Math.round(l.intensity)}}`;
      }),
    ].join("\n");
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
      {ambient.on && <ambientLight intensity={ambient.intensity} />}
      {shadowRig.on && (
        <directionalLight
          position={[2, 9, -5]}
          intensity={shadowRig.intensity}
          castShadow
          shadow-intensity={0.7}
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-left={-18}
          shadow-camera-right={18}
          shadow-camera-top={12}
          shadow-camera-bottom={-12}
          shadow-camera-near={0.5}
          shadow-camera-far={40}
          shadow-radius={10}
          shadow-blurSamples={20}
        />
      )}
      {lights.map(
        (l, i) =>
          l.on &&
          (l.line ? (
            // "sun line": RectAreaLights are one-sided, so two strips sit
            // back-to-back on the same transform and radiate both ways —
            // together they emit all around the line (rx/ry/rz still aims it)
            <group
              key={i}
              position={[l.x, l.y, l.z]}
              rotation={[degToRad(l.rx), degToRad(l.ry), degToRad(l.rz)]}
            >
              <rectAreaLight width={l.width} height={l.height} intensity={l.intensity} />
              <rectAreaLight rotation={[Math.PI, 0, 0]} width={l.width} height={l.height} intensity={l.intensity} />
            </group>
          ) : (
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
          ))
      )}
      {debug && (
      <>
      {/* lamp markers — yellow = selected, grey = others, faded = off;
          the line light draws as a thin bar matching its width, with ray
          arrows showing its emission direction (straight down, -y) */}
      {lights.map((l, i) => {
        const color = i === active ? "#facc15" : "#8b9096";
        return (
          <group
            key={i}
            position={[l.x, l.y, l.z]}
            rotation={l.line ? [degToRad(l.rx), degToRad(l.ry), degToRad(l.rz)] : [0, 0, 0]}
          >
            {l.line ? (
              // the bar is split into segments shaded by camera distance:
              // the end nearer the viewer draws bright, the far end dark
              (() => {
                const N = 12;
                const euler = new Euler(degToRad(l.rx), degToRad(l.ry), degToRad(l.rz));
                const segs = Array.from({ length: N }, (_, s) => {
                  const t = (-0.5 + (s + 0.5) / N) * l.width;
                  const wz = l.z + new Vector3(t, 0, 0).applyEuler(euler).z;
                  return { t, wz };
                });
                const zs = segs.map((s) => s.wz);
                const zmin = Math.min(...zs);
                const zmax = Math.max(...zs);
                return segs.map(({ t, wz }, s) => {
                  // camera sits at -z, so smaller world z = closer to the user
                  const f = zmax === zmin ? 0 : (wz - zmin) / (zmax - zmin);
                  const opacity = (l.on ? 1 : 0.35) * (1 - 0.7 * f);
                  return (
                    <mesh key={s} position={[t, 0, 0]} renderOrder={11}>
                      <boxGeometry args={[l.width / N, 0.25, 0.08]} />
                      <meshBasicMaterial color={color} transparent opacity={opacity} depthTest={false} />
                    </mesh>
                  );
                });
              })()
            ) : (
              <mesh renderOrder={11}>
                <sphereGeometry args={[0.14, 12, 12]} />
                <meshBasicMaterial
                  color={color}
                  transparent
                  opacity={l.on ? 1 : 0.35}
                  depthTest={false}
                />
              </mesh>
            )}
            {/* the strip now emits from both faces (sun line), so rays fan
                out both ways along local ±z; they fade with distance */}
            {l.line &&
              l.on &&
              Array.from({ length: 7 }, (_, k) => {
                const t = (k / 6 - 0.5) * l.width * 0.9;
                const SEGMENTS = [0.75, 0.5, 0.3, 0.15];
                const segLen = 0.7;
                return (
                  <group key={k} position={[t, 0, 0]}>
                    {[-1, 1].map((dir) => (
                      <group key={dir}>
                        {SEGMENTS.map((op, s) => (
                          <mesh
                            key={s}
                            position={[0, 0, dir * (s + 0.5) * segLen]}
                            rotation={[Math.PI / 2, 0, 0]}
                            renderOrder={11}
                          >
                            <cylinderGeometry args={[0.012, 0.012, segLen, 6]} />
                            <meshBasicMaterial color={color} transparent opacity={op} depthTest={false} />
                          </mesh>
                        ))}
                        <mesh
                          position={[0, 0, dir * (SEGMENTS.length * segLen + 0.08)]}
                          rotation={[dir > 0 ? Math.PI / 2 : -Math.PI / 2, 0, 0]}
                          renderOrder={11}
                        >
                          <coneGeometry args={[0.05, 0.16, 8]} />
                          <meshBasicMaterial color={color} transparent opacity={0.12} depthTest={false} />
                        </mesh>
                      </group>
                    ))}
                  </group>
                );
              })}
          </group>
        );
      })}

      {/* panel sits just left of the debug tile's info box (which anchors at
          world [-8, 5.6]); this one grows rightward toward it */}
      <Html position={[-3.2, 5.6, 0]} style={{ whiteSpace: "nowrap" }}>
        <DraggablePanel>
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
                {l.line ? "line" : `light ${i + 1}`}
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
          {[...LIGHT_ROWS, ...(light.line ? LINE_ROWS : [])].map(({ key, label, color, scale }) => (
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
                step={key === "intensity" ? "10" : key === "rx" || key === "ry" || key === "rz" ? "5" : "0.5"}
                value={key === "intensity" ? Math.round(light[key]) : light[key].toFixed(1)}
                onChange={setValue(key)}
                className="w-16 bg-transparent border border-hairline rounded px-1 py-0.5 text-ink"
              />
            </div>
          ))}
          {/* all lights at a glance (click a row to select it for editing) */}
          <div className="mt-1.5 pt-1.5 border-t border-hairline">
            {lights.map((l, i) => (
              <div
                key={i}
                onClick={() => setActive(i)}
                className={`flex items-baseline gap-2 py-0.5 cursor-pointer transition-colors ${
                  i === active ? "text-ink" : "text-muted hover:text-ink-dim"
                }`}
              >
                <span className={`w-7 shrink-0 ${i === active ? "text-accent" : ""}`}>
                  {l.line ? "line" : `L${i + 1}`}
                </span>
                <span className="whitespace-nowrap">
                  [{l.x.toFixed(1)}, {l.y.toFixed(1)}, {l.z.toFixed(1)}] · {Math.round(l.intensity)}
                  {l.line &&
                    ` · rot [${Math.round(l.rx)}, ${Math.round(l.ry)}, ${Math.round(l.rz)}]° · ${l.width.toFixed(1)}×${l.height.toFixed(2)}`}
                </span>
                {!l.on && <span className="text-faint">(off)</span>}
              </div>
            ))}
          </div>
          {/* scene-wide base fill, independent of the selected light */}
          <div className="mt-1.5 pt-1.5 border-t border-hairline flex items-center gap-2">
            <button
              onClick={() => setAmbient((a) => ({ ...a, on: !a.on }))}
              className={`border rounded px-1.5 py-0.5 transition-colors cursor-pointer ${
                ambient.on
                  ? "border-emerald-400/60 text-emerald-300"
                  : "border-hairline text-faint hover:text-ink"
              }`}
            >
              ambient {ambient.on ? "on" : "off"}
            </button>
            <input
              type="number"
              step="0.05"
              min="0"
              value={ambient.intensity.toFixed(2)}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (!Number.isNaN(v)) setAmbient((a) => ({ ...a, intensity: Math.max(0, v) }));
              }}
              className="w-16 bg-transparent border border-hairline rounded px-1 py-0.5 text-ink"
            />
            <button
              onClick={() => setShadowRig((s) => ({ ...s, on: !s.on }))}
              title="directional light that projects tile shadows (area lights can't)"
              className={`border rounded px-1.5 py-0.5 transition-colors cursor-pointer ${
                shadowRig.on
                  ? "border-emerald-400/60 text-emerald-300"
                  : "border-hairline text-faint hover:text-ink"
              }`}
            >
              shadow {shadowRig.on ? "on" : "off"}
            </button>
            <input
              type="number"
              step="0.1"
              min="0"
              value={shadowRig.intensity.toFixed(1)}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (!Number.isNaN(v)) setShadowRig((s) => ({ ...s, intensity: Math.max(0, v) }));
              }}
              className="w-16 bg-transparent border border-hairline rounded px-1 py-0.5 text-ink"
            />
          </div>
          <div className="mt-1.5 pt-1.5 border-t border-hairline flex items-center gap-2">
            <button
              onClick={copyLights}
              className="border border-hairline rounded px-2 py-0.5 text-ink-dim hover:text-ink hover:border-accent-dim transition-colors cursor-pointer"
            >
              {copied ? "copied!" : "copy"}
            </button>
            <button
              onClick={() => patchActive(() => ({ ...defaults[active] }))}
              className="border border-hairline rounded px-2 py-0.5 text-ink-dim hover:text-ink hover:border-accent-dim transition-colors cursor-pointer"
            >
              reset
            </button>
          </div>
        </div>
        </DraggablePanel>
      </Html>
      </>
      )}
    </>
  );
}

// Zoom rules: desktop widths (SMALL_WIDTH..1728) keep the fixed baseline
// zoom; wider desktop screens (full HD and up) scale the scene up a touch,
// capped so 4K doesn't balloon. Below SMALL_WIDTH the scene scales DOWN with
// the viewport, so phones see the whole ribbon smaller instead of a zoomed-in
// crop — floored so tiles don't shrink to specks. Pure function of width so
// the camera and the ribbon layout always agree.
const BASE_ZOOM = 55;
// Baseline holds from small desktop through 2K (MacBook, FHD, 1440p all see
// the same tile scale — wider screens just see more ribbon); only 4K-class
// widths scale up, still capped.
const ZOOM_REF_WIDTH = 2560;
const ZOOM_MAX_SCALE = 1.15;
const SMALL_WIDTH = 1024;
const ZOOM_MIN_SCALE = 0.4;

function zoomFor(width) {
  const scale =
    width < SMALL_WIDTH
      ? Math.max(ZOOM_MIN_SCALE, width / SMALL_WIDTH)
      : Math.min(ZOOM_MAX_SCALE, Math.max(1, width / ZOOM_REF_WIDTH));
  return BASE_ZOOM * scale;
}

function ResponsiveZoom() {
  const camera = useThree((s) => s.camera);
  const width = useThree((s) => s.size.width);
  useEffect(() => {
    camera.zoom = zoomFor(width);
    camera.updateProjectionMatrix();
  }, [camera, width]);
  return null;
}

// debug: { checkpoints, tile, lights } — per-box switches from the topbar
// dropdown (path markers + copy button, rotation tile, light panel).
// theme: "dark" | "light" — picks the matching default light rig.
export default function CuboidScene({ debug = {}, theme = "dark" }) {
  const geometry = useMemo(() => makeTileGeometry(), []);
  const debugGeometry = useMemo(() => makeDebugTileGeometry(), []);
  const grain = useMemo(
    () => ({
      relief: makeGrainTexture(), // mid-grey, strong — bump + roughness
      color: makeGrainTexture({ base: 246, amp: 9 }), // near-white, subtle — albedo
    }),
    []
  );
  // Stop the render loop entirely while the hero is scrolled out of view —
  // the WebGL context stays alive (no re-init cost), but no frames are drawn
  // and no useFrame work runs. Animations are delta-accumulated, so they
  // freeze and resume seamlessly. (Background tabs are already covered by
  // the browser throttling requestAnimationFrame.)
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
        shadows="variance"
        orthographic
        camera={{ zoom: BASE_ZOOM, position: [0, 1.2, -14] }}
        onCreated={({ camera }) => camera.lookAt(0, 0, 0)}
      >
        <ResponsiveZoom />
        {/* ambient fill + shadow-rig directional live in DebugLight now
            (each has a panel switch) */}
        {/* lamp hung high above the ribbon, pulled slightly toward the camera.
            decay=2 is physical inverse-square falloff: the lower a tile dips,
            the farther it is from the lamp, the darker it gets — for free.
            With decay 2, intensity is in candela-like units, hence the big number.
            DebugLight wraps the point light with a live position/intensity panel. */}
        <DebugLight debug={debug.lights} theme={theme} />
        <TileRibbon geometry={geometry} debug={debug.checkpoints} grain={grain} />
        <PathDust theme={theme} />
        {debug.tile && <DebugTile geometry={debugGeometry} />}
      </Canvas>
    </div>
  );
}
