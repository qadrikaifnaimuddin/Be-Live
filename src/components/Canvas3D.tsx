import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { AvatarConfig } from './AvatarStudio';

interface Canvas3DProps {
  config: AvatarConfig;
  arMode?: boolean;
}

// Custom 3D Character Model Component
function CharacterModel({ config, arMode = false }: { config: AvatarConfig; arMode?: boolean }) {
  const {
    faceShape,
    skinTone,
    hairStyle,
    hairColor,
    facialHair,
    facialHairColor,
    eyeStyle,
    eyeColor,
    noseShape,
    mouthExpression,
    outfit,
    outfitColor,
    pants,
    pantsColor,
    shoes,
    shoesColor,
    pose,
    eyewear,
    renderStyle3D,
    shadingIntensity = 75,
    glossiness = 65,
    headwear,
    cheekBlush,
    earrings,
  } = config;

  // Local fallback variables for accessories colors not in config state
  const eyewearColor = '#111827';
  const headwearColor = outfitColor || '#EC4899';

  // Compute materials based on selected 3D render style
  const materials = useMemo(() => {
    const roughnessValue = 1 - (glossiness / 100) * 0.9; // Map glossiness to roughness
    const metalnessValue = renderStyle3D === 'metallicGold' ? 0.95 : renderStyle3D === 'stealthCarbon' ? 0.8 : 0.1;
    
    // Core material options
    const baseMatParams: THREE.MeshStandardMaterialParameters = {
      roughness: roughnessValue,
      metalness: metalnessValue,
    };

    // Style overrides
    if (renderStyle3D === 'metallicGold') {
      baseMatParams.color = new THREE.Color('#D4AF37'); // Sovereign gold hue
      baseMatParams.roughness = 0.12;
      baseMatParams.metalness = 0.95;
    } else if (renderStyle3D === 'crystalGlass') {
      baseMatParams.color = new THREE.Color('#FAF9F6');
      baseMatParams.roughness = 0.1;
      baseMatParams.metalness = 0.1;
      baseMatParams.opacity = 0.45;
      baseMatParams.transparent = true;
    } else if (renderStyle3D === 'iridescentPearl') {
      baseMatParams.color = new THREE.Color('#A855F7'); // Shifting lilac
      baseMatParams.roughness = 0.15;
      baseMatParams.metalness = 0.4;
    } else if (renderStyle3D === 'cyberpunkGlow') {
      baseMatParams.color = new THREE.Color('#1F2937');
      baseMatParams.roughness = 0.2;
      baseMatParams.metalness = 0.5;
    } else if (renderStyle3D === 'stealthCarbon') {
      baseMatParams.color = new THREE.Color('#1E293B');
      baseMatParams.roughness = 0.45;
      baseMatParams.metalness = 0.7;
    } else if (renderStyle3D === 'glassmorphicRefraction') {
      baseMatParams.color = new THREE.Color('#E0F2FE');
      baseMatParams.roughness = 0.05;
      baseMatParams.metalness = 0.1;
    } else if (renderStyle3D === 'rainbowHologram') {
      baseMatParams.color = new THREE.Color('#EC4899');
      baseMatParams.roughness = 0.1;
      baseMatParams.metalness = 0.9;
    }

    // Material Helper Function
    const createMaterial = (hexColor: string, type: 'skin' | 'hair' | 'facialHair' | 'outfit' | 'pants' | 'shoes' | 'headwear' | 'generic') => {
      if (renderStyle3D === 'metallicGold') {
        return new THREE.MeshStandardMaterial({
          color: '#D4AF37',
          roughness: 0.12,
          metalness: 0.95,
        });
      }
      if (renderStyle3D === 'crystalGlass') {
        return new THREE.MeshPhysicalMaterial({
          color: hexColor,
          roughness: 0.15,
          metalness: 0.1,
          transmission: 0.8,
          thickness: 1.2,
          transparent: true,
          opacity: 0.7,
        });
      }
      if (renderStyle3D === 'glassmorphicRefraction') {
        return new THREE.MeshPhysicalMaterial({
          color: '#E0F2FE',
          roughness: 0.05,
          metalness: 0.1,
          transmission: 0.95,
          thickness: 1.8,
          transparent: true,
          opacity: 0.5,
          clearcoat: 1.0,
          clearcoatRoughness: 0.1,
        });
      }
      if (renderStyle3D === 'rainbowHologram') {
        return new THREE.MeshStandardMaterial({
          color: hexColor,
          roughness: 0.1,
          metalness: 0.9,
          emissive: new THREE.Color('#EC4899'),
          emissiveIntensity: 0.5,
        });
      }
      if (renderStyle3D === 'iridescentPearl') {
        return new THREE.MeshStandardMaterial({
          color: hexColor,
          roughness: 0.12,
          metalness: 0.55,
          emissive: '#10B981',
          emissiveIntensity: 0.1,
        });
      }
      if (renderStyle3D === 'cyberpunkGlow') {
        return new THREE.MeshStandardMaterial({
          color: hexColor,
          roughness: 0.2,
          metalness: 0.3,
          emissive: '#EC4899',
          emissiveIntensity: 0.15,
        });
      }
      if (renderStyle3D === 'stealthCarbon') {
        return new THREE.MeshStandardMaterial({
          color: hexColor,
          roughness: 0.45,
          metalness: 0.7,
        });
      }
      
      // Standard styles custom-themed per part
      if (type === 'skin') {
        return new THREE.MeshPhysicalMaterial({
          color: hexColor,
          roughness: 0.56,
          metalness: 0.03,
          clearcoat: 0.15,
          clearcoatRoughness: 0.2,
        });
      }
      if (type === 'hair' || type === 'facialHair') {
        return new THREE.MeshPhysicalMaterial({
          color: hexColor,
          roughness: 0.42,
          metalness: 0.08,
          clearcoat: 0.22,
          clearcoatRoughness: 0.25,
        });
      }
      if (type === 'outfit' || type === 'pants' || type === 'headwear') {
        return new THREE.MeshStandardMaterial({
          color: hexColor,
          roughness: 0.88, // Matte felt/fabric texture mapping
          metalness: 0.02,
        });
      }
      
      // Standard fallback / Shiny Plastic
      const defaultRough = renderStyle3D === 'shinyPlastic' ? 0.08 : 0.6;
      const defaultMetal = renderStyle3D === 'shinyPlastic' ? 0.15 : 0.02;
      return new THREE.MeshStandardMaterial({
        color: hexColor,
        roughness: defaultRough,
        metalness: defaultMetal,
      });
    };

    return {
      skin: createMaterial(skinTone, 'skin'),
      hair: createMaterial(hairColor, 'hair'),
      facialHair: createMaterial(facialHairColor, 'facialHair'),
      outfit: createMaterial(outfitColor, 'outfit'),
      pants: createMaterial(pantsColor || '#334155', 'pants'),
      shoes: createMaterial(shoesColor || '#111827', 'shoes'),
      eye: new THREE.MeshStandardMaterial({ color: eyeColor, roughness: 0.1 }),
      eyeWhite: new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.1 }),
      eyePupil: new THREE.MeshStandardMaterial({ color: '#090D16', roughness: 0.1 }),
      glassesFrame: createMaterial(eyewearColor, 'generic'),
      glassesLens: new THREE.MeshStandardMaterial({ color: '#22D3EE', opacity: 0.4, transparent: true, roughness: 0.05 }),
      headwear: createMaterial(headwearColor, 'headwear'),
      innerShirt: new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.4 }),
      goldCrown: new THREE.MeshStandardMaterial({ color: '#FBBF24', metalness: 0.9, roughness: 0.1 }),
      glowingVisor: new THREE.MeshStandardMaterial({ color: '#06B6D4', emissive: '#06B6D4', emissiveIntensity: 0.8, roughness: 0.1 }),
    };
  }, [skinTone, hairColor, facialHairColor, outfitColor, pantsColor, shoesColor, eyeColor, eyewearColor, headwearColor, renderStyle3D, glossiness]);

  // Adjust Head geometry scale based on faceShape
  const headScale = useMemo<[number, number, number]>(() => {
    switch (faceShape) {
      case 'oval': return [1, 1.15, 1];
      case 'square': return [1.08, 0.98, 1.08];
      case 'heart': return [1.06, 1.06, 0.9];
      case 'round':
      default: return [1.1, 1.1, 1.1];
    }
  }, [faceShape]);

  // Handle minor interactive idling rotations and rigged animations inside 3D environment
  const groupRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const leftEyeRef = useRef<THREE.Group>(null);
  const rightEyeRef = useRef<THREE.Group>(null);
  
  // Animatronic automatic eye blink timer references
  const isBlinkingRef = useRef(false);
  const blinkTimerRef = useRef(0);

  useFrame((state) => {
    if (groupRef.current) {
      const time = state.clock.getElapsedTime();
      const delta = state.clock.getDelta();
      
      // 1. Idle breathing vertical oscillation for shoulders, chest, and arms
      const breathe = Math.sin(time * 1.8) * 0.015;
      groupRef.current.position.y = (pose === 'meditating' ? 0.25 : -0.7) + breathe;
      
      // 2. Smooth head-tracking that locks onto mouse coordinates
      if (headRef.current && !arMode) {
        const targetRotY = state.pointer.x * 0.38; // Max 22 degrees look horizontal
        const targetRotX = -state.pointer.y * 0.22; // Max 12 degrees look vertical
        headRef.current.rotation.y = THREE.MathUtils.lerp(headRef.current.rotation.y, targetRotY, 0.08);
        headRef.current.rotation.x = THREE.MathUtils.lerp(headRef.current.rotation.x, targetRotX, 0.08);
      }

      // 3. Automatic Eye Blinking logic
      blinkTimerRef.current += 0.016; // Incremental approximation of delta
      if (isBlinkingRef.current) {
        if (blinkTimerRef.current > 0.12) { // Blink lasts exactly 120ms
          isBlinkingRef.current = false;
          blinkTimerRef.current = 0;
        }
      } else {
        if (blinkTimerRef.current > 3.2 + Math.random() * 2.5) { // Blink randomly every 3-5 seconds
          isBlinkingRef.current = true;
          blinkTimerRef.current = 0;
        }
      }

      // Smoothly squash eye height during blink
      if (leftEyeRef.current && rightEyeRef.current) {
        const targetScaleY = isBlinkingRef.current ? 0.05 : 1.0;
        leftEyeRef.current.scale.y = THREE.MathUtils.lerp(leftEyeRef.current.scale.y, targetScaleY, 0.35);
        rightEyeRef.current.scale.y = THREE.MathUtils.lerp(rightEyeRef.current.scale.y, targetScaleY, 0.35);
      }
      
      // Dynamic Hue Shift for Rainbow Hologram rendering style
      if (renderStyle3D === 'rainbowHologram') {
        const hue = (time * 60) % 360;
        const rainbowColor = new THREE.Color(`hsl(${hue}, 95%, 55%)`);
        Object.values(materials).forEach((mat) => {
          if (mat instanceof THREE.MeshStandardMaterial) {
            mat.emissive.copy(rainbowColor);
            mat.emissiveIntensity = 0.55;
          }
        });
      }

      // Gentle idle sway (except for meditation which has its own hover)
      if (pose !== 'meditating') {
        groupRef.current.position.x = 0;
        groupRef.current.rotation.set(0, 0, 0);
      }

      // Reset default positions/rotations
      if (leftLegRef.current) {
        leftLegRef.current.rotation.set(0, 0, 0);
      }
      if (rightLegRef.current) {
        rightLegRef.current.rotation.set(0, 0, 0);
      }
      if (leftArmRef.current) {
        leftArmRef.current.rotation.set(poseSettings.leftArmRot[0], poseSettings.leftArmRot[1], poseSettings.leftArmRot[2]);
        leftArmRef.current.position.set(poseSettings.leftArmPos[0], poseSettings.leftArmPos[1], poseSettings.leftArmPos[2]);
      }
      if (rightArmRef.current) {
        rightArmRef.current.rotation.set(poseSettings.rightArmRot[0], poseSettings.rightArmRot[1], poseSettings.rightArmRot[2]);
        rightArmRef.current.position.set(poseSettings.rightArmPos[0], poseSettings.rightArmPos[1], poseSettings.rightArmPos[2]);
      }

      // Skeletal rigging animation for hips, pants, and shoes to prevent clipping
      if (pose === 'dancing') {
        // Swing the entire body (hips) side-to-side
        groupRef.current.position.x = Math.sin(time * 3.0) * 0.12;
        groupRef.current.rotation.y = Math.sin(time * 2.0) * 0.2;
        
        // Rigged legs swing dynamically in balance with body sway
        if (leftLegRef.current) {
          leftLegRef.current.rotation.z = Math.sin(time * 3.0) * 0.14;
          leftLegRef.current.rotation.x = Math.cos(time * 3.0) * 0.15;
        }
        if (rightLegRef.current) {
          rightLegRef.current.rotation.z = Math.sin(time * 3.0) * 0.14;
          rightLegRef.current.rotation.x = -Math.cos(time * 3.0) * 0.15;
        }

        // Make arms dance
        if (leftArmRef.current) {
          leftArmRef.current.rotation.x = poseSettings.leftArmRot[0] + Math.sin(time * 4.0) * 0.3;
          leftArmRef.current.rotation.z = poseSettings.leftArmRot[2] + Math.cos(time * 4.0) * 0.2;
        }
        if (rightArmRef.current) {
          rightArmRef.current.rotation.x = poseSettings.rightArmRot[0] - Math.sin(time * 4.0) * 0.3;
          rightArmRef.current.rotation.z = poseSettings.rightArmRot[2] - Math.cos(time * 4.0) * 0.2;
        }
      } else if (pose === 'meditating') {
        // Zen levitation hover
        groupRef.current.position.y = 0.25 + Math.sin(time * 1.1) * 0.08;
        groupRef.current.position.x = 0;
        groupRef.current.rotation.y = time * 0.15; // Slow continuous rotate

        // Fold legs inwards
        if (leftLegRef.current) {
          leftLegRef.current.rotation.set(0.65, 0.45, 1.25);
        }
        if (rightLegRef.current) {
          rightLegRef.current.rotation.set(0.65, -0.45, -1.25);
        }

        // Rest arms elegantly on folded knees
        if (leftArmRef.current) {
          leftArmRef.current.rotation.set(0.42, 0.22, 0.88);
        }
        if (rightArmRef.current) {
          rightArmRef.current.rotation.set(0.42, -0.22, -0.88);
        }
      } else if (pose === 'superHero') {
        // Slow wind hover sway
        groupRef.current.position.y = Math.sin(time * 2.0) * 0.035;
        groupRef.current.rotation.y = Math.sin(time * 1.0) * 0.04;
        groupRef.current.rotation.x = 0.08; // Slight forward lean

        // Solid heroic separated stance
        if (leftLegRef.current) {
          leftLegRef.current.rotation.set(0.08, 0, -0.16);
        }
        if (rightLegRef.current) {
          rightLegRef.current.rotation.set(0.08, 0, 0.16);
        }
      } else if (pose === 'waveHello') {
        groupRef.current.position.y = Math.sin(time * 1.6) * 0.025;
        
        // Rapid friendly hand waving
        if (leftArmRef.current) {
          leftArmRef.current.rotation.set(0, 0, 2.3);
          leftArmRef.current.rotation.y = Math.sin(time * 8.5) * 0.28;
        }
      } else if (pose === 'peaceSign') {
        // Rhythmic breathing bob
        groupRef.current.position.y += Math.sin(time * 2.5) * 0.025;
        
        // Gentle peace sign arm waving
        if (leftArmRef.current) {
          leftArmRef.current.rotation.y = poseSettings.leftArmRot[1] + Math.sin(time * 3.5) * 0.12;
        }
      } else if (pose === 'royalWave') {
        // Wave right arm
        if (rightArmRef.current) {
          rightArmRef.current.rotation.z = poseSettings.rightArmRot[2] + Math.sin(time * 7.0) * 0.25;
        }
      } else if (pose === 'coolWink') {
        // Thumbs up slight bob
        if (rightArmRef.current) {
          rightArmRef.current.position.y = poseSettings.rightArmPos[1] + Math.sin(time * 4.0) * 0.02;
        }
      } else if (pose === 'thinking') {
        // Thinking slight head-on-hand nod
        if (rightArmRef.current) {
          rightArmRef.current.rotation.x = poseSettings.rightArmRot[0] + Math.sin(time * 1.5) * 0.04;
        }
      } else {
        // General subtle idle breathing for arms
        if (leftArmRef.current) {
          leftArmRef.current.rotation.z = poseSettings.leftArmRot[2] + Math.sin(time * 1.2) * 0.02;
        }
        if (rightArmRef.current) {
          rightArmRef.current.rotation.z = poseSettings.rightArmRot[2] - Math.sin(time * 1.2) * 0.02;
        }
      }
    }
  });

  // Calculate pose adjustments for arms and hands based on Snapchat types
  const poseSettings = useMemo(() => {
    const leftArmRot: [number, number, number] = [0, 0, 0.2];
    const rightArmRot: [number, number, number] = [0, 0, -0.2];
    const leftArmPos: [number, number, number] = [-0.6, 0.6, 0];
    const rightArmPos: [number, number, number] = [0.6, 0.6, 0];
    
    // royalWave
    if (pose === 'royalWave') {
      rightArmRot[2] = -2.3; // Raised up
      rightArmRot[0] = -0.3; // Slanted forward
    } 
    // peaceSign
    else if (pose === 'peaceSign') {
      leftArmRot[2] = 2.1; // Raised up
      leftArmRot[0] = -0.3; // Slanted forward
    } 
    // coolWink (hand pointing out / thumbs up pose)
    else if (pose === 'coolWink') {
      rightArmRot[0] = -1.2; // Pointed forward
      rightArmRot[2] = -0.3;
    } 
    // thinking
    else if (pose === 'thinking') {
      rightArmRot[0] = -1.4;
      rightArmRot[2] = 0.5; // Hand to center chin
    }
    // dancing
    else if (pose === 'dancing') {
      leftArmRot[2] = 1.2;
      leftArmRot[0] = 0.5;
      rightArmRot[2] = -1.5;
      rightArmRot[0] = -0.5;
    }
    // superHero
    else if (pose === 'superHero') {
      leftArmRot[0] = 0.35;
      leftArmRot[1] = 0.15;
      leftArmRot[2] = 1.28;
      leftArmPos[0] = -0.54;
      leftArmPos[1] = 0.54;
      leftArmPos[2] = -0.08;

      rightArmRot[0] = 0.35;
      rightArmRot[1] = -0.15;
      rightArmRot[2] = -1.28;
      rightArmPos[0] = 0.54;
      rightArmPos[1] = 0.54;
      rightArmPos[2] = -0.08;
    }
    // waveHello
    else if (pose === 'waveHello') {
      leftArmRot[2] = 2.3; // Raised up
      leftArmRot[0] = -0.1;
    }
    // meditating (resting on knees)
    else if (pose === 'meditating') {
      leftArmRot[2] = 0.88;
      leftArmRot[0] = 0.42;
      rightArmRot[2] = -0.88;
      rightArmRot[0] = 0.42;
    }

    return { leftArmRot, rightArmRot, leftArmPos, rightArmPos };
  }, [pose]);

  return (
    <group ref={groupRef} position={[0, -0.7, 0]}>
      {/* ==================== LEGS & FEET (ORGANIC CHIBI RIG) ==================== */}
      <group name="legs-and-feet">
        {/* Left Leg Group - Joint positioned at the hip [-0.22, -0.25, 0] */}
        <group ref={leftLegRef} position={[-0.22, -0.25, 0]}>
          {/* Tapered upper thigh leg segment */}
          <mesh position={[0, -0.16, 0]} material={materials.pants} castShadow receiveShadow>
            <cylinderGeometry args={[0.105, 0.09, 0.32, 32]} />
          </mesh>
          
          {/* Tapered lower calf leg segment */}
          {pants === 'shorts' ? (
            <>
              {/* Bare skin calf */}
              <mesh position={[0, -0.46, 0]} material={materials.skin} castShadow receiveShadow>
                <cylinderGeometry args={[0.088, 0.065, 0.32, 32]} />
              </mesh>
            </>
          ) : pants === 'sweatpants' ? (
            /* Baggy sweatpants calf tapered at ankle */
            <mesh position={[0, -0.46, 0]} material={materials.pants} castShadow receiveShadow>
              <cylinderGeometry args={[0.095, 0.065, 0.32, 32]} />
            </mesh>
          ) : (
            /* Standard jeans/pants calf */
            <mesh position={[0, -0.46, 0]} material={materials.pants} castShadow receiveShadow>
              <cylinderGeometry args={[0.09, 0.075, 0.32, 32]} />
            </mesh>
          )}

          {/* Side cargo pockets if cargo selected */}
          {pants === 'cargo' && (
            <mesh position={[-0.1, -0.28, 0.02]} material={materials.pants} castShadow>
              <boxGeometry args={[0.04, 0.14, 0.11]} />
            </mesh>
          )}

          {/* Shoes styles (Premium Sneaker / Boots contours) */}
          {shoes === 'boots' ? (
            <group position={[0, -0.73, 0.05]}>
              {/* Boot foot */}
              <mesh material={materials.shoes} castShadow receiveShadow>
                <boxGeometry args={[0.13, 0.12, 0.25]} />
              </mesh>
              {/* Boot shaft extending up around leg */}
              <mesh position={[0, 0.1, -0.03]} material={materials.shoes} castShadow>
                <cylinderGeometry args={[0.098, 0.098, 0.18, 32]} />
              </mesh>
            </group>
          ) : shoes === 'loafers' ? (
            <group position={[0, -0.73, 0.08]}>
              {/* Loafer body */}
              <mesh material={materials.shoes} castShadow receiveShadow>
                <boxGeometry args={[0.13, 0.08, 0.25]} />
              </mesh>
              {/* Gold buckle detail */}
              <mesh position={[0, 0.045, 0.05]} material={materials.goldCrown} castShadow>
                <boxGeometry args={[0.06, 0.015, 0.04]} />
              </mesh>
            </group>
          ) : shoes === 'sandals' ? (
            <group position={[0, -0.73, 0.08]}>
              <mesh material={materials.skin} castShadow>
                <boxGeometry args={[0.12, 0.06, 0.24]} />
              </mesh>
              <mesh position={[0, -0.04, 0]} material={materials.shoes} receiveShadow>
                <boxGeometry args={[0.13, 0.02, 0.26]} />
              </mesh>
              <mesh position={[0, 0.035, 0.02]} material={materials.shoes} castShadow>
                <boxGeometry args={[0.13, 0.012, 0.05]} />
              </mesh>
              <mesh position={[0, 0.035, -0.05]} material={materials.shoes} castShadow>
                <boxGeometry args={[0.13, 0.012, 0.04]} />
              </mesh>
            </group>
          ) : shoes === 'highTops' ? (
            <group position={[0, -0.73, 0.08]}>
              {/* High top sneaker body */}
              <mesh material={materials.shoes} castShadow receiveShadow>
                <boxGeometry args={[0.14, 0.15, 0.26]} />
              </mesh>
              {/* Thick white sole */}
              <mesh position={[0, -0.06, 0]} material={materials.innerShirt} receiveShadow>
                <boxGeometry args={[0.148, 0.036, 0.276]} />
              </mesh>
              {/* High top collar ankle wrap */}
              <mesh position={[0, 0.08, -0.03]} material={materials.shoes} castShadow>
                <cylinderGeometry args={[0.09, 0.09, 0.08, 32]} />
              </mesh>
            </group>
          ) : (
            /* Sneakers default */
            <group position={[0, -0.73, 0.08]}>
              {/* Sneaker main body */}
              <mesh material={materials.shoes} castShadow receiveShadow>
                <boxGeometry args={[0.13, 0.11, 0.25]} />
              </mesh>
              {/* White sneaker sole */}
              <mesh position={[0, -0.045, 0]} material={materials.innerShirt} receiveShadow>
                <boxGeometry args={[0.138, 0.026, 0.26]} />
              </mesh>
              {/* Sneaker white toe cap */}
              <mesh position={[0, 0.015, 0.1]} material={materials.innerShirt} castShadow>
                <sphereGeometry args={[0.065, 16, 16, 0, Math.PI, 0, Math.PI]} />
              </mesh>
              {/* White laces */}
              <mesh position={[0, 0.055, 0.04]} material={materials.innerShirt} castShadow>
                <boxGeometry args={[0.06, 0.012, 0.08]} />
              </mesh>
            </group>
          )}
        </group>

        {/* Right Leg Group - Joint positioned at the hip [0.22, -0.25, 0] */}
        <group ref={rightLegRef} position={[0.22, -0.25, 0]}>
          {/* Tapered upper thigh leg segment */}
          <mesh position={[0, -0.16, 0]} material={materials.pants} castShadow receiveShadow>
            <cylinderGeometry args={[0.105, 0.09, 0.32, 32]} />
          </mesh>
          
          {/* Tapered lower calf leg segment */}
          {pants === 'shorts' ? (
            <>
              {/* Bare skin calf */}
              <mesh position={[0, -0.46, 0]} material={materials.skin} castShadow receiveShadow>
                <cylinderGeometry args={[0.088, 0.065, 0.32, 32]} />
              </mesh>
            </>
          ) : pants === 'sweatpants' ? (
            /* Baggy sweatpants calf tapered at ankle */
            <mesh position={[0, -0.46, 0]} material={materials.pants} castShadow receiveShadow>
              <cylinderGeometry args={[0.095, 0.065, 0.32, 32]} />
            </mesh>
          ) : (
            /* Standard jeans/pants calf */
            <mesh position={[0, -0.46, 0]} material={materials.pants} castShadow receiveShadow>
              <cylinderGeometry args={[0.09, 0.075, 0.32, 32]} />
            </mesh>
          )}

          {/* Side cargo pockets if cargo selected */}
          {pants === 'cargo' && (
            <mesh position={[0.1, -0.28, 0.02]} material={materials.pants} castShadow>
              <boxGeometry args={[0.04, 0.14, 0.11]} />
            </mesh>
          )}

          {/* Shoes styles (Premium Sneaker / Boots contours) */}
          {shoes === 'boots' ? (
            <group position={[0, -0.73, 0.05]}>
              {/* Boot foot */}
              <mesh material={materials.shoes} castShadow receiveShadow>
                <boxGeometry args={[0.13, 0.12, 0.25]} />
              </mesh>
              {/* Boot shaft extending up around leg */}
              <mesh position={[0, 0.1, -0.03]} material={materials.shoes} castShadow>
                <cylinderGeometry args={[0.095, 0.095, 0.18, 32]} />
              </mesh>
            </group>
          ) : shoes === 'loafers' ? (
            <group position={[0, -0.73, 0.08]}>
              {/* Loafer body */}
              <mesh material={materials.shoes} castShadow receiveShadow>
                <boxGeometry args={[0.13, 0.08, 0.25]} />
              </mesh>
              {/* Gold buckle detail */}
              <mesh position={[0, 0.045, 0.05]} material={materials.goldCrown} castShadow>
                <boxGeometry args={[0.06, 0.015, 0.04]} />
              </mesh>
            </group>
          ) : shoes === 'sandals' ? (
            <group position={[0, -0.73, 0.08]}>
              <mesh material={materials.skin} castShadow>
                <boxGeometry args={[0.12, 0.06, 0.24]} />
              </mesh>
              <mesh position={[0, -0.04, 0]} material={materials.shoes} receiveShadow>
                <boxGeometry args={[0.13, 0.02, 0.26]} />
              </mesh>
              <mesh position={[0, 0.035, 0.02]} material={materials.shoes} castShadow>
                <boxGeometry args={[0.13, 0.012, 0.05]} />
              </mesh>
              <mesh position={[0, 0.035, -0.05]} material={materials.shoes} castShadow>
                <boxGeometry args={[0.13, 0.012, 0.04]} />
              </mesh>
            </group>
          ) : shoes === 'highTops' ? (
            <group position={[0, -0.73, 0.08]}>
              {/* High top sneaker body */}
              <mesh material={materials.shoes} castShadow receiveShadow>
                <boxGeometry args={[0.14, 0.15, 0.26]} />
              </mesh>
              {/* Thick white sole */}
              <mesh position={[0, -0.06, 0]} material={materials.innerShirt} receiveShadow>
                <boxGeometry args={[0.148, 0.035, 0.275]} />
              </mesh>
              {/* High top collar ankle wrap */}
              <mesh position={[0, 0.08, -0.03]} material={materials.shoes} castShadow>
                <cylinderGeometry args={[0.09, 0.09, 0.08, 32]} />
              </mesh>
            </group>
          ) : (
            /* Sneakers default */
            <group position={[0, -0.73, 0.08]}>
              {/* Sneaker main body */}
              <mesh material={materials.shoes} castShadow receiveShadow>
                <boxGeometry args={[0.13, 0.11, 0.25]} />
              </mesh>
              {/* White sneaker sole */}
              <mesh position={[0, -0.045, 0]} material={materials.innerShirt} receiveShadow>
                <boxGeometry args={[0.138, 0.026, 0.26]} />
              </mesh>
              {/* Sneaker white toe cap */}
              <mesh position={[0, 0.015, 0.1]} material={materials.innerShirt} castShadow>
                <sphereGeometry args={[0.065, 16, 16, 0, Math.PI, 0, Math.PI]} />
              </mesh>
              {/* White laces */}
              <mesh position={[0, 0.055, 0.04]} material={materials.innerShirt} castShadow>
                <boxGeometry args={[0.06, 0.012, 0.08]} />
              </mesh>
            </group>
          )}
        </group>
      </group>

      {/* ==================== TORSO (ORGANIC CLOTHES FOLDS) ==================== */}
      <group name="torso">
        {/* Upper chest tapered segment */}
        <mesh position={[0, 0.32, 0]} material={materials.outfit} castShadow receiveShadow>
          <cylinderGeometry args={[0.42, 0.36, 0.44, 32]} />
        </mesh>
        
        {/* Lower waist tapered segment */}
        <mesh position={[0, -0.04, 0]} material={materials.outfit} castShadow receiveShadow>
          <cylinderGeometry args={[0.36, 0.25, 0.38, 32]} />
        </mesh>

        {/* Outfit Styling Details */}
        {outfit === 'hoodie' && (
          <>
            {/* Hood fold behind the neck */}
            <mesh position={[0, 0.55, -0.15]} rotation={[0.4, 0, 0]} material={materials.outfit} castShadow>
              <torusGeometry args={[0.18, 0.06, 12, 32]} />
            </mesh>
            {/* Front pouch pocket */}
            <mesh position={[0, -0.05, 0.28]} material={materials.outfit} castShadow receiveShadow>
              <boxGeometry args={[0.25, 0.18, 0.08]} />
            </mesh>
            {/* Hanging hoodie drawstrings */}
            <mesh position={[-0.05, 0.28, 0.29]} material={materials.innerShirt} castShadow>
              <cylinderGeometry args={[0.01, 0.01, 0.18, 8]} />
            </mesh>
            <mesh position={[0.05, 0.28, 0.29]} material={materials.innerShirt} castShadow>
              <cylinderGeometry args={[0.01, 0.01, 0.18, 8]} />
            </mesh>
          </>
        )}

        {/* Smart suit details */}
        {outfit === 'suit' && (
          <>
            {/* White Collared Shirt V */}
            <mesh position={[0, 0.45, 0.2]} rotation={[-0.1, 0, 0]} material={materials.innerShirt} castShadow>
              <coneGeometry args={[0.12, 0.25, 4]} />
            </mesh>
            {/* Elegant necktie */}
            <mesh position={[0, 0.32, 0.22]} material={materials.shoes} castShadow>
              <boxGeometry args={[0.04, 0.2, 0.02]} />
            </mesh>
          </>
        )}

        {/* Tech jacket badge/zip lines */}
        {outfit === 'techJacket' && (
          <>
            {/* High collar zip */}
            <mesh position={[0, 0.58, 0]} material={materials.outfit} castShadow>
              <cylinderGeometry args={[0.16, 0.18, 0.14, 32]} />
            </mesh>
            {/* Vertical bright accent zipper line */}
            <mesh position={[0, 0.1, 0.355]} material={materials.glassesFrame} castShadow>
              <boxGeometry args={[0.02, 0.8, 0.01]} />
            </mesh>
          </>
        )}
      </group>

      {/* ==================== ARMS & HANDS (TAPERED LIMBS & MITTEN HANDS) ==================== */}
      <group name="arms">
        {/* Left Shoulder connection joint */}
        <mesh position={[-0.45, 0.45, 0]} material={materials.outfit} castShadow>
          <sphereGeometry args={[0.11, 32, 32]} />
        </mesh>
        
        {/* Left Arm (Tapered Segments + Hand) */}
        <group ref={leftArmRef} position={poseSettings.leftArmPos} rotation={poseSettings.leftArmRot}>
          {/* Upper Arm */}
          <mesh position={[0, -0.12, 0]} material={materials.outfit} castShadow receiveShadow>
            <cylinderGeometry args={[0.075, 0.065, 0.24, 32]} />
          </mesh>
          {/* Lower Arm */}
          <mesh position={[0, -0.32, 0]} material={materials.outfit} castShadow receiveShadow>
            <cylinderGeometry args={[0.065, 0.055, 0.24, 32]} />
          </mesh>
          
          {/* Stylized Mitten Hand */}
          <group position={[0, -0.48, 0]}>
            {/* Hand Palm */}
            <mesh material={materials.skin} castShadow>
              <sphereGeometry args={[0.062, 32, 32]} />
            </mesh>
            {/* Outward pointing Thumb */}
            <mesh position={[-0.038, 0, 0.015]} rotation={[0, 0.2, 0.3]} material={materials.skin} castShadow>
              <cylinderGeometry args={[0.016, 0.016, 0.04, 16]} />
            </mesh>
            {/* Fingers block */}
            <mesh position={[0, -0.038, 0]} material={materials.skin} castShadow>
              <boxGeometry args={[0.05, 0.04, 0.035]} />
            </mesh>
          </group>

          {/* Peace sign indicators if peace selected */}
          {pose === 'peaceSign' && (
            <group position={[0, -0.55, 0]}>
              <mesh position={[-0.02, -0.05, 0]} material={materials.skin} castShadow>
                <cylinderGeometry args={[0.015, 0.015, 0.08, 16]} />
              </mesh>
              <mesh position={[0.02, -0.05, 0]} material={materials.skin} castShadow>
                <cylinderGeometry args={[0.015, 0.015, 0.08, 16]} />
              </mesh>
            </group>
          )}
        </group>

        {/* Right Shoulder joint */}
        <mesh position={[0.45, 0.45, 0]} material={materials.outfit} castShadow>
          <sphereGeometry args={[0.11, 32, 32]} />
        </mesh>

        {/* Right Arm (Tapered Segments + Hand) */}
        <group ref={rightArmRef} position={poseSettings.rightArmPos} rotation={poseSettings.rightArmRot}>
          {/* Upper Arm */}
          <mesh position={[0, -0.12, 0]} material={materials.outfit} castShadow receiveShadow>
            <cylinderGeometry args={[0.075, 0.065, 0.24, 32]} />
          </mesh>
          {/* Lower Arm */}
          <mesh position={[0, -0.32, 0]} material={materials.outfit} castShadow receiveShadow>
            <cylinderGeometry args={[0.065, 0.055, 0.24, 32]} />
          </mesh>

          {/* Stylized Mitten Hand */}
          <group position={[0, -0.48, 0]}>
            {/* Hand Palm */}
            <mesh material={materials.skin} castShadow>
              <sphereGeometry args={[0.062, 32, 32]} />
            </mesh>
            {/* Outward pointing Thumb */}
            <mesh position={[0.038, 0, 0.015]} rotation={[0, -0.2, -0.3]} material={materials.skin} castShadow>
              <cylinderGeometry args={[0.016, 0.016, 0.04, 16]} />
            </mesh>
            {/* Fingers block */}
            <mesh position={[0, -0.038, 0]} material={materials.skin} castShadow>
              <boxGeometry args={[0.05, 0.04, 0.035]} />
            </mesh>
          </group>

          {/* Thumb Raised if coolWink selected (as a thumb gesture) */}
          {pose === 'coolWink' && (
            <mesh position={[0, -0.52, 0.04]} rotation={[-0.3, 0, 0]} material={materials.skin} castShadow>
              <boxGeometry args={[0.02, 0.05, 0.02]} />
            </mesh>
          )}
        </group>
      </group>

      {/* ==================== NECK ==================== */}
      <mesh position={[0, 0.62, 0]} material={materials.skin} castShadow receiveShadow>
        <cylinderGeometry args={[0.14, 0.14, 0.2, 32]} />
      </mesh>

      {/* ==================== HEAD (ears, contoured nose, cheeks, mouth depth) ==================== */}
      <group ref={headRef} position={[0, 1.1, 0]} scale={headScale}>
        {/* Face Base Shape */}
        <mesh material={materials.skin} castShadow receiveShadow>
          <sphereGeometry args={[0.38, 32, 32]} />
        </mesh>

        {/* 3D Ears */}
        <group name="ears">
          {/* Left Ear */}
          <group position={[-0.38, 0.02, -0.05]} rotation={[0.08, 0, -0.15]}>
            <mesh material={materials.skin} castShadow>
              <sphereGeometry args={[0.07, 32, 32]} />
            </mesh>
            <mesh position={[0.015, 0, 0.015]} material={materials.skin}>
              <torusGeometry args={[0.04, 0.015, 8, 24]} />
            </mesh>
          </group>
          {/* Right Ear */}
          <group position={[0.38, 0.02, -0.05]} rotation={[0.08, 0, 0.15]}>
            <mesh material={materials.skin} castShadow>
              <sphereGeometry args={[0.07, 32, 32]} />
            </mesh>
            <mesh position={[-0.015, 0, 0.015]} material={materials.skin}>
              <torusGeometry args={[0.04, 0.015, 8, 24]} />
            </mesh>
          </group>
        </group>

        {/* ==================== EYES (HIGH-FIDELITY LAYERED DESIGN) ==================== */}
        {eyeStyle !== 'closed' && pose !== 'coolWink' ? (
          <group name="eyes-pupils">
            {/* Left Eye Ball */}
            <group ref={leftEyeRef} position={[-0.13, 0.06, 0.28]}>
              <mesh material={materials.eyeWhite} castShadow>
                <sphereGeometry args={[0.08, 32, 32]} />
              </mesh>
              {/* Iris */}
              <mesh position={[0, 0, 0.05]} material={materials.eye} castShadow>
                <sphereGeometry args={[0.048, 32, 32]} />
              </mesh>
              {/* Pupil */}
              <mesh position={[0, 0, 0.07]} material={materials.eyePupil} castShadow>
                <sphereGeometry args={[0.025, 32, 32]} />
              </mesh>
              {/* Glossy Outer Lens reflection overlay */}
              <mesh position={[0, 0, 0.02]} material={materials.glassesLens}>
                <sphereGeometry args={[0.082, 32, 32]} />
              </mesh>
              {/* 3D Contoured Upper Eyelid */}
              <mesh position={[0, 0.045, 0.06]} rotation={[0.15, 0, 0]} material={materials.skin}>
                <boxGeometry args={[0.09, 0.02, 0.03]} />
              </mesh>
              {/* Eyelash lines */}
              <mesh position={[-0.03, 0.055, 0.065]} rotation={[0, 0, 0.3]} material={materials.facialHair}>
                <boxGeometry args={[0.025, 0.008, 0.015]} />
              </mesh>
              <mesh position={[0.03, 0.055, 0.065]} rotation={[0, 0, -0.3]} material={materials.facialHair}>
                <boxGeometry args={[0.025, 0.008, 0.015]} />
              </mesh>
            </group>

            {/* Right Eye Ball */}
            <group ref={rightEyeRef} position={[0.13, 0.06, 0.28]}>
              <mesh material={materials.eyeWhite} castShadow>
                <sphereGeometry args={[0.08, 32, 32]} />
              </mesh>
              {/* Iris */}
              <mesh position={[0, 0, 0.05]} material={materials.eye} castShadow>
                <sphereGeometry args={[0.048, 32, 32]} />
              </mesh>
              {/* Pupil */}
              <mesh position={[0, 0, 0.07]} material={materials.eyePupil} castShadow>
                <sphereGeometry args={[0.025, 32, 32]} />
              </mesh>
              {/* Glossy Outer Lens reflection overlay */}
              <mesh position={[0, 0, 0.02]} material={materials.glassesLens}>
                <sphereGeometry args={[0.082, 32, 32]} />
              </mesh>
              {/* 3D Contoured Upper Eyelid */}
              <mesh position={[0, 0.045, 0.06]} rotation={[0.15, 0, 0]} material={materials.skin}>
                <boxGeometry args={[0.09, 0.02, 0.03]} />
              </mesh>
              {/* Eyelash lines */}
              <mesh position={[-0.03, 0.055, 0.065]} rotation={[0, 0, 0.3]} material={materials.facialHair}>
                <boxGeometry args={[0.025, 0.008, 0.015]} />
              </mesh>
              <mesh position={[0.03, 0.055, 0.065]} rotation={[0, 0, -0.3]} material={materials.facialHair}>
                <boxGeometry args={[0.025, 0.008, 0.015]} />
              </mesh>
            </group>
          </group>
        ) : (
          // Wink/Closed eye slit lines
          <group name="eyes-closed" position={[0, 0.06, 0.33]}>
            {/* Left Eye closed */}
            <mesh position={[-0.13, 0, 0]} material={materials.eyePupil} castShadow>
              <boxGeometry args={[0.08, 0.015, 0.015]} />
            </mesh>
            {/* Right Eye open if coolWink (wink pose), otherwise closed */}
            {pose === 'coolWink' ? (
              <group ref={rightEyeRef} position={[0.13, 0, -0.05]}>
                <mesh material={materials.eyeWhite} castShadow>
                  <sphereGeometry args={[0.08, 32, 32]} />
                </mesh>
                <mesh position={[0, 0, 0.05]} material={materials.eye} castShadow>
                  <sphereGeometry args={[0.048, 32, 32]} />
                </mesh>
                {/* Pupil */}
                <mesh position={[0, 0, 0.07]} material={materials.eyePupil} castShadow>
                  <sphereGeometry args={[0.025, 32, 32]} />
                </mesh>
                <mesh position={[0, 0, 0.02]} material={materials.glassesLens}>
                  <sphereGeometry args={[0.082, 32, 32]} />
                </mesh>
                {/* 3D Contoured Upper Eyelid */}
                <mesh position={[0, 0.045, 0.06]} rotation={[0.15, 0, 0]} material={materials.skin}>
                  <boxGeometry args={[0.09, 0.02, 0.03]} />
                </mesh>
              </group>
            ) : (
              <mesh position={[0.13, 0, 0]} material={materials.eyePupil} castShadow>
                <boxGeometry args={[0.08, 0.015, 0.015]} />
              </mesh>
            )}
          </group>
        )}

        {/* ==================== 3D EYEBROWS ==================== */}
        <group name="eyebrows">
          {/* Left Eyebrow */}
          <mesh position={[-0.13, 0.17, 0.30]} rotation={[0.08, -0.05, 0.1]} material={materials.facialHair} castShadow>
            <boxGeometry args={[0.075, 0.02, 0.018]} />
          </mesh>
          {/* Right Eyebrow */}
          <mesh position={[0.13, 0.17, 0.30]} rotation={[0.08, 0.05, -0.1]} material={materials.facialHair} castShadow>
            <boxGeometry args={[0.075, 0.02, 0.018]} />
          </mesh>
        </group>

        {/* ==================== NOSE (SOFT MODELED CHIBI NOSE) ==================== */}
        <group name="nose" position={[0, -0.02, 0.35]}>
          <mesh material={materials.skin} castShadow>
            <sphereGeometry args={[0.038, 32, 32]} />
          </mesh>
          {/* Nostrils details */}
          <mesh position={[-0.025, -0.01, -0.012]} material={materials.skin}>
            <sphereGeometry args={[0.018, 16, 16]} />
          </mesh>
          <mesh position={[0.025, -0.01, -0.012]} material={materials.skin}>
            <sphereGeometry args={[0.018, 16, 16]} />
          </mesh>
        </group>

        {/* ==================== MOUTH (3D DEPTH CAVITY) ==================== */}
        <group name="mouth" position={[0, -0.15, 0.34]}>
          {(mouthExpression === 'smile' || mouthExpression === 'wink') && (
            <>
              {/* Smiling Red lips */}
              <mesh rotation={[0, 0, Math.PI]} position={[0, 0.015, 0]} material={materials.shoes} castShadow>
                <torusGeometry args={[0.065, 0.015, 8, 32, Math.PI]} />
              </mesh>
              {/* Inner dark mouth depth */}
              <mesh position={[0, 0, -0.01]}>
                <boxGeometry args={[0.09, 0.04, 0.01]} />
                <meshBasicMaterial color="#371010" />
              </mesh>
            </>
          )}
          {mouthExpression === 'neutral' && (
            <mesh material={materials.shoes} castShadow>
              <boxGeometry args={[0.12, 0.015, 0.02]} />
            </mesh>
          )}
          {mouthExpression === 'shocked' && (
            <>
              <mesh material={materials.shoes} castShadow>
                <sphereGeometry args={[0.045, 32, 32]} />
              </mesh>
              <mesh position={[0, 0, -0.01]}>
                <sphereGeometry args={[0.04, 16, 16]} />
                <meshBasicMaterial color="#371010" />
              </mesh>
            </>
          )}
          {mouthExpression === 'pout' && (
            <mesh material={materials.shoes} castShadow>
              <sphereGeometry args={[0.03, 32, 32]} />
            </mesh>
          )}
          {mouthExpression === 'smirk' && (
            <mesh rotation={[0, 0, Math.PI - 0.4]} position={[0, 0.015, 0]} material={materials.shoes} castShadow>
              <torusGeometry args={[0.06, 0.015, 8, 32, Math.PI - 0.5]} />
            </mesh>
          )}
        </group>

        {/* ==================== HAIR & BEARD ==================== */}
        {hairStyle !== 'bald' && (
          <group name="hair" position={[0, 0.1, 0]}>
            {/* Hair base helmet */}
            <mesh material={materials.hair} castShadow receiveShadow>
              <sphereGeometry args={[0.4, 32, 32, 0, Math.PI * 2, 0, Math.PI / 1.7]} />
            </mesh>

            {/* Hair styling tufts / details matching Snapchat selections */}
            {hairStyle === 'curlyAfro' && (
              <group>
                {/* Denser volumetric curls for Snapchat Bitmoji style */}
                {Array.from({ length: 24 }).map((_, i) => {
                  const angle = (i / 24) * Math.PI * 2;
                  const lat = Math.sin((i / 8) * Math.PI) * 0.25;
                  const x = Math.cos(angle) * 0.33;
                  const z = Math.sin(angle) * 0.33;
                  const scaleVal = 0.8 + Math.sin(i * 1.5) * 0.3;
                  return (
                    <mesh key={i} position={[x, 0.24 + lat, z]} material={materials.hair} castShadow>
                      <sphereGeometry args={[0.14 * scaleVal, 16, 16]} />
                    </mesh>
                  );
                })}
                <mesh position={[0, 0.42, 0]} material={materials.hair} castShadow>
                  <sphereGeometry args={[0.24, 32, 32]} />
                </mesh>
              </group>
            )}

            {hairStyle === 'longWaves' && (
              <group>
                {/* Volumetric wavy hair locks flowing down */}
                <mesh position={[-0.24, -0.32, -0.2]} rotation={[0.1, 0, -0.1]} material={materials.hair} castShadow>
                  <cylinderGeometry args={[0.11, 0.07, 0.6, 32]} />
                </mesh>
                <mesh position={[0.24, -0.32, -0.2]} rotation={[0.1, 0, 0.1]} material={materials.hair} castShadow>
                  <cylinderGeometry args={[0.11, 0.07, 0.6, 32]} />
                </mesh>
                <mesh position={[0, -0.35, -0.25]} material={materials.hair} castShadow>
                  <cylinderGeometry args={[0.19, 0.13, 0.58, 32]} />
                </mesh>
                {/* Additional wavy ring details */}
                <mesh position={[-0.32, -0.12, 0.05]} rotation={[0.4, 0, 0.2]} material={materials.hair} castShadow>
                  <torusGeometry args={[0.12, 0.045, 8, 32]} />
                </mesh>
                <mesh position={[0.32, -0.12, 0.05]} rotation={[0.4, 0, -0.2]} material={materials.hair} castShadow>
                  <torusGeometry args={[0.12, 0.045, 8, 32]} />
                </mesh>
              </group>
            )}

            {hairStyle === 'shortSpikes' && (
              <group>
                {/* Premium spiky cones */}
                {Array.from({ length: 12 }).map((_, i) => {
                  const angle = (i / 12) * Math.PI * 2;
                  const x = Math.cos(angle) * 0.22;
                  const z = Math.sin(angle) * 0.22;
                  return (
                    <mesh key={i} position={[x, 0.35, z]} rotation={[0.35, angle, 0]} material={materials.hair} castShadow>
                      <coneGeometry args={[0.07, 0.24, 4]} />
                    </mesh>
                  );
                })}
              </group>
            )}

            {hairStyle === 'topKnot' && (
              <group>
                <mesh position={[0, 0.44, -0.1]} material={materials.hair} castShadow>
                  <sphereGeometry args={[0.14, 24, 24]} />
                </mesh>
                <mesh position={[0, 0.42, -0.1]} material={materials.headwear} castShadow>
                  <torusGeometry args={[0.09, 0.025, 8, 32]} />
                </mesh>
              </group>
            )}

            {hairStyle === 'classicPart' && (
              <group>
                <mesh position={[-0.1, 0.35, 0.1]} rotation={[0, 0.2, -0.15]} material={materials.hair} castShadow>
                  <boxGeometry args={[0.26, 0.11, 0.23]} />
                </mesh>
                <mesh position={[0.15, 0.32, 0.1]} rotation={[0, -0.2, 0.15]} material={materials.hair} castShadow>
                  <boxGeometry args={[0.21, 0.11, 0.23]} />
                </mesh>
              </group>
            )}

            {hairStyle === 'elegantBob' && (
              <group>
                <mesh position={[-0.38, -0.1, 0.12]} material={materials.hair} castShadow>
                  <sphereGeometry args={[0.09, 24, 24]} />
                </mesh>
                <mesh position={[0.38, -0.1, 0.12]} material={materials.hair} castShadow>
                  <sphereGeometry args={[0.09, 24, 24]} />
                </mesh>
                <mesh position={[-0.36, -0.2, -0.1]} material={materials.hair} castShadow>
                  <cylinderGeometry args={[0.085, 0.085, 0.4, 32]} />
                </mesh>
                <mesh position={[0.36, -0.2, -0.1]} material={materials.hair} castShadow>
                  <cylinderGeometry args={[0.085, 0.085, 0.4, 32]} />
                </mesh>
              </group>
            )}

            {hairStyle === 'pixie' && (
              <group>
                {/* Feathery overlapping segments */}
                <mesh position={[0, 0.34, 0.1]} rotation={[0.2, 0, 0]} material={materials.hair} castShadow>
                  <sphereGeometry args={[0.28, 24, 24]} />
                </mesh>
                <mesh position={[-0.18, 0.22, 0.18]} rotation={[0.1, 0, -0.3]} material={materials.hair} castShadow>
                  <boxGeometry args={[0.15, 0.1, 0.15]} />
                </mesh>
                <mesh position={[0.18, 0.22, 0.18]} rotation={[0.1, 0, 0.3]} material={materials.hair} castShadow>
                  <boxGeometry args={[0.15, 0.1, 0.15]} />
                </mesh>
              </group>
            )}
          </group>
        )}

        {/* ==================== FACIAL HAIR (BEARDS & GOATEES) ==================== */}
        {facialHair !== 'none' && (
          <group name="facial-hair" position={[0, -0.18, 0.28]}>
            {facialHair === 'beard' && (
              <mesh position={[0, -0.06, 0.03]} material={materials.facialHair} castShadow>
                <torusGeometry args={[0.18, 0.038, 8, 32]} />
              </mesh>
            )}
            {facialHair === 'stubble' && (
              <mesh position={[0, -0.06, 0.035]} castShadow>
                <torusGeometry args={[0.185, 0.02, 8, 32]} />
                <meshStandardMaterial color={facialHairColor} opacity={0.65} transparent />
              </mesh>
            )}
            {facialHair === 'mustache' && (
              <mesh position={[0, 0.05, 0.065]} material={materials.facialHair} castShadow>
                <boxGeometry args={[0.14, 0.02, 0.02]} />
              </mesh>
            )}
            {facialHair === 'goatee' && (
              <mesh position={[0, -0.08, 0.05]} material={materials.facialHair} castShadow>
                <cylinderGeometry args={[0.045, 0.025, 0.1, 16]} />
              </mesh>
            )}
          </group>
        )}

        {/* ==================== CHEEK BLUSH PASS ==================== */}
        {cheekBlush !== 'none' && (
          <group name="blush-plates" position={[0, -0.05, 0.33]}>
            <mesh position={[-0.24, -0.05, 0.1]}>
              <sphereGeometry args={[0.05, 16, 16]} />
              <meshStandardMaterial color={cheekBlush === 'rosy' ? '#FFB7D5' : cheekBlush === 'neonPurple' ? '#D8B4FE' : '#FDBA74'} opacity={0.35} transparent />
            </mesh>
            <mesh position={[0.24, -0.05, 0.1]}>
              <sphereGeometry args={[0.05, 16, 16]} />
              <meshStandardMaterial color={cheekBlush === 'rosy' ? '#FFB7D5' : cheekBlush === 'neonPurple' ? '#D8B4FE' : '#FDBA74'} opacity={0.35} transparent />
            </mesh>
          </group>
        )}

        {/* ==================== JEWELRY (EARRINGS) ==================== */}
        {earrings === 'goldStuds' && (
          <group name="earrings">
            <mesh position={[-0.41, -0.06, 0]} material={materials.goldCrown} castShadow>
              <sphereGeometry args={[0.025, 16, 16]} />
            </mesh>
            <mesh position={[0.41, -0.06, 0]} material={materials.goldCrown} castShadow>
              <sphereGeometry args={[0.025, 16, 16]} />
            </mesh>
          </group>
        )}
        {earrings === 'hoops' && (
          <group name="earrings">
            <mesh position={[-0.43, -0.09, 0]} rotation={[0, Math.PI / 2, 0]} material={materials.goldCrown} castShadow>
              <torusGeometry args={[0.05, 0.01, 8, 32]} />
            </mesh>
            <mesh position={[0.43, -0.09, 0]} rotation={[0, Math.PI / 2, 0]} material={materials.goldCrown} castShadow>
              <torusGeometry args={[0.05, 0.01, 8, 32]} />
            </mesh>
          </group>
        )}

        {/* ==================== EYEWEAR (GLASSES) ==================== */}
        {eyewear !== 'none' && (
          <group name="eyewear" position={[0, 0.06, 0.28]}>
            {eyewear === 'round' && (
              <group>
                <mesh position={[-0.13, 0, 0.06]} rotation={[0, 0, 0]} material={materials.glassesFrame} castShadow>
                  <torusGeometry args={[0.09, 0.012, 8, 32]} />
                </mesh>
                <mesh position={[0.13, 0, 0.06]} rotation={[0, 0, 0]} material={materials.glassesFrame} castShadow>
                  <torusGeometry args={[0.09, 0.012, 8, 32]} />
                </mesh>
                <mesh position={[0, 0.01, 0.06]} material={materials.glassesFrame} castShadow>
                  <boxGeometry args={[0.08, 0.015, 0.015]} />
                </mesh>
              </group>
            )}

            {eyewear === 'aviators' && (
              <group>
                <mesh position={[-0.13, -0.01, 0.06]} rotation={[0.05, 0.05, 0]} material={materials.glassesFrame} castShadow>
                  <torusGeometry args={[0.095, 0.012, 8, 32]} />
                </mesh>
                <mesh position={[0.13, -0.01, 0.06]} rotation={[0.05, -0.05, 0]} material={materials.glassesFrame} castShadow>
                  <torusGeometry args={[0.095, 0.012, 8, 32]} />
                </mesh>
                <mesh position={[0, 0.045, 0.06]} material={materials.glassesFrame} castShadow>
                  <boxGeometry args={[0.08, 0.012, 0.012]} />
                </mesh>
                {/* Lenses */}
                <mesh position={[-0.13, -0.01, 0.058]} material={materials.glassesLens}>
                  <sphereGeometry args={[0.092, 16, 16]} />
                </mesh>
                <mesh position={[0.13, -0.01, 0.058]} material={materials.glassesLens}>
                  <sphereGeometry args={[0.092, 16, 16]} />
                </mesh>
              </group>
            )}

            {eyewear === 'visor' && (
              <mesh position={[0, 0, 0.09]} material={materials.glowingVisor} castShadow>
                {/* Cyberpunk wrapping glowing screen visor */}
                <cylinderGeometry args={[0.39, 0.39, 0.16, 32, 1, true, -Math.PI / 3, Math.PI * (2/3)]} />
              </mesh>
            )}

            {eyewear === 'catEye' && (
              <group>
                <mesh position={[-0.13, 0.01, 0.065]} rotation={[0, 0, 0.25]} material={materials.glassesFrame} castShadow>
                  <boxGeometry args={[0.2, 0.06, 0.015]} />
                </mesh>
                <mesh position={[0.13, 0.01, 0.065]} rotation={[0, 0, -0.25]} material={materials.glassesFrame} castShadow>
                  <boxGeometry args={[0.2, 0.06, 0.015]} />
                </mesh>
                <mesh position={[0, 0.03, 0.06]} material={materials.glassesFrame} castShadow>
                  <boxGeometry args={[0.08, 0.015, 0.015]} />
                </mesh>
              </group>
            )}
          </group>
        )}

        {/* ==================== HEADWEAR (HATS) ==================== */}
        {headwear !== 'none' && (
          <group name="headwear" position={[0, 0.25, 0]}>
            {headwear === 'backwardCap' && (
              <group position={[0, 0.11, -0.04]} rotation={[-0.15, 0, 0]}>
                {/* Cap dome */}
                <mesh material={materials.headwear} castShadow>
                  <sphereGeometry args={[0.41, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
                </mesh>
                {/* Visor brim extended backward */}
                <mesh position={[0, -0.05, -0.42]} rotation={[0.15, 0, 0]} material={materials.headwear} castShadow>
                  <boxGeometry args={[0.3, 0.012, 0.22]} />
                </mesh>
              </group>
            )}

            {headwear === 'beanie' && (
              <mesh position={[0, 0.12, 0]} rotation={[-0.05, 0, 0]} material={materials.headwear} castShadow>
                <cylinderGeometry args={[0.39, 0.415, 0.35, 32]} />
              </mesh>
            )}

            {headwear === 'headband' && (
              <mesh position={[0, 0.03, 0.02]} rotation={[0.05, 0, 0]} material={materials.headwear} castShadow>
                <torusGeometry args={[0.395, 0.035, 8, 32]} />
              </mesh>
            )}

            {headwear === 'crown' && (
              <group position={[0, 0.32, 0]} rotation={[-0.1, 0, 0]}>
                {/* Crown base circle ring */}
                <mesh material={materials.goldCrown} castShadow>
                  <torusGeometry args={[0.22, 0.022, 8, 32]} />
                </mesh>
                {/* Pointy crown spires */}
                {[0, 60, 120, 180, 240, 300].map(deg => (
                  <mesh 
                    key={deg}
                    position={[Math.cos((deg * Math.PI) / 180) * 0.21, 0.06, Math.sin((deg * Math.PI) / 180) * 0.21]} 
                    rotation={[0, -(deg * Math.PI) / 180, 0.3]} 
                    material={materials.goldCrown}
                    castShadow
                  >
                    <coneGeometry args={[0.03, 0.12, 4]} />
                  </mesh>
                ))}
              </group>
            )}

            {headwear === 'wizardHat' && (
              <group position={[0, 0.32, -0.02]}>
                {/* Brim base ring */}
                <mesh rotation={[Math.PI / 2, 0, 0]} material={materials.headwear} castShadow>
                  <torusGeometry args={[0.38, 0.03, 8, 32]} />
                </mesh>
                {/* Pointy wizard hat cone */}
                <mesh position={[0, 0.32, 0.02]} rotation={[-0.15, 0, 0]} material={materials.headwear} castShadow>
                  <coneGeometry args={[0.22, 0.68, 32]} />
                </mesh>
              </group>
            )}
          </group>
        )}
      </group>
    </group>
  );
}

// 🏛️ Physical Pedestal Stage under the avatar's feet
function PedestalStage({ backgroundStyle, ambientEnvironment }: { backgroundStyle: string; ambientEnvironment: string }) {
  const outerRingRef = useRef<THREE.Mesh>(null);
  const baseRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (outerRingRef.current) {
      outerRingRef.current.rotation.y = -time * 0.25;
    }
    if (baseRef.current) {
      baseRef.current.rotation.y = time * 0.1;
    }
  });

  const matParams = useMemo(() => {
    if (backgroundStyle === 'cyberGrid') {
      return { baseColor: '#091E3A', ringColor: '#06B6D4', metal: 0.8, rough: 0.2, emissiveInt: 0.5 };
    }
    if (backgroundStyle === 'deepSpace') {
      return { baseColor: '#1E1B4B', ringColor: '#818CF8', metal: 0.9, rough: 0.1, emissiveInt: 0.35 };
    }
    if (backgroundStyle === 'sunset') {
      return { baseColor: '#3F1F0C', ringColor: '#F97316', metal: 0.7, rough: 0.3, emissiveInt: 0.4 };
    }
    if (backgroundStyle === 'aurora') {
      return { baseColor: '#064E3B', ringColor: '#34D399', metal: 0.7, rough: 0.3, emissiveInt: 0.45 };
    }
    return { baseColor: '#1C1917', ringColor: '#D4AF37', metal: 0.8, rough: 0.15, emissiveInt: 0.25 };
  }, [backgroundStyle]);

  return (
    <group position={[0, -1.5, 0]}>
      {/* Primary Pedestal Base Cylinder */}
      <mesh ref={baseRef} castShadow receiveShadow>
        <cylinderGeometry args={[0.72, 0.8, 0.14, 24]} />
        <meshStandardMaterial 
          color={matParams.baseColor} 
          metalness={matParams.metal} 
          roughness={matParams.rough} 
        />
      </mesh>

      {/* Embedded central glowing neon surface plate */}
      <mesh position={[0, 0.075, 0]}>
        <cylinderGeometry args={[0.55, 0.55, 0.01, 24]} />
        <meshStandardMaterial 
          color={matParams.ringColor} 
          emissive={matParams.ringColor} 
          emissiveIntensity={matParams.emissiveInt} 
          roughness={0.1}
        />
      </mesh>

      {/* Surrounding slow rotating orbit ring */}
      <mesh ref={outerRingRef} position={[0, 0.04, 0]}>
        <torusGeometry args={[0.82, 0.02, 8, 32]} />
        <meshStandardMaterial 
          color={matParams.ringColor} 
          emissive={matParams.ringColor} 
          emissiveIntensity={matParams.emissiveInt * 1.5} 
          roughness={0.1}
        />
      </mesh>
    </group>
  );
}

