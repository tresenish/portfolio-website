// src/components/HoloModelViewer.jsx
import React, { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useLoader, useFrame } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { AnimationMixer, Box3, Vector3 } from "three";

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
    return { fitScale: 3 / maxDim, offset: center.multiplyScalar(-1).toArray() };
  }, [gltf]);

  useEffect(() => {
    if (gltf.animations.length) {
      mixerRef.current = new AnimationMixer(gltf.scene);
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
