// src/components/ThreeDModelViewer.js
import React, { forwardRef, useRef, useImperativeHandle } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import Model from './Model';

const ThreeDModelViewer = forwardRef(({ scale }, ref) => {
  const modelRef = useRef();

  useImperativeHandle(ref, () => ({
    triggerBounce: () => {
      if (modelRef.current) {
        modelRef.current.triggerBounce();
      }
    }
  }));

  return (
    <Canvas className="model-canvas" shadows>
      <ambientLight intensity={0.2} />
      <pointLight position={[10, 10, 10]} intensity={100} />
      <directionalLight
        position={[0, 10, 0]}
        intensity={1}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight position={[0, -10, 0]} intensity={2} castShadow />
      <Model ref={modelRef} url="/models/Cat_LOD_All.glb" animationsUrl="/models/Cat_Animations.glb" scale={scale} />
      <OrbitControls enableRotate={false} enableZoom={false} />
    </Canvas>
  );
});

export default ThreeDModelViewer;
