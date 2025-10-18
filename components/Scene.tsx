import React, { useRef, Suspense, useEffect, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import UFO from './UFO';
import PipeSystem, { PipeSegment, type PipeSystemRef as PipeSystemHandle } from './PipeSystem';
import ParticleSystem, { ParticleSystemRef } from './ParticleSystem';
import { GameState, Recording } from '../types';
import RealStars from './RealStars';

interface SceneProps {
  gameMode: string;
  level: number;
  onFlap: () => void;
  lastRecording: Recording | null;
  // P1
  p1GameState: GameState;
  onPipePass1: () => void;
  onCoinCollect1: () => void;
  onTrapHit1: () => void;
  onCrash1: () => void;
  p1FlapRef: React.MutableRefObject<() => void>;
  // P2
  p2GameState: GameState;
  onPipePass2: () => void;
  onCoinCollect2: () => void;
  onTrapHit2: () => void;
  onCrash2: () => void;
  p2FlapRef: React.MutableRefObject<() => void>;
}

const UFO_POSITION = {
    P1: new THREE.Vector3(-2.5, 0, 0),
    P2: new THREE.Vector3(2.5, 0, 0),
};

const GHOST_UFO_POSITION = new THREE.Vector3(0, 0, -5);

const GRAVITY = -30;
const FLAP_POWER = 8;
const UFO_RADIUS = 0.8; 
const COIN_RADIUS = 0.6;
const TRAP_RADIUS = 0.5;

const Scene: React.FC<SceneProps> = ({
  gameMode,
  level,
  onFlap,
  lastRecording,
  // P1 props
  p1GameState,
  onPipePass1,
  onCoinCollect1,
  onTrapHit1,
  onCrash1,
  p1FlapRef,
  // P2 props
  p2GameState,
  onPipePass2,
  onCoinCollect2,
  onTrapHit2,
  onCrash2,
  p2FlapRef,
}) => {
  const { scene } = useThree();
  // FIX: Set a solid color background instead of using the problematic base64 texture which caused a parsing error.
  useEffect(() => {
    scene.background = new THREE.Color(0x00000c);
  }, [scene]);
  
  const ufo1Ref = useRef<THREE.Group>(null!);
  const ufo2Ref = useRef<THREE.Group>(null!);
  const ghostUfoRef = useRef<THREE.Group>(null!);
  const pipeSystemRef = useRef<PipeSystemHandle | null>(null);
  const particleSystemRef = useRef<ParticleSystemRef>(null!);

  const p1Velocity = useRef(0);
  const p2Velocity = useRef(0);
  const ghostUfoIndex = useRef(0);
  const ghostUfoStartTime = useRef(0);

  // Reset logic
  const resetPlayer = useCallback((ufoRef: React.RefObject<THREE.Group>, velocityRef: React.MutableRefObject<number>, initialPos: THREE.Vector3) => {
    if (ufoRef.current) {
        ufoRef.current.position.copy(initialPos);
        ufoRef.current.rotation.set(0, 0, 0);
    }
    velocityRef.current = 0;
  }, []);

  useEffect(() => {
    if (p1GameState === 'ready' || p1GameState === 'start') {
        resetPlayer(ufo1Ref, p1Velocity, UFO_POSITION.P1);
    }
    if (p2GameState === 'ready' || p2GameState === 'start') {
        resetPlayer(ufo2Ref, p2Velocity, UFO_POSITION.P2);
    }
    if (ghostUfoRef.current) {
      ghostUfoRef.current.position.y = -100; // Hide ghost
    }
    if(p1GameState === 'ready' || p1GameState === 'start') {
      pipeSystemRef.current?.reset(level);
      ghostUfoIndex.current = 0;
      ghostUfoStartTime.current = 0;
    }
  }, [p1GameState, p2GameState, level, resetPlayer]);
  
  // Ghost UFO Logic
  useEffect(() => {
    if (gameMode === 'challenge' && lastRecording && p1GameState === 'playing') {
        ghostUfoStartTime.current = Date.now();
        ghostUfoIndex.current = 0;
        if(ghostUfoRef.current) {
            ghostUfoRef.current.position.copy(GHOST_UFO_POSITION);
        }
    }
  }, [gameMode, lastRecording, p1GameState]);

  // Player flap controls
  p1FlapRef.current = useCallback(() => {
    if (p1GameState === 'playing') {
      p1Velocity.current = FLAP_POWER;
      onFlap();
    }
  }, [p1GameState, onFlap]);

  p2FlapRef.current = useCallback(() => {
    if (p2GameState === 'playing' && gameMode === 'challenge') {
      p2Velocity.current = FLAP_POWER;
      onFlap();
    }
  }, [p2GameState, gameMode, onFlap]);
  
  // Collision Detection
  const checkCollisions = useCallback((ufoRef: React.RefObject<THREE.Group>, onPipePass: () => void, onCoinCollect: () => void, onTrapHit: () => void, onCrash: () => void) => {
    if (!ufoRef.current || !pipeSystemRef.current) return;

    const ufoPosition = ufoRef.current.position;
    const ufoBox = new THREE.Box3().setFromObject(ufoRef.current);

    // Ground and Ceiling collision
    if (ufoPosition.y > 10 || ufoPosition.y < -10) {
      onCrash();
      return;
    }

    pipeSystemRef.current.segments.forEach((segment: PipeSegment) => {
      // Pipe collision
      segment.pipes.forEach(pipe => {
        if (!pipe.visible) return;
        const pipeBox = new THREE.Box3().setFromObject(pipe);
        if (ufoBox.intersectsBox(pipeBox)) {
          onCrash();
          return; // Exit early if crashed
        }
      });
      
      // Coin/Trap collision
      segment.coins.forEach(coinObj => {
        if (coinObj.mesh.visible) {
          const distance = ufoPosition.distanceTo(coinObj.mesh.position);
          const collisionRadius = coinObj.isTrap ? TRAP_RADIUS + UFO_RADIUS : COIN_RADIUS + UFO_RADIUS;
          if (distance < collisionRadius) {
            coinObj.mesh.visible = false;
            if (coinObj.isTrap) {
              particleSystemRef.current?.trigger(coinObj.mesh.position, new THREE.Color('red'), 20);
              onTrapHit();
            } else {
              particleSystemRef.current?.trigger(coinObj.mesh.position, new THREE.Color('gold'), 15);
              onCoinCollect();
            }
          }
        }
      });
    });
  }, []);

  useFrame((state, delta) => {
    // Clamp delta to avoid large jumps on lag
    const dt = Math.min(delta, 0.05);

    // Update Player 1
    if (p1GameState === 'playing' && ufo1Ref.current) {
      p1Velocity.current += GRAVITY * dt;
      ufo1Ref.current.position.y += p1Velocity.current * dt;
      ufo1Ref.current.rotation.z = Math.min(Math.PI / 6, Math.max(-Math.PI / 2, p1Velocity.current * 0.05));
      checkCollisions(ufo1Ref, onPipePass1, onCoinCollect1, onTrapHit1, onCrash1);
    }
    
    // Update Player 2
    if (gameMode === 'challenge' && p2GameState === 'playing' && ufo2Ref.current) {
      p2Velocity.current += GRAVITY * dt;
      ufo2Ref.current.position.y += p2Velocity.current * dt;
      ufo2Ref.current.rotation.z = Math.min(Math.PI / 6, Math.max(-Math.PI / 2, p2Velocity.current * 0.05));
      checkCollisions(ufo2Ref, onPipePass2, onCoinCollect2, onTrapHit2, onCrash2);
    }

    // Move Pipes
    if (p1GameState === 'playing' || p2GameState === 'playing') {
      pipeSystemRef.current?.movePipes(dt, onPipePass1); // P1 triggers score for both
    }
    
    // Ghost UFO movement for Challenge Mode
    if (gameMode === 'challenge' && lastRecording && ghostUfoRef.current && ghostUfoStartTime.current > 0) {
        const elapsedTime = (Date.now() - ghostUfoStartTime.current);
        
        while (
            ghostUfoIndex.current < lastRecording.flaps.length &&
            lastRecording.flaps[ghostUfoIndex.current].time < elapsedTime
        ) {
            // Simulate flap for ghost
            ghostUfoRef.current.position.y += FLAP_POWER * dt * 30; // a bit hacky to get the jump height right
            ghostUfoIndex.current++;
        }

        // Apply gravity to ghost
        ghostUfoRef.current.position.y += (GRAVITY * dt);

        // Keep ghost within bounds
        if (ghostUfoRef.current.position.y > 10) ghostUfoRef.current.position.y = 10;
        if (ghostUfoRef.current.position.y < -10) ghostUfoRef.current.position.y = -10;
    }

  });
  
  const ghostColor = new THREE.Color(0x8888ff);

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, 15]} fov={60} />
      <ambientLight intensity={0.7} />
      <directionalLight 
        castShadow 
        position={[10, 20, 15]} 
        intensity={1.5} 
        shadow-mapSize-width={2048} 
        shadow-mapSize-height={2048} 
      />
      
      <Suspense fallback={null}>
        {/* Player 1 UFO */}
        {gameMode !== 'start' && p1GameState !== 'start' && (
            <UFO ref={ufo1Ref} gameState={p1GameState} />
        )}
        
        {/* Player 2 UFO (Challenge Mode) */}
        {gameMode === 'challenge' && p2GameState !== 'start' && (
            <UFO ref={ufo2Ref} gameState={p2GameState} />
        )}

        {/* Ghost UFO (Challenge Mode) */}
        {gameMode === 'challenge' && lastRecording && (
          <mesh ref={ghostUfoRef} position={GHOST_UFO_POSITION}>
            <sphereGeometry args={[UFO_RADIUS, 16, 16]} />
            <meshStandardMaterial color={ghostColor} transparent opacity={0.4} emissive={ghostColor} emissiveIntensity={0.5} />
          </mesh>
        )}
        <RealStars />
      </Suspense>

      <PipeSystem 
        ref={pipeSystemRef} 
        level={level} 
        gameState={p1GameState}
      />
      <ParticleSystem ref={particleSystemRef} />
    </>
  );
};

export default Scene;