// Full-stack factory line — the below-fold sibling of the hero ribbon.
// Three portal machines (frontend, backend, database) straddle real conveyor
// belts that run straight through their tunnels: frontend→backend and
// backend→frontend as a continuous pair, backend↔database as a shuttle that
// runs, pauses, and reverses. Bodies wear the tile ramp's reds; a studio
// environment map and floor shadows keep the hardware grounded.
import React, { useEffect, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Html, Lightformer, RoundedBox } from "@react-three/drei";
import { CanvasTexture, RepeatWrapping } from "three";

// Fine noise texture used as a roughnessMap on the large bodies — breaks up
// the perfectly-even shading that screams "CG primitive". Created once.
let grainTex = null;
function getGrain() {
  if (!grainTex && typeof document !== "undefined") {
    const size = 128;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d");
    const img = ctx.createImageData(size, size);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 110 + Math.random() * 70;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    grainTex = new CanvasTexture(canvas);
    grainTex.wrapS = grainTex.wrapT = RepeatWrapping;
    grainTex.repeat.set(2, 2);
  }
  return grainTex;
}

const STATIONS = [
  { key: "frontend", x: -5.6, label: "Frontend", stack: "React · TypeScript · Tailwind" },
  { key: "backend", x: 0, label: "Backend", stack: "Python · Django · REST" },
  { key: "database", x: 5.6, label: "Database", stack: "PostgreSQL" },
];
const GROUND_Y = -1.5;  // floor plane
const BELT_Y = -0.88;   // belt surface center height
const TUNNEL_Z = 1.15;  // half-depth of the portal tunnel (columns sit here)
const COL_H = 1.15;     // column height: ground → underside of the head unit
const HEAD_H = 1.5;     // the machine head that spans the tunnel

// The three belts, threaded through the station tunnels (ends hidden inside).
// A + B are the frontend↔backend pair; C is the backend↔database shuttle.
// Parcel colors come from the tile ramp: red out, rose back, deep red data.
// `doors` are factory shutters at the frontend machine's tunnel mouth
// (x = its right edge): they slide up as a parcel approaches and drop shut
// a beat after it passes.
// NUMBERING (used in conversation and everywhere in this file):
//   belt 1 — frontend → backend (requests, red parcels, front lane)
//   belt 2 — backend → frontend (responses, rose parcels, back lane)
//   belt 3 — backend ↔ database (shuttle: run, pause, reverse; crimson)
const FE_DOOR_X = -4.45;
const CONVEYORS = [
  { key: "belt1", x0: -6.3, x1: -0.8, z: 0.5, dir: 1, item: "#e14b44", doors: [FE_DOOR_X], cover: { from: -6.25, to: -4.48 } },   // belt 1: FE → BE
  { key: "belt2", x0: -6.3, x1: -0.8, z: -0.5, dir: -1, item: "#ffb4ad", doors: [FE_DOOR_X], cover: { from: -6.25, to: -4.48 } }, // belt 2: BE → FE
  // belt 3: outbound query box (crimson) rides fully into the DB and is
  // swallowed; after the pause a NEW result box (soft red) rides back and
  // is swallowed by the backend. item2 = the return box's color.
  // gate at the backend's right tunnel mouth (BE head edge ≈ x 1.125); the
  // belt reaches deep into both tunnels so the whole 3-box train ends up
  // well inside the machine at either end before it swaps
  // cover: enclosed duct over the belt stretch inside the backend, running
  // from the belt's inner end up to the gate — boxes are truly hidden there
  { key: "belt3", x0: -1.3, x1: 5.9, z: 0, mode: "shuttle", item: "#d0322c", item2: "#ef6a63", doors: [1.15], cover: { from: -1.25, to: 1.12 } }, // belt 3: BE ↔ DB
];
const LINK_LABELS = [
  { x: -2.8, label: "HTTPS · REST · JSON" },
  { x: 2.8, label: "SQL · ORM" },
];