// 🌠 Low-poly Asteroid Mesh
function Asteroid({ position, scale, rotSpeed }: { position: [number, number, number]; scale: number; rotSpeed: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (meshRef.current) {
      const time = state.clock.getElapsedTime();
      meshRef.current.rotation.x = time * rotSpeed;
      meshRef.current.rotation.y = time * (rotSpeed * 0.8);
    }
  });

  return (
    <mesh ref={meshRef} position={position} scale={scale}>
      <dodecahedronGeometry args={[1, 1]} />
      <meshStandardMaterial color="#4B5563" roughness={0.8} metalness={0.2} />
    </mesh>
  );
}

// 🌴 Scenic decorations for different environments
function StageScenicElements({ backgroundStyle, ambientEnvironment }: { backgroundStyle: string; ambientEnvironment: string }) {
  const portalRingRef = useRef<THREE.Mesh>(null);
  const sceneryGroupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (portalRingRef.current) {
      portalRingRef.current.rotation.z = time * 0.3;
    }
    if (sceneryGroupRef.current) {
      sceneryGroupRef.current.rotation.y = time * 0.03;
    }
  });

  return (
    <group>
      {/* 1. CYBER GRID SCENERY */}
      {backgroundStyle === 'cyberGrid' && (
        <group ref={sceneryGroupRef}>
          {/* Cyberpunk floating glowing columns */}
          <mesh position={[-2.4, -0.4, -1.8]}>
            <boxGeometry args={[0.2, 2.2, 0.2]} />
            <meshStandardMaterial color="#06B6D4" emissive="#06B6D4" emissiveIntensity={0.6} roughness={0.1} />
          </mesh>
          <mesh position={[2.4, -0.4, -1.8]}>
            <boxGeometry args={[0.2, 2.2, 0.2]} />
            <meshStandardMaterial color="#FF007F" emissive="#FF007F" emissiveIntensity={0.6} roughness={0.1} />
          </mesh>
          {/* Back neon wireframe ring */}
          <mesh position={[0, 0.3, -2.5]} rotation={[0.2, 0, 0]}>
            <torusGeometry args={[1.5, 0.03, 12, 48]} />
            <meshStandardMaterial color="#06B6D4" emissive="#06B6D4" emissiveIntensity={0.8} />
          </mesh>
          {/* Outer rotating cyberpunk ring */}
          <mesh ref={portalRingRef} position={[0, -1.48, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[1.2, 0.02, 8, 32]} />
            <meshStandardMaterial color="#FF007F" emissive="#FF007F" emissiveIntensity={0.8} />
          </mesh>
        </group>
      )}

      {/* 2. DEEP SPACE SCENERY */}
      {backgroundStyle === 'deepSpace' && (
        <group ref={sceneryGroupRef}>
          {/* Low-poly Floating Asteroids */}
          <Asteroid position={[-1.8, 0.7, -1.5]} scale={0.22} rotSpeed={0.14} />
          <Asteroid position={[1.9, 0.3, -1.2]} scale={0.16} rotSpeed={-0.18} />
          <Asteroid position={[-1.3, -0.5, -1.0]} scale={0.14} rotSpeed={0.22} />
          <Asteroid position={[1.1, 1.2, -1.6]} scale={0.2} rotSpeed={-0.1} />
          <Asteroid position={[0, 1.5, -2.2]} scale={0.28} rotSpeed={0.07} />
          
          {/* Cosmic Planetary Ring */}
          <mesh position={[0, 0.2, -2.0]} rotation={[0.4, 0.5, 0.2]}>
            <torusGeometry args={[1.3, 0.06, 6, 36]} />
            <meshStandardMaterial color="#312E81" emissive="#4338CA" emissiveIntensity={0.3} transparent opacity={0.65} />
          </mesh>
        </group>
      )}

      {/* 3. SUNSET SCENERY */}
      {backgroundStyle === 'sunset' && (
        <group>
          {/* Huge sun disk in the back */}
          <mesh position={[0, 0.25, -3.2]}>
            <sphereGeometry args={[1.1, 32, 16]} />
            <meshBasicMaterial color="#FF5A36" />
          </mesh>
          <mesh position={[0, 0.25, -3.15]}>
            <sphereGeometry args={[1.11, 32, 16]} />
            <meshBasicMaterial color="#FF8A36" transparent opacity={0.35} />
          </mesh>

          {/* Low-poly mountains */}
          <mesh position={[-1.7, -1.4, -2.8]}>
            <coneGeometry args={[1.5, 1.1, 4]} />
            <meshBasicMaterial color="#1E110A" />
          </mesh>
          <mesh position={[1.7, -1.5, -2.8]} rotation={[0, 0, 0.15]}>
            <coneGeometry args={[1.3, 0.9, 4]} />
            <meshBasicMaterial color="#170D08" />
          </mesh>

          {/* Silhouette palm trunks */}
          <mesh position={[-2.3, -0.3, -2.0]} rotation={[0, 0, -0.12]}>
            <cylinderGeometry args={[0.035, 0.075, 2.5, 8]} />
            <meshBasicMaterial color="#0F0805" />
          </mesh>
          <mesh position={[2.3, -0.3, -2.0]} rotation={[0, 0, 0.12]}>
            <cylinderGeometry args={[0.035, 0.075, 2.5, 8]} />
            <meshBasicMaterial color="#0F0805" />
          </mesh>
        </group>
      )}

      {/* 4. AURORA SCENERY */}
      {backgroundStyle === 'aurora' && (
        <group>
          {/* Stylized Low-Poly Pine Trees */}
          <group position={[-1.9, -1.0, -1.5]}>
            <mesh position={[0, 0.3, 0]}>
              <coneGeometry args={[0.24, 0.75, 5]} />
              <meshStandardMaterial color="#064E3B" roughness={0.9} />
            </mesh>
            <mesh position={[0, -0.2, 0]}>
              <cylinderGeometry args={[0.04, 0.04, 0.4, 6]} />
              <meshStandardMaterial color="#451A03" />
            </mesh>
          </group>

          <group position={[1.9, -1.0, -1.5]}>
            <mesh position={[0, 0.3, 0]}>
              <coneGeometry args={[0.22, 0.65, 5]} />
              <meshStandardMaterial color="#064E3B" roughness={0.9} />
            </mesh>
            <mesh position={[0, -0.2, 0]}>
              <cylinderGeometry args={[0.04, 0.04, 0.4, 6]} />
              <meshStandardMaterial color="#451A03" />
            </mesh>
          </group>
        </group>
      )}

      {/* 5. HOLOGRAM MATRIX */}
      {ambientEnvironment === 'hologramMatrix' && (
        <group>
          <mesh position={[0, 0.3, -2.6]}>
            <planeGeometry args={[6, 4]} />
            <meshStandardMaterial color="#022C22" emissive="#10B981" emissiveIntensity={0.06} transparent opacity={0.8} />
          </mesh>
        </group>
      )}
    </group>
  );
}

