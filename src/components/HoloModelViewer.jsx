// src/components/HoloModelViewer.jsx
import React, { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useLoader, useFrame } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { AnimationMixer, Box3, Vector3 } from "three";

// Playback speed of the embedded shapeshift clip (1 = original 83s loop).
const ANIMATION_SPEED = 4;

// Morph targets in the clip: 0 = teapot, 1 = fox, 2 = dog.
const DISABLED_MORPHS = [0, 1, 2];
const MORPH_COUNT = 3;
// Bones whose animation tracks are stripped from the clip.
const DISABLED_BONES = ["teapot_04", "fox_05", "dog_06"];

function HoloModel({ url }) {
  const gltf = useLoader(GLTFLoader, url);
  const groupRef = useRef();
  const mixerRef = useRef();

  // Center the model and normalize its size so any export fits the tile.
  const { fitScale, offset } = useMemo(() => {
    const box = new Box3().setFromObject(gltf.scene);
    const center = box.getCenter(new Vector3());
    const size = box.getSize(new Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    return { fitScale: 2.2 / maxDim, offset: center.multiplyScalar(-1).toArray() };
  }, [gltf]);

  useEffect(() => {
    if (gltf.animations.length) {
      gltf.animations.forEach((clip) => {
        // Drop the disabled bones' motion tracks entirely.
        clip.tracks = clip.tracks.filter(
          (track) => !DISABLED_BONES.some((bone) => track.name.startsWith(`${bone}.`))
        );
        // Zero out disabled morph channels so those shapes never appear.
        clip.tracks.forEach((track) => {
          if (track.name.endsWith(".morphTargetInfluences")) {
            for (const morph of DISABLED_MORPHS) {
              for (let i = morph; i < track.values.length; i += MORPH_COUNT) {
                track.values[i] = 0;
              }
            }
          }
        });
        clip.resetDuration();
      });
      mixerRef.current = new AnimationMixer(gltf.scene);
      mixerRef.current.timeScale = ANIMATION_SPEED;
      gltf.animations.forEach((clip) => mixerRef.current.clipAction(clip).play());
    }
    return () => mixerRef.current?.stopAllAction();
  }, [gltf]);

  useFrame((_, delta) => {
    mixerRef.current?.update(delta);
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.25;
    }
  });

  return (
    <group ref={groupRef} scale={fitScale}>
      <primitive object={gltf.scene} position={offset} />
    </group>
  );
}

export default function HoloModelViewer() {
  return (
    <Canvas camera={{ position: [0, 0.4, 3.4], fov: 45 }}>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={1.5} />
      <pointLight position={[-5, -2, -5]} intensity={0.8} />
      <Suspense fallback={null}>
        <HoloModel url="/models/holo_shapeshifter.glb" />
      </Suspense>
    </Canvas>
  );
}
