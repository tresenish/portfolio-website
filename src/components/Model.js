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
  const originalPosition = useRef({ x: 0, y: 0, z: 0 });

  useEffect(() => {
    if (animations && modelRef.current) {
      mixerRef.current = new AnimationMixer(modelRef.current);
      const actionMap = {};
      animations.animations.forEach((clip) => {
        actionMap[clip.name] = mixerRef.current.clipAction(clip);
      });
      setActions(actionMap);

      // Save the original position of the model
      originalPosition.current = {
        x: modelRef.current.position.x,
        y: modelRef.current.position.y,
        z: modelRef.current.position.z,
      };

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
      const x = mousePosition.x * Math.PI * 0.25;
      const y = -mousePosition.y * Math.PI * 0.18;
      modelRef.current.rotation.y = x;
      modelRef.current.rotation.x = y;
    }
  });

  const stopAllActions = () => {
    for (const action of Object.values(actions)) {
      action.stop();
    }
  };

  const playAction = (action) => {
    setIsAnimating(true);
    action.reset();
    action.setLoop(LoopOnce, 1);
    action.clampWhenFinished = true;
    action.play();

    const onFinished = (e) => {
      if (e.action === action) {
        // Reset the model to its original position
        modelRef.current.position.set(
          originalPosition.current.x,
          originalPosition.current.y,
          originalPosition.current.z
        );

        if (actions['Idle_A']) {
          actions['Idle_A'].reset();
          actions['Idle_A'].fadeIn(0.5).play();
          setActiveAction(actions['Idle_A']);
        }
        setIsAnimating(false);
        mixerRef.current.removeEventListener('finished', onFinished);
      }
    };

    mixerRef.current.addEventListener('finished', onFinished);
  };

  useImperativeHandle(ref, () => ({
    triggerBounce: () => {
      if (actions['Bounce']) {
        const bounceAction = actions['Bounce'];
        bounceAction.timeScale = 0.9;
        stopAllActions();
        playAction(bounceAction);
      }
    }
  }));

  useEffect(() => {
    const handleMouseMove = (event) => {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const originX = 9 * 16;
      const originY = viewportHeight / 2;
      const relativeX = event.clientX - originX;
      const relativeY = originY - event.clientY;
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

  useEffect(() => {
    const randomAnimations = ['Sit', 'Jump', 'Eat', 'Fear'];

    const playRandomAnimation = () => {
      if (!isAnimating) {
        const randomAnimation = randomAnimations[Math.floor(Math.random() * randomAnimations.length)];
        if (actions[randomAnimation]) {
          const animationAction = actions[randomAnimation];
          stopAllActions();
          playAction(animationAction);
        }
      }
    };

    const interval = setInterval(playRandomAnimation, 9000);

    return () => clearInterval(interval);
  }, [actions, isAnimating]);

  return <primitive object={gltf.scene} scale={scale} ref={modelRef} />;
});

export default Model;