// Stations wear a professional monochrome inverted per theme — white
// machines on the dark page, black machines on the light page — while the
// parcels on the belts carry the tile ramp's reds (the only color).
const SKINS = {
  dark: {
    body: "#e9ebee", panel: "#d2d5da", screen: "#1d2026", block: "#8b9096",
    slat: "#9aa0a6", dbBody: "#dfe2e6", dbTop: "#f2f4f6",
    belt: "#26282d", frame: "#8a9096", shadow: 0.45,
  },
  light: {
    body: "#1c1e21", panel: "#2b2e33", screen: "#ffffff", block: "#c6cbd2",
    slat: "#4a4e54", dbBody: "#26292e", dbTop: "#33373d",
    belt: "#2f3237", frame: "#6a6f76", shadow: 0.16,
  },
};

// Fill the canvas: fit ~15.5 world units of width, never crop vertically.
function FitZoom() {
  const camera = useThree((s) => s.camera);
  const width = useThree((s) => s.size.width);
  const height = useThree((s) => s.size.height);
  useEffect(() => {
    camera.zoom = Math.min(width / 15.5, height / 6.6);
    camera.updateProjectionMatrix();
  }, [camera, width, height]);
  return null;
}

/* A real-looking conveyor: side rails, end rollers, legs, dark rubber belt
   with moving cleats, and parcels riding the surface. Constant belts wrap
   their parcels around; the shuttle belt carries the same parcels toward
   the database, pauses, and brings them back. */
