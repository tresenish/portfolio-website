// Disc sphere — the Motion study scene: a sphere sketched from flat
// circles. A stack of pure planes traces the sphere's profile (radius =
// the sphere's cross-section at each height); each circle is a dark face
// with a colored border, so the body reads as dark layers traced by
// glowing rings. The stack axis tilts toward the viewer, showing the
// rings converging at the pole. A radial wave travels pole to pole —
// circles swell as it passes — and each border's shade of phthalo rides
// the wave: near-black at rest, true phthalo on the swell.
import React, { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer } from "@react-three/drei";
import { Color, DoubleSide } from "three";

// Only each circle's border wears the ramp; the faces stay plain. Borders
// rest at true phthalo and LIGHTEN as the wave crest passes — a jade flash
// running over standing green rings. Same ramp on both themes; the faces
// invert (dark body on the dark page, pale on the light).
const RAMPS = {
  dark: ["#032e23", "#054232", "#07503d", "#15805f", "#269572", "#3faa87", "#63bfa0"],
  light: ["#032e23", "#054232", "#07503d", "#15805f", "#269572", "#3faa87", "#63bfa0"],
};
Object.keys(RAMPS).forEach((k) => (RAMPS[k] = RAMPS[k].map((c) => new Color(c))));
const FACE_COLORS = { dark: "#020907", light: "#eef4f1" };
const BORDER = 0.035;         // colored border width, world units

const RADIUS = 2.3;   // sphere radius, world units
const DISCS = 24;     // circles in the stack
const WAVES = true;       // master switch: false = still sphere, no wave at all
const WAVE_SPEED = 1.8;   // how fast the swell travels pole to pole
const WAVE_PHASE = 0.5;   // phase offset between neighboring discs
const WAVE_AMP = 0.01;    // radial swell amplitude

// Fill the canvas: keep the sphere comfortably framed.
function FitZoom() {
  const camera = useThree((s) => s.camera);
  const width = useThree((s) => s.size.width);
  const height = useThree((s) => s.size.height);
  useEffect(() => {
    camera.zoom = Math.min(width / 14, height / 8.2);
    camera.updateProjectionMatrix();
  }, [camera, width, height]);
  return null;
}

