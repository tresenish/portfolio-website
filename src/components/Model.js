// src/components/Model.js
import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { useLoader, useFrame } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { AnimationMixer, LoopOnce } from 'three';

const Model = forwardRef(({ url, animationsUrl, scale }, ref) => {
  const gltf = useLoader(GLTFLoader, url);
  const animations = useLoader(GLTFLoader, animationsUrl);
  const modelRef = useRef();
  const mixerRef = useRef();
  const [actions, setActions] = useState({});
  const [activeAction, setActiveAction] = useState(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (animations && modelRef.current) {
      mixerRef.current = new AnimationMixer(modelRef.current);
      const actionMap = {};
      animations.animations.forEach((clip) => {
        actionMap[clip.name] = mixerRef.current.clipAction(clip);
      });
      setActions(actionMap);

      // Play the default idle animation
      if (actionMap['Idle_A']) {
        const idleAction = actionMap['Idle_A'];
        idleAction.play();
        setActiveAction(idleAction);
      }
    }
  }, [animations]);

  useFrame((state, delta) => {
    if (mixerRef.current) {
      mixerRef.current.update(delta);
    }

    if (modelRef.current) {
      const x = mousePosition.x * Math.PI * 0.25; // Rotate based on normalized X position, slower
      const y = -mousePosition.y * Math.PI * 0.1; // Inverted Y rotation
      modelRef.current.rotation.y = x;
      modelRef.current.rotation.x = y;
    }
  });

  const playAction = (action) => {
    if (!isAnimating) {
      setIsAnimating(true);
      action.reset();
      action.setLoop(LoopOnce, 1);
      action.clampWhenFinished = true;
      action.play();

      const onFinished = (e) => {
        if (e.action === action) {
          setIsAnimating(false);
          if (actions['Idle_A']) {
            actions['Idle_A'].reset();
            actions['Idle_A'].play();
            setActiveAction(actions['Idle_A']);
          }
          mixerRef.current.removeEventListener('finished', onFinished);
        }
      };

      mixerRef.current.addEventListener('finished', onFinished);
    }
  };

  useImperativeHandle(ref, () => ({
    triggerBounce: () => {
      if (actions['Bounce']) {
        const bounceAction = actions['Bounce'];
        bounceAction.timeScale = 0.9; // Slows down the bounce animation to half speed
        if (activeAction) {
          activeAction.stop();
        }
        playAction(bounceAction);
      }
    }
  }));

  useEffect(() => {
    const handleMouseMove = (event) => {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const originX = 6 * 16; // 6rem in pixels
      const originY = viewportHeight / 2; // Center of the screen vertically
      const relativeX = event.clientX - originX;
      const relativeY = originY - event.clientY; // Invert Y-axis
      const normalizedX = relativeX / (viewportWidth / 2 - originX);
      const normalizedY = relativeY / (viewportHeight / 2);
      setMousePosition({ x: normalizedX, y: normalizedY });
    };

    const handleClick = () => {
      if (ref.current) {
        ref.current.triggerBounce();
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('click', handleClick);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('click', handleClick);
    };
  }, [actions]);

  return <primitive object={gltf.scene} scale={scale} ref={modelRef} />;
});

export default Model;