// ❄️ Floating particle system coordinated with themes
function StageParticles({ backgroundStyle, ambientEnvironment }: { backgroundStyle: string; ambientEnvironment: string }) {
  const particlesRef = useRef<THREE.Group>(null);

  // Generate 40 customized particle properties
  const particles = useMemo(() => {
    return Array.from({ length: 40 }).map(() => ({
      x: -2.0 + Math.random() * 4.0,
      y: -1.5 + Math.random() * 3.0,
      z: -1.6 + Math.random() * 3.2,
      speed: 0.004 + Math.random() * 0.012,
      scale: 0.012 + Math.random() * 0.028,
      phase: Math.random() * Math.PI * 2,
      swaySpeed: 0.6 + Math.random() * 1.2,
      swayRange: 0.001 + Math.random() * 0.003,
      color: 
        backgroundStyle === 'cyberGrid' ? (Math.random() > 0.5 ? '#06B6D4' : '#FF007F') :
        backgroundStyle === 'deepSpace' ? '#FFFFFF' :
        backgroundStyle === 'sunset' ? '#F97316' :
        backgroundStyle === 'aurora' ? '#34D399' :
        ambientEnvironment === 'hologramMatrix' ? '#10B981' :
        '#FDE047' // Golden dust
    }));
  }, [backgroundStyle, ambientEnvironment]);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (particlesRef.current) {
      particlesRef.current.children.forEach((child, i) => {
        const p = particles[i];
        if (p) {
          // Drifts upward
          child.position.y += p.speed;
          // Organic sine horizontal sway
          child.position.x += Math.sin(time * p.swaySpeed + p.phase) * p.swayRange;
          
          // Reset when exceeding height limit
          if (child.position.y > 1.6) {
            child.position.y = -1.4;
            child.position.x = p.x;
          }
          
          child.rotation.x += 0.01;
          child.rotation.y += 0.015;
        }
      });
    }
  });

  return (
    <group ref={particlesRef}>
      {particles.map((p, i) => (
        <mesh key={i} position={[p.x, p.y, p.z]} scale={p.scale}>
          {backgroundStyle === 'cyberGrid' || ambientEnvironment === 'hologramMatrix' ? (
            <boxGeometry args={[1, 1, 1]} />
          ) : (
            <sphereGeometry args={[1, 6, 6]} />
          )}
          <meshStandardMaterial 
            color={p.color} 
            emissive={p.color} 
            emissiveIntensity={0.75} 
            roughness={0.1}
            transparent
            opacity={0.65}
          />
        </mesh>
      ))}
    </group>
  );
}