function Sphere({ theme = "dark" }) {
  const groupRef = useRef();
  const meshRefs = useRef([]);
  const matRefs = useRef([]);
  const shadeColor = useMemo(() => new Color(), []);
  const ramp = RAMPS[theme] ?? RAMPS.dark;

  // The stack: flat circles spaced evenly along the axis, radius following
  // the sphere's profile — pure planes, no thickness.
  const discs = useMemo(() => {
    const step = (2 * RADIUS) / DISCS;
    return Array.from({ length: DISCS }, (_, i) => {
      const y = -RADIUS + step * (i + 0.5);
      return { y, r: Math.sqrt(Math.max(0.02, RADIUS * RADIUS - y * y)) };
    });
  }, []);

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    for (let i = 0; i < DISCS; i++) {
      // the traveling swell: crest rolls from pole to pole and wraps
      const w = WAVES ? Math.sin(t * WAVE_SPEED - i * WAVE_PHASE) : -1;
      const mesh = meshRefs.current[i];
      if (mesh) {
        const s = WAVES ? 1 + WAVE_AMP * w : 1;
        mesh.scale.set(s, 1, s); // radial only — thickness stays put
      }
      // borders rest at phthalo and only lighten as the crest passes: the
      // wave is squashed to a narrow peaked highlight (negative half → 0,
      // positive half raised to a power so the flash hugs the crest)
      const mat = matRefs.current[i];
      if (mat) {
        const f = Math.pow(Math.max(0, w), 2.5);
        const fx = f * (ramp.length - 1);
        const fi = Math.min(ramp.length - 2, Math.floor(fx));
        shadeColor.lerpColors(ramp[fi], ramp[fi + 1], fx - fi);
        mat.color.copy(shadeColor);
      }
    }
    // no rotation — the stack holds its pose (tip up and to the right,
    // leaning a little toward the viewer); the only whole-body motion is
    // the gentle float
    const g = groupRef.current;
    if (g) {
      g.position.y = 0.25 + Math.sin(t * 0.5) * 0.12;
    }
  });

  return (
    <group ref={groupRef} rotation={[0.55, 0, -0.6]}>
      {discs.map((d, i) => {
        const inner = Math.max(0.01, d.r - BORDER);
        return (
          /* one flat layer: dark circle face + colored ring border, edge to
             edge in the same plane (no overlap, no z-fighting) */
          <group key={i} ref={(g) => (meshRefs.current[i] = g)} position={[0, d.y, 0]}>
            {/* glossy faces: low roughness + a little metalness so the point
                light above the tip throws a sharp glare that sweeps across
                the stacked planes */}
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[inner, 56]} />
              <meshStandardMaterial
                color={FACE_COLORS[theme] ?? FACE_COLORS.dark}
                side={DoubleSide}
                roughness={theme === "light" ? 0.18 : 0.55}
                metalness={theme === "light" ? 0.15 : 0.04}
                envMapIntensity={theme === "light" ? 0.7 : 0.16}
              />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[inner, d.r, 64]} />
              <meshStandardMaterial
                ref={(m) => (matRefs.current[i] = m)}
                side={DoubleSide}
                roughness={0.28}
                metalness={0.15}
                envMapIntensity={0.65}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

export default function DiscSphereScene({ theme = "dark" }) {
  return (
    <div className="h-full w-full">
      <Canvas
        orthographic
        camera={{ zoom: 46, position: [0, 1.8, 13] }}
        onCreated={({ camera }) => camera.lookAt(0, 0.2, 0)}
      >
        <FitZoom />
        {/* studio softboxes for specular life on the disc edges — kept dim
            on the dark theme so the glossy dark faces don't mirror them
            into a grey wash; the small hot panel below stays the one glare */}
        <Environment resolution={256}>
          <Lightformer form="rect" intensity={theme === "light" ? 3 : 1.1} position={[0, 6, -8]} scale={[12, 6, 1]} />
          <Lightformer form="rect" intensity={theme === "light" ? 1.2 : 0.55} position={[-8, 3, 3]} rotation={[0, Math.PI / 2, 0]} scale={[8, 4, 1]} />
          <Lightformer form="rect" intensity={theme === "light" ? 0.9 : 0.45} color="#dfe6ee" position={[8, 4, 2]} rotation={[0, -Math.PI / 2, 0]} scale={[8, 4, 1]} />
          {/* small hot panel in the glare direction: this is what the glossy
              faces visibly mirror as a bright streak of glare */}
          <Lightformer form="rect" intensity={7} position={[4.5, 5, -4.5]} scale={[2.5, 2.5, 1]} />
        </Environment>
        <ambientLight intensity={theme === "light" ? 0.85 : 0.7} />
        <hemisphereLight
          intensity={theme === "light" ? 0.6 : 0.5}
          color="#e8edf4"
          groundColor={theme === "light" ? "#c8ccd2" : "#3a3d43"}
        />
        {/* overhead key: straight above, pulled toward the camera — the lamp
            that actually shows the pigment. Without it the deep greens read
            as pure black on the dark page. */}
        <directionalLight position={[0, 9, 4]} intensity={theme === "light" ? 1.6 : 2.4} />
        <directionalLight position={[6, 8, 6]} intensity={theme === "light" ? 1.1 : 1.0} />
        {/* cool rim from behind, stronger on dark */}
        <directionalLight position={[-5, 4, -9]} intensity={theme === "light" ? 0.3 : 0.9} color="#aac2e2" />
        {/* glare lamp: positioned at the mirror direction of the camera
            about the tilted faces (top-right, slightly BEHIND the sphere) —
            only from there does its specular reflection actually reach the
            viewer's eye. decay 2 = physical inverse-square falloff. */}
        <pointLight position={[3.1, 3.8, -3.2]} intensity={theme === "light" ? 40 : 18} decay={2} />
        <Sphere theme={theme} />
        {/* soft contact shadow pooling straight under the sphere — rendered
            top-down and heavily blurred, so it stays centered and diffuse
            no matter where the lights sit, and tracks the float bob */}
        <ContactShadows
          position={[0, -3.3, 0]}
          scale={11}
          far={4.5}
          blur={3}
          resolution={256}
          opacity={theme === "light" ? 0.3 : 0.42}
          color={theme === "light" ? "#1c1e21" : "#000000"}
        />
      </Canvas>
    </div>
  );
}