function Conveyor({ x0, x1, z, dir = 1, mode = "constant", item, item2, skin, doors = [], cover = null }) {
  const L = x1 - x0;
  const cx = (x0 + x1) / 2;
  const CLEAT_SPACING = 0.36;
  const ITEM_SPACING = 2.3; // sparse enough that doorways rest closed between parcels
  const cleatCount = Math.ceil(L / CLEAT_SPACING);
  const SHUTTLE_ROW = 3; // boxes per train on the shuttle
  const itemCount = mode === "shuttle" ? SHUTTLE_ROW * 2 : Math.ceil(L / ITEM_SPACING);
  const off = useRef(0);
  const phase = useRef(0);
  const cleatRefs = useRef([]);
  const itemRefs = useRef([]);
  const doorRefs = useRef([]);
  const doorAmts = useRef(doors.map(() => 0));
  const DOOR_CLOSED_Y = -0.57; // hangs from the head, bottom at the belt
  const DOOR_TRAVEL = 0.46;

  useFrame((_, delta) => {
    const V = 0.85; // belt speed, world units/s
    const wrap = (p) => ((p % L) + L) % L;
    const itemXs = [];
    let beltOff;

    if (mode === "shuttle") {
      // Belt offset is computed analytically from the cycle phase (not
      // integrated), so it can never drift across phase boundaries.
      const V_SHUTTLE = 2.0;
      const GAP = 0.45;           // spacing inside the 3-box train
      // the train's lead box starts just inside the backend tunnel with the
      // whole row behind it also hidden; travel ends with the whole row
      // inside the database tunnel
      const start = -L / 2 + 0.4 + GAP * (SHUTTLE_ROW - 1);
      const travel = L - 0.55 - GAP * (SHUTTLE_ROW - 1);
      const T_RUN = travel / V_SHUTTLE;
      const T_PAUSE = 1.0;
      const cycle = 2 * (T_RUN + T_PAUSE);
      phase.current = (phase.current + delta) % cycle;
      const p = phase.current;
      beltOff =
        p < T_RUN ? V_SHUTTLE * p
        : p < T_RUN + T_PAUSE ? travel
        : p < 2 * T_RUN + T_PAUSE ? travel - V_SHUTTLE * (p - T_RUN - T_PAUSE)
        : 0;
      // train A (query, crimson): visible only on the outbound run — it
      // rides fully into the DB and vanishes there
      const aVisible = p < T_RUN;
      // train B (result, soft red): NEW boxes that appear inside the DB for
      // the return run and are swallowed by the backend
      const bVisible = p >= T_RUN + T_PAUSE && p < 2 * T_RUN + T_PAUSE;
      for (let i = 0; i < SHUTTLE_ROW; i++) {
        const x = start + beltOff - i * GAP;
        const a = itemRefs.current[i];
        if (a) {
          a.visible = aVisible;
          a.position.x = x;
          if (aVisible) itemXs.push(x);
        }
        const b = itemRefs.current[SHUTTLE_ROW + i];
        if (b) {
          b.visible = bVisible;
          b.position.x = x;
          if (bVisible) itemXs.push(x);
        }
      }
    } else {
      off.current += dir * V * delta;
      beltOff = off.current;
      itemRefs.current.forEach((m, i) => {
        if (!m) return;
        m.position.x = -L / 2 + wrap(i * ITEM_SPACING + beltOff + 0.4);
        itemXs.push(m.position.x);
      });
    }

    cleatRefs.current.forEach((m, i) => {
      if (m) m.position.x = -L / 2 + wrap(i * CLEAT_SPACING + beltOff);
    });

    // factory shutters: closed at rest — they snap open just as a parcel
    // reaches the doorway and settle shut right after it clears
    doors.forEach((doorX, d) => {
      const doorLocalX = doorX - cx;
      const near = itemXs.some((ix) => Math.abs(ix - doorLocalX) < 0.42);
      const target = near ? 1 : 0;
      const ease = target > doorAmts.current[d] ? 11 : 5; // open fast, close calm
      const amt = doorAmts.current[d] + (target - doorAmts.current[d]) * Math.min(1, delta * ease);
      doorAmts.current[d] = amt;
      const mDoor = doorRefs.current[d];
      if (mDoor) mDoor.position.y = DOOR_CLOSED_Y + amt * DOOR_TRAVEL;
    });
  });

  const legH = BELT_Y - 0.05 - GROUND_Y;
  return (
    <group position={[cx, 0, z]}>
      {/* belt */}
      <mesh position={[0, BELT_Y, 0]} castShadow receiveShadow>
        <boxGeometry args={[L, 0.07, 0.55]} />
        <meshStandardMaterial color={skin.belt} roughness={0.9} metalness={0} />
      </mesh>
      {/* moving cleats on the belt surface */}
      {Array.from({ length: cleatCount }, (_, i) => (
        <mesh key={`c${i}`} ref={(m) => (cleatRefs.current[i] = m)} position={[0, BELT_Y + 0.043, 0]}>
          <boxGeometry args={[0.05, 0.018, 0.5]} />
          <meshStandardMaterial color="#111214" roughness={0.85} />
        </mesh>
      ))}
      {/* side rails */}
      {[-0.33, 0.33].map((rz) => (
        <mesh key={rz} position={[0, BELT_Y + 0.03, rz]} castShadow>
          <boxGeometry args={[L + 0.32, 0.06, 0.07]} />
          <meshStandardMaterial color={skin.frame} roughness={0.35} metalness={0.6} envMapIntensity={0.8} />
        </mesh>
      ))}
      {/* end rollers */}
      {[-L / 2, L / 2].map((rx) => (
        <mesh key={rx} position={[rx, BELT_Y, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.11, 0.11, 0.62, 24]} />
          <meshStandardMaterial color={skin.frame} roughness={0.3} metalness={0.65} envMapIntensity={0.8} />
        </mesh>
      ))}
      {/* legs */}
      {[-L / 2 + 0.4, 0, L / 2 - 0.4].flatMap((lx) =>
        [-0.22, 0.22].map((lz) => (
          <mesh key={`${lx}${lz}`} position={[lx, BELT_Y - 0.05 - legH / 2, lz]} castShadow>
            <boxGeometry args={[0.09, legH, 0.09]} />
            <meshStandardMaterial color={skin.frame} roughness={0.45} metalness={0.5} />
          </mesh>
        ))
      )}
      {/* parcels riding the belt */}
      {Array.from({ length: itemCount }, (_, i) => (
        <RoundedBox
          key={`p${i}`}
          ref={(m) => (itemRefs.current[i] = m)}
          args={[0.34, 0.24, 0.34]}
          radius={0.04}
          smoothness={2}
          position={[0, BELT_Y + 0.16, 0]}
          castShadow
        >
          <meshStandardMaterial
            color={mode === "shuttle" && i >= 3 ? item2 ?? item : item}
            roughness={0.5}
            metalness={0.1}
            envMapIntensity={0.7}
          />
        </RoundedBox>
      ))}
      {/* enclosed duct over the in-machine belt stretch (up to the gate) */}
      {cover && (
        <mesh
          position={[(cover.from + cover.to) / 2 - cx, -0.62, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[cover.to - cover.from, 0.66, 0.86]} />
          <meshStandardMaterial
            color={skin.panel}
            roughness={0.45}
            metalness={0.5}
            roughnessMap={getGrain()}
            envMapIntensity={0.8}
          />
        </mesh>
      )}
      {/* factory shutters at the station doorway: sliding panel + guides */}
      {doors.map((doorX, d) => (
        <group key={`d${d}`} position={[doorX - cx, 0, 0]}>
          <mesh ref={(m) => (doorRefs.current[d] = m)} position={[0, -0.57, 0]} castShadow>
            <boxGeometry args={[0.07, 0.5, 0.72]} />
            <meshStandardMaterial color={skin.frame} roughness={0.4} metalness={0.55} envMapIntensity={0.8} />
          </mesh>
          {[-0.42, 0.42].map((gz) => (
            <mesh key={gz} position={[0, -0.62, gz]}>
              <boxGeometry args={[0.09, 0.62, 0.07]} />
              <meshStandardMaterial color={skin.slat} roughness={0.5} metalness={0.4} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

/* Shared factory portal: two columns beside the line and a machine head
   spanning the tunnel — belts run through underneath. Built from the floor
   up (y positions are absolute), toppers dress the head per station. */
function Housing({ skin, children }) {
  const headY = GROUND_Y + COL_H + HEAD_H / 2;
  const headD = TUNNEL_Z * 2 + 0.45;
  return (
    <group>
      {[-TUNNEL_Z, TUNNEL_Z].map((z) => (
        <RoundedBox
          key={z}
          args={[1.9, COL_H, 0.42]}
          radius={0.04}
          smoothness={2}
          position={[0, GROUND_Y + COL_H / 2, z]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial
            color={skin.panel}
            roughness={0.45}
            metalness={0.5}
            roughnessMap={getGrain()}
            envMapIntensity={0.8}
          />
        </RoundedBox>
      ))}
      <RoundedBox
        args={[2.25, HEAD_H, headD]}
        radius={0.07}
        smoothness={4}
        position={[0, headY, 0]}
        castShadow
        receiveShadow
      >
        <meshPhysicalMaterial
          color={skin.body}
          roughness={0.45}
          metalness={0.35}
          clearcoat={0.4}
          clearcoatRoughness={0.35}
          roughnessMap={getGrain()}
          envMapIntensity={0.9}
        />
      </RoundedBox>
      {/* per-station dressing, positioned relative to the head center */}
      <group position={[0, headY, 0]}>{children}</group>
    </group>
  );
}

/* Frontend machine: the head wears a glossy monitor with a top bar, traffic
   lights, and a miniature page layout. */
function FrontendStation({ skin }) {
  const faceZ = TUNNEL_Z + 0.225 + 0.012; // just proud of the head's front
  return (
    <Housing skin={skin}>
      <mesh position={[0, -0.08, faceZ]}>
        <boxGeometry args={[1.95, 1.1, 0.02]} />
        <meshStandardMaterial color={skin.screen} roughness={0.12} metalness={0} envMapIntensity={1.1} />
      </mesh>
      <mesh position={[0, 0.56, faceZ]}>
        <boxGeometry args={[1.95, 0.18, 0.02]} />
        <meshStandardMaterial color={skin.slat} roughness={0.6} />
      </mesh>
      {["#ff5f57", "#febc2e", "#28c840"].map((c, i) => (
        <mesh key={c} position={[-0.82 + i * 0.14, 0.56, faceZ + 0.012]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 0.02, 16]} />
          <meshStandardMaterial color={c} roughness={0.4} />
        </mesh>
      ))}
      <mesh position={[0, 0.16, faceZ + 0.012]}>
        <boxGeometry args={[1.7, 0.3, 0.02]} />
        <meshStandardMaterial color={skin.block} roughness={0.7} />
      </mesh>
      {[0, 1].map((i) => (
        <mesh key={i} position={[-0.25 + (1.2 - i * 0.4) / 2 - 0.6, -0.26 - i * 0.16, faceZ + 0.012]}>
          <boxGeometry args={[1.2 - i * 0.4, 0.07, 0.02]} />
          <meshStandardMaterial color={skin.block} roughness={0.7} />
        </mesh>
      ))}
    </Housing>
  );
}

/* Backend machine: the head carries two rack units — vents, handles, and
   steady status LEDs. */
function BackendStation({ skin }) {
  const faceZ = TUNNEL_Z + 0.225 + 0.012;
  return (
    <Housing skin={skin}>
      {[0, 1].map((u) => (
        <group key={u} position={[0, 0.3 - u * 0.62, faceZ]}>
          <RoundedBox args={[1.95, 0.5, 0.05] } radius={0.02} smoothness={2}>
            <meshStandardMaterial
              color={skin.panel}
              roughness={0.45}
              metalness={0.45}
              roughnessMap={getGrain()}
              envMapIntensity={0.8}
            />
          </RoundedBox>
          {[-0.88, 0.88].map((hx) => (
            <mesh key={hx} position={[hx, 0, 0.035]}>
              <boxGeometry args={[0.06, 0.36, 0.04]} />
              <meshStandardMaterial color={skin.slat} roughness={0.6} metalness={0.4} />
            </mesh>
          ))}
          {[0, 1].map((v) => (
            <mesh key={v} position={[-0.28, 0.09 - v * 0.16, 0.032]}>
              <boxGeometry args={[1.0, 0.05, 0.015]} />
              <meshStandardMaterial color={skin.slat} roughness={0.85} />
            </mesh>
          ))}
          {[0, 1].map((l) => (
            <mesh key={l} position={[0.62, 0.1 - l * 0.2, 0.04]}>
              <sphereGeometry args={[0.032, 12, 12]} />
              <meshStandardMaterial
                color={l === 0 ? "#28c840" : "#febc2e"}
                emissive={l === 0 ? "#28c840" : "#febc2e"}
                emissiveIntensity={l === 0 ? 0.55 : 0.35}
                roughness={0.3}
              />
            </mesh>
          ))}
        </group>
      ))}
    </Housing>
  );
}

/* Database machine: two storage platters stand on the head's roof like
   factory tanks, with lighter top caps and seam grooves. */
function DatabaseStation({ skin }) {
  const roofY = HEAD_H / 2;
  return (
    <Housing skin={skin}>
      {[0, 1].map((i) => (
        <group key={i} position={[0, roofY + 0.29 + i * 0.6, 0]}>
          <mesh castShadow receiveShadow>
            <cylinderGeometry args={[0.78, 0.78, 0.56, 48]} />
            <meshStandardMaterial
              color={skin.dbBody}
              roughness={0.32}
              metalness={0.55}
              roughnessMap={getGrain()}
              envMapIntensity={0.9}
            />
          </mesh>
          <mesh position={[0, 0.281, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.78, 48]} />
            <meshStandardMaterial color={skin.dbTop} roughness={0.26} metalness={0.5} envMapIntensity={0.9} />
          </mesh>
          <mesh position={[0, 0.28, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.77, 0.012, 10, 48]} />
            <meshStandardMaterial color={skin.slat} roughness={0.6} metalness={0.2} />
          </mesh>
        </group>
      ))}
    </Housing>
  );
}

const STATION_MODELS = [FrontendStation, BackendStation, DatabaseStation];

/* Stations (static, hover-lift only) + the three conveyors through them. */
function Pipeline({ skin }) {
  const stationRefs = useRef([]);
  const lifts = useRef([0, 0, 0]);
  const hovered = useRef(null);

  useFrame((_, delta) => {
    stationRefs.current.forEach((group, i) => {
      if (!group) return;
      const targetLift = hovered.current === i ? 0.16 : 0;
      lifts.current[i] += (targetLift - lifts.current[i]) * Math.min(1, delta * 8);
      group.position.y = lifts.current[i];
    });
  });

  return (
    <>
      {/* floor: invisible plane that only catches shadows */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, GROUND_Y, 0]} receiveShadow>
        <planeGeometry args={[44, 22]} />
        <shadowMaterial transparent opacity={skin.shadow} />
      </mesh>

      {CONVEYORS.map((c) => (
        <Conveyor key={c.key} {...c} skin={skin} />
      ))}

      {LINK_LABELS.map(({ x, label }) => (
        <Html
          key={label}
          center
          position={[x, GROUND_Y - 0.55, 0.8]}
          zIndexRange={[10, 0]}
          style={{ pointerEvents: "none" }}
        >
          <p className="font-plex text-[0.58rem] tracking-[0.16em] uppercase text-faint whitespace-nowrap select-none">
            {label}
          </p>
        </Html>
      ))}

      {STATIONS.map((st, i) => {
        const Model = STATION_MODELS[i];
        return (
          <group key={st.key} position={[st.x, 0, 0]}>
            <group
              ref={(g) => (stationRefs.current[i] = g)}
              onPointerOver={(e) => {
                e.stopPropagation();
                hovered.current = i;
                document.body.style.cursor = "pointer";
              }}
              onPointerOut={() => {
                if (hovered.current === i) hovered.current = null;
                document.body.style.cursor = "";
              }}
            >
              <Model skin={skin} />
            </group>
            <Html center position={[-0.7, GROUND_Y - 0.95, 0]} zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
              <div className="text-center whitespace-nowrap select-none">
                <p className="font-plex text-[0.9rem] tracking-[0.2em] uppercase text-ink">{st.label}</p>
                <p className="mt-0.5 font-plex text-[0.6rem] text-muted">{st.stack}</p>
              </div>
            </Html>
          </group>
        );
      })}
    </>
  );
}

export default function StackScene({ theme = "dark" }) {
  const skin = SKINS[theme] ?? SKINS.dark;
  return (
    <div className="h-full w-full">
      {/* gentle 3/4 view over a shadow-catching floor */}
      <Canvas
        orthographic
        shadows="variance"
        camera={{ zoom: 46, position: [6.5, 4.6, 13] }}
        onCreated={({ camera }) => camera.lookAt(0, -0.4, 0)}
      >
        <FitZoom />
        {/* local studio environment: three softboxes baked into an env map */}
        <Environment resolution={256}>
          <Lightformer form="rect" intensity={theme === "light" ? 3 : 2} position={[0, 6, -8]} scale={[12, 6, 1]} />
          <Lightformer form="rect" intensity={1.3} position={[-8, 2, 3]} rotation={[0, Math.PI / 2, 0]} scale={[8, 4, 1]} />
          <Lightformer form="rect" intensity={0.9} color="#dfe6ee" position={[8, 3, 2]} rotation={[0, -Math.PI / 2, 0]} scale={[8, 4, 1]} />
        </Environment>
        {/* soft, even lighting: ambient + hemisphere fill, one moderate
            directional for shape and shadows, cool rim for dark theme */}
        <ambientLight intensity={theme === "light" ? 0.9 : 0.65} />
        <hemisphereLight
          intensity={theme === "light" ? 0.7 : 0.5}
          color="#e8edf4"
          groundColor={theme === "light" ? "#c8ccd2" : "#3a3d43"}
        />
        <directionalLight
          position={[5, 8, 5]}
          intensity={theme === "light" ? 1.0 : 0.9}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-left={-11}
          shadow-camera-right={11}
          shadow-camera-top={7}
          shadow-camera-bottom={-7}
          shadow-radius={8}
          shadow-blurSamples={16}
        />
        <pointLight position={[-7, 3, 6]} intensity={16} decay={2} />
        <directionalLight position={[-4, 5, -9]} intensity={theme === "light" ? 0.35 : 1.3} color="#aac2e2" />
        <Pipeline skin={skin} />
      </Canvas>
    </div>
  );
}