// 🔦 Volumetric Spotlight cone beam shining from above
function SpotlightCone({ ambientEnvironment }: { ambientEnvironment: string }) {
  if (ambientEnvironment !== 'stageSpotlight') return null;

  return (
    <mesh position={[0, 0.5, 0]}>
      {/* Cone openEnded to feel like real projection light */}
      <cylinderGeometry args={[0.15, 1.0, 2.6, 16, 1, true]} />
      <meshBasicMaterial 
        color="#FDE047" 
        transparent 
        opacity={0.11} 
        side={THREE.DoubleSide} 
        depthWrite={false}
      />
    </mesh>
  );
}

// Main Canvas 3D Viewer Container with Orbit Controls
export function Canvas3D({ config, arMode = false }: Canvas3DProps) {
  const getBackgroundColor = () => {
    switch (config.backgroundStyle) {
      case 'sunset': return '#3c241a'; // Dark Sunset Amber
      case 'deepSpace': return '#09070f'; // Space obsidian
      case 'aurora': return '#06171a'; // Polar teal
      case 'cyberGrid': return '#05070e'; // Cyber grid bg
      case 'solid':
      default: return config.backgroundColor || '#0a0a0a';
    }
  };

  const showGrid = config.backgroundStyle === 'cyberGrid' && !arMode;

  return (
    <div 
      className={`w-full h-full min-h-[320px] flex items-center justify-center relative rounded-3xl overflow-hidden border border-[#EAE3D2]/10 ${
        arMode ? 'bg-transparent' : 'bg-stone-950 shadow-inner'
      }`}
      style={{ backgroundColor: arMode ? 'transparent' : getBackgroundColor() }}
    >
      <Canvas
        camera={{ position: [0, 0.3, 3.0], fov: 45 }}
        shadows
        gl={{ antialias: true, preserveDrawingBuffer: true }}
      >
        {!arMode && <color attach="background" args={[getBackgroundColor()]} />}
        {!arMode && <fog attach="fog" args={[getBackgroundColor(), 1.5, 4.2]} />}
        
        {/* Cinematic Studio Lights */}
        <ambientLight intensity={0.55} />
        
        {/* Principal Key Light */}
        <directionalLight 
          position={[1.5, 2.5, 2]} 
          intensity={1.5} 
          castShadow 
          shadow-mapSize-width={2048} 
          shadow-mapSize-height={2048} 
          shadow-bias={-0.0005}
        />

        {/* Overhead SpotLight for dramatic highlights & ground shadows */}
        <spotLight
          position={[0, 4, 2]}
          angle={0.6}
          penumbra={0.8}
          intensity={2.5}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-bias={-0.0005}
        />
        
        {/* Soft Backlight / Rim Lighting */}
        <directionalLight 
          position={[-1.8, 1.8, -2]} 
          intensity={0.9} 
          color={config.renderStyle3D === 'cyberpunkGlow' ? '#22D3EE' : '#FAF9F6'} 
        />
        
        {/* Warm Ground Fill Light */}
        <pointLight position={[0, -1.5, 1]} intensity={0.4} color="#FAF9F6" />

        {/* Scenic decorations */}
        {!arMode && (
          <StageScenicElements 
            backgroundStyle={config.backgroundStyle} 
            ambientEnvironment={config.ambientEnvironment || 'none'} 
          />
        )}

        {/* Dynamic environmental particles */}
        {!arMode && (
          <StageParticles 
            backgroundStyle={config.backgroundStyle} 
            ambientEnvironment={config.ambientEnvironment || 'none'} 
          />
        )}

        {/* Volumetric Spotlight Cone */}
        {!arMode && (
          <SpotlightCone 
            ambientEnvironment={config.ambientEnvironment || 'none'} 
          />
        )}

        {/* Physical Pedestal Stage */}
        {!arMode && (
          <PedestalStage 
            backgroundStyle={config.backgroundStyle} 
            ambientEnvironment={config.ambientEnvironment || 'none'} 
          />
        )}

        {/* Character Object Model */}
        <CharacterModel config={config} arMode={arMode} />

        {/* Grid environment styling if cyberGrid background is set */}
        {showGrid && (
          <gridHelper args={[15, 15, '#22D3EE', '#1E293B']} position={[0, -1.5, 0]} />
        )}

        {/* Soft Shadow Ground Receiver */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.49, 0]} receiveShadow>
          <planeGeometry args={[10, 10]} />
          <shadowMaterial opacity={0.3} />
        </mesh>

        {/* 🔄 Orbit Controls for full 3D viewport rotation and zoom */}
        <OrbitControls 
          enableZoom={true} 
          enablePan={true} 
          minDistance={1.2} 
          maxDistance={5.0} 
          maxPolarAngle={Math.PI / 1.7} // Prevent scrolling below the floor
          minPolarAngle={Math.PI / 6}   // Prevent looking too vertically down
          enableDamping={true}
          dampingFactor={0.05}
        />
      </Canvas>

      {/* Floating Instructions Banner */}
      <div className="absolute bottom-3 left-3 bg-stone-900/80 border border-stone-800 backdrop-blur-sm rounded-lg px-2.5 py-1.5 pointer-events-none flex items-center gap-1.5 text-[10px] text-[#C4B99D] font-mono">
        <span className="animate-pulse">🟢</span>
        <span>Drag to rotate, pinch to zoom</span>
      </div>
    </div>
  );
}

export default Canvas3D;
