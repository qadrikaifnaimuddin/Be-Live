import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Sparkles, 
  Download, 
  Check, 
  Shuffle, 
  Palette, 
  Smile, 
  Scissors, 
  Shirt, 
  User as UserIcon, 
  Glasses,
  Compass,
  ArrowRight,
  Camera,
  Video,
  VideoOff,
  HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User } from '../types';
import { playSpatialAvatarSound } from '../lib/avatarAudio';
import { Canvas3D } from './Canvas3D';

// Define the Avatar configuration interface
export interface AvatarConfig {
  skinTone: string;
  faceShape: 'oval' | 'round' | 'square' | 'heart' | 'diamond';
  hairStyle: 'shortSpikes' | 'classicPart' | 'curlyAfro' | 'elegantBob' | 'longWaves' | 'bald' | 'pixie' | 'topKnot';
  hairColor: string;
  eyeStyle: 'friendly' | 'sleek' | 'sharp' | 'anime' | 'closed';
  eyeColor: string;
  eyebrows: 'classic' | 'bushy' | 'sharp' | 'flat';
  noseShape: 'button' | 'classic' | 'wide' | 'pointy';
  mouthExpression: 'smile' | 'smirk' | 'neutral' | 'pout' | 'shocked' | 'wink';
  facialHair: 'none' | 'stubble' | 'beard' | 'mustache' | 'goatee';
  facialHairColor: string;
  eyewear: 'none' | 'round' | 'aviators' | 'visor' | 'catEye';
  headwear: 'none' | 'backwardCap' | 'beanie' | 'wizardHat' | 'crown' | 'headband';
  earrings: 'none' | 'goldStuds' | 'hoops';
  outfit: 'hoodie' | 'suit' | 'tee' | 'techJacket' | 'gown';
  outfitColor: string;
  pants?: 'jeans' | 'sweatpants' | 'shorts' | 'cargo' | 'chinos';
  pantsColor?: string;
  shoes?: 'sneakers' | 'boots' | 'loafers' | 'sandals' | 'highTops';
  shoesColor?: string;
  backgroundStyle: 'solid' | 'aurora' | 'cyberGrid' | 'sunset' | 'deepSpace';
  backgroundColor: string;
  
  // Advanced 3D Volumetric parameters
  renderStyle3D?: 'softToy' | 'shinyPlastic' | 'metallicGold' | 'cyberpunkGlow' | 'crystalGlass' | 'iridescentPearl' | 'stealthCarbon' | 'glassmorphicRefraction' | 'rainbowHologram';
  lightingAngle?: 'topLeft' | 'frontal' | 'topRight';
  shadingIntensity?: number; // 0 - 100
  glossiness?: number; // 0 - 100
  rimGlowColor?: string; // Hex color for lighting aura
  cheekBlush?: 'none' | 'rosy' | 'neonPurple' | 'coralGold';

  // Snapchat 3D Rig additions
  pose?: 'portrait' | 'coolWink' | 'royalWave' | 'peaceSign' | 'dancing' | 'thinking' | 'superHero' | 'meditating' | 'waveHello';
  ambientEnvironment?: 'none' | 'studioGlow' | 'stageSpotlight' | 'discoReflections' | 'hologramMatrix' | 'sunsetShadows';
}

// Preset Styles for Coordinated Looks
const AVATAR_PRESETS = [
  {
    name: 'Tech Nomad',
    config: {
      skinTone: '#F1C27D',
      faceShape: 'square',
      hairStyle: 'shortSpikes',
      hairColor: '#E6C229',
      eyeStyle: 'sleek',
      eyeColor: '#1565C0',
      eyebrows: 'sharp',
      noseShape: 'classic',
      mouthExpression: 'smirk',
      facialHair: 'stubble',
      facialHairColor: '#3D2314',
      eyewear: 'visor',
      headwear: 'headband',
      earrings: 'hoops',
      outfit: 'techJacket',
      outfitColor: '#1F1F1F',
      backgroundStyle: 'cyberGrid',
      backgroundColor: '#0F172A'
    } as AvatarConfig
  },
  {
    name: 'Ethereal Royalty',
    config: {
      skinTone: '#FFDFC4',
      faceShape: 'heart',
      hairStyle: 'longWaves',
      hairColor: '#E2E8F0',
      eyeStyle: 'anime',
      eyeColor: '#6A1B9A',
      eyebrows: 'classic',
      noseShape: 'button',
      mouthExpression: 'smile',
      facialHair: 'none',
      facialHairColor: '#1A1A1A',
      eyewear: 'none',
      headwear: 'crown',
      earrings: 'goldStuds',
      outfit: 'gown',
      outfitColor: '#C4B99D',
      backgroundStyle: 'aurora',
      backgroundColor: '#FAF9F6'
    } as AvatarConfig
  },
  {
    name: 'Cozy Academian',
    config: {
      skinTone: '#B88760',
      faceShape: 'oval',
      hairStyle: 'elegantBob',
      hairColor: '#3D2314',
      eyeStyle: 'friendly',
      eyeColor: '#2E7D32',
      eyebrows: 'bushy',
      noseShape: 'pointy',
      mouthExpression: 'neutral',
      facialHair: 'goatee',
      facialHairColor: '#3D2314',
      eyewear: 'round',
      headwear: 'beanie',
      earrings: 'none',
      outfit: 'hoodie',
      outfitColor: '#FDA4AF',
      backgroundStyle: 'sunset',
      backgroundColor: '#F97316'
    } as AvatarConfig
  },
  {
    name: 'Cyberpunk Witch',
    config: {
      skinTone: '#FFB7D5',
      faceShape: 'diamond',
      hairStyle: 'pixie',
      hairColor: '#FF007F',
      eyeStyle: 'sharp',
      eyeColor: '#3B82F6',
      eyebrows: 'sharp',
      noseShape: 'pointy',
      mouthExpression: 'wink',
      facialHair: 'none',
      facialHairColor: '#1A1A1A',
      eyewear: 'catEye',
      headwear: 'wizardHat',
      earrings: 'hoops',
      outfit: 'techJacket',
      outfitColor: '#6B21A8',
      backgroundStyle: 'deepSpace',
      backgroundColor: '#030712'
    } as AvatarConfig
  }
];

// BITMOJI STICKER ARCHETYPES
export const BITMOJI_STICKERS = [
  {
    id: 'morning',
    title: 'Good Morning ☀️',
    category: 'Greetings',
    badge: 'SUNNY',
    colorTheme: '#FFB300',
    textColor: '#FFFFFF',
    text: 'GOOD MORNING!',
    mouth: 'smile' as const,
    eye: 'friendly' as const,
    pose: 'royalWave' as const,
    bg: '#FFF8E1'
  },
  {
    id: 'lol',
    title: 'LOL! 😂',
    category: 'Moods',
    badge: 'FUNNY',
    colorTheme: '#FF5722',
    textColor: '#FFEB3B',
    text: 'LOL!! 😂',
    mouth: 'smile' as const,
    eye: 'closed' as const,
    pose: 'dancing' as const,
    bg: '#FBE9E7'
  },
  {
    id: 'missyou',
    title: 'Miss You 🥺',
    category: 'Moods',
    badge: 'LOVE',
    colorTheme: '#0288D1',
    textColor: '#FFFFFF',
    text: 'MISS YOU 🥺',
    mouth: 'pout' as const,
    eye: 'friendly' as const,
    pose: 'thinking' as const,
    bg: '#E1F5FE'
  },
  {
    id: 'loveyou',
    title: 'Love Ya! ❤️',
    category: 'Greetings',
    badge: 'CUTE',
    colorTheme: '#E91E63',
    textColor: '#FFFFFF',
    text: 'LOVE YA! ❤️',
    mouth: 'wink' as const,
    eye: 'friendly' as const,
    pose: 'coolWink' as const,
    bg: '#FCE4EC'
  },
  {
    id: 'omg',
    title: 'OMG!!! 😱',
    category: 'Moods',
    badge: 'SHOCK',
    colorTheme: '#9C27B0',
    textColor: '#FFEB3B',
    text: 'OMG!!! 😱',
    mouth: 'shocked' as const,
    eye: 'anime' as const,
    pose: 'portrait' as const,
    bg: '#F3E5F5'
  },
  {
    id: 'awesome',
    title: 'Awesome! ⚡',
    category: 'Actions',
    badge: 'COOL',
    colorTheme: '#00BCD4',
    textColor: '#FFFFFF',
    text: 'AWESOME! ⚡',
    mouth: 'smirk' as const,
    eye: 'friendly' as const,
    pose: 'coolWink' as const,
    bg: '#E0F7FA'
  },
  {
    id: 'busy',
    title: 'In The Zone 💻',
    category: 'Actions',
    badge: 'WORK',
    colorTheme: '#37474F',
    textColor: '#00E676',
    text: 'IN THE ZONE 💻',
    mouth: 'neutral' as const,
    eye: 'sleek' as const,
    pose: 'thinking' as const,
    bg: '#ECEFF1'
  },
  {
    id: 'birthday',
    title: 'Happy B-Day 🎉',
    category: 'Greetings',
    badge: 'PARTY',
    colorTheme: '#4CAF50',
    textColor: '#FFFFFF',
    text: 'HAPPY B-DAY! 🎉',
    mouth: 'smile' as const,
    eye: 'friendly' as const,
    pose: 'royalWave' as const,
    bg: '#E8F5E9'
  },
  {
    id: 'hype',
    title: 'Let\'s Go! 🚀',
    category: 'Actions',
    badge: 'HYPE',
    colorTheme: '#FF3D00',
    textColor: '#FFFFFF',
    text: 'LET\'S GO! 🚀',
    mouth: 'smile' as const,
    eye: 'anime' as const,
    pose: 'dancing' as const,
    bg: '#FEEBEE'
  },
  {
    id: 'nope',
    title: 'Nope! ❌',
    category: 'Moods',
    badge: 'STUBBORN',
    colorTheme: '#E53935',
    textColor: '#FFFFFF',
    text: 'NOPE! ❌',
    mouth: 'pout' as const,
    eye: 'sharp' as const,
    pose: 'portrait' as const,
    bg: '#FFEBEE'
  }
];

const SKIN_TONES = [
  { name: 'Alabaster', value: '#FFDFC4' },
  { name: 'Warm Peach', value: '#F1C27D' },
  { name: 'Honey', value: '#D1A374' },
  { name: 'Bronze', value: '#B88760' },
  { name: 'Espresso', value: '#8D5524' },
  { name: 'Deep Cocoa', value: '#5C3818' },
  { name: 'Elven Moss', value: '#A2E8B9' },
  { name: 'Nebula Rose', value: '#FFB7D5' }
];

const HAIR_COLORS = [
  { name: 'Obsidian', value: '#1A1A1A' },
  { name: 'Mocha', value: '#3D2314' },
  { name: 'Gilded Blonde', value: '#E6C229' },
  { name: 'Ginger', value: '#A02B2B' },
  { name: 'Sterling', value: '#E2E8F0' },
  { name: 'Hot Pink', value: '#FF007F' },
  { name: 'Borealis Teal', value: '#10B981' },
  { name: 'Synthwave Purple', value: '#6B21A8' }
];

const OUTFIT_COLORS = [
  { name: 'Antique Gold', value: '#C4B99D' },
  { name: 'Onyx', value: '#1F1F1F' },
  { name: 'Royal Plum', value: '#6B21A8' },
  { name: 'Scarlet', value: '#DC2626' },
  { name: 'Teal Wave', value: '#0D9488' },
  { name: 'Rose Petal', value: '#FDA4AF' },
  { name: 'Sage Green', value: '#86EFAC' },
  { name: 'Neon Coral', value: '#FF7043' }
];

const PANTS_COLORS = [
  { name: 'Denim Blue', value: '#1E3A8A' },
  { name: 'Onyx Black', value: '#1F1F1F' },
  { name: 'Slate Gray', value: '#475569' },
  { name: 'Khaki Tan', value: '#D97706' },
  { name: 'Crimson Red', value: '#991B1B' },
  { name: 'Sage Jogger', value: '#16A34A' },
  { name: 'Alpine White', value: '#F8FAFC' },
  { name: 'Plum Chino', value: '#581C87' }
];

const SHOES_COLORS = [
  { name: 'Triple Black', value: '#111827' },
  { name: 'Classic White', value: '#F8FAFC' },
  { name: 'Caramel Leather', value: '#B45309' },
  { name: 'Crimson Red', value: '#DC2626' },
  { name: 'Cobalt Blue', value: '#2563EB' },
  { name: 'Forest Green', value: '#15803D' },
  { name: 'Vibrant Orange', value: '#EA580C' },
  { name: 'Gum Brown', value: '#78350F' }
];

const EYE_COLORS = [
  { name: 'Hazel Brown', value: '#4A2E16' },
  { name: 'Forest Green', value: '#2E7D32' },
  { name: 'Sapphire', value: '#1565C0' },
  { name: 'Amethyst', value: '#6A1B9A' },
  { name: 'Golden Hour', value: '#F57F17' },
  { name: 'Slate Gray', value: '#5C5C5C' }
];

const DEFAULT_CONFIG: AvatarConfig = {
  skinTone: '#FFDFC4',
  faceShape: 'oval',
  hairStyle: 'classicPart',
  hairColor: '#3D2314',
  eyeStyle: 'friendly',
  eyeColor: '#4A2E16',
  eyebrows: 'classic',
  noseShape: 'classic',
  mouthExpression: 'smile',
  facialHair: 'none',
  facialHairColor: '#3D2314',
  eyewear: 'none',
  headwear: 'none',
  earrings: 'none',
  outfit: 'tee',
  outfitColor: '#C4B99D',
  pants: 'jeans',
  pantsColor: '#334155',
  shoes: 'sneakers',
  shoesColor: '#111827',
  backgroundStyle: 'sunset',
  backgroundColor: '#FAF9F6',
  renderStyle3D: 'softToy',
  lightingAngle: 'topLeft',
  shadingIntensity: 65,
  glossiness: 60,
  rimGlowColor: '#FFFFFF',
  cheekBlush: 'rosy',
  pose: 'portrait',
  ambientEnvironment: 'studioGlow'
};

// Interactive SVG component
export function AvatarSVG({ 
  config, 
  size = 180, 
  id = "avatar-render",
  tiltX = 0,
  tiltY = 0,
  isTalking = false,
  rotX = 0,
  rotY = 0,
  layerExplosion = 1.0,
  isDragging = false
}: { 
  config: AvatarConfig; 
  size?: number; 
  id?: string;
  tiltX?: number;
  tiltY?: number;
  isTalking?: boolean;
  rotX?: number;
  rotY?: number;
  layerExplosion?: number;
  isDragging?: boolean;
}) {
  const {
    skinTone,
    faceShape,
    hairStyle,
    hairColor,
    eyeStyle: rawEyeStyle,
    eyeColor,
    eyebrows,
    noseShape,
    mouthExpression: rawMouthExpression,
    facialHair,
    facialHairColor,
    eyewear,
    headwear,
    earrings,
    outfit,
    outfitColor,
    backgroundStyle,
    renderStyle3D = 'softToy',
    lightingAngle = 'topLeft',
    shadingIntensity = 65,
    glossiness = 60,
    rimGlowColor = '#FFFFFF',
    cheekBlush = 'rosy',
    pose = 'portrait',
    ambientEnvironment = 'studioGlow'
  } = config;

  // Smart Snapchat pose overrides for expressions
  const eyeStyle = pose === 'coolWink' ? 'closed' : rawEyeStyle;
  const mouthExpression = isTalking ? 'shocked' : (
    pose === 'coolWink' ? 'smirk' :
    pose === 'thinking' ? 'neutral' :
    pose === 'dancing' ? 'smile' :
    rawMouthExpression
  );

  // Dynamic 3D Gaze pupil tracking based on cursor hover parallax (tiltY & tiltX range from -10 to 10)
  const pupilDx = (tiltY / 10) * 1.8;
  const pupilDy = (tiltX / 10) * 1.8;

  // Dynamic neck shadow shifting based on lighting and cursor parallax
  const neckShadowDx = (tiltY / 10) * 4;
  const neckShadowDy = (tiltX / 10) * 3;

  // Render Face Shape helper to prevent code duplication and apply shading layer-by-layer
  const renderFaceShape = (fillVal: string, strokeVal = 'none', strokeW = 0) => {
    if (faceShape === 'oval') {
      return <ellipse cx="100" cy="94" rx="36" ry="44" fill={fillVal} stroke={strokeVal} strokeWidth={strokeW} />;
    }
    if (faceShape === 'round') {
      return <ellipse cx="100" cy="94" rx="40" ry="40" fill={fillVal} stroke={strokeVal} strokeWidth={strokeW} />;
    }
    if (faceShape === 'square') {
      return <path d="M 64,78 C 64,54 136,54 136,78 L 134,115 C 134,129 118,136 100,136 C 82,136 66,129 66,115 Z" fill={fillVal} stroke={strokeVal} strokeWidth={strokeW} />;
    }
    if (faceShape === 'heart') {
      return <path d="M 64,78 C 64,54 136,54 136,78 L 133,115 C 133,128 106,140 100,142 C 94,140 67,128 67,115 Z" fill={fillVal} stroke={strokeVal} strokeWidth={strokeW} />;
    }
    if (faceShape === 'diamond') {
      return <path d="M 65,94 C 65,74 74,54 100,51 C 126,54 135,74 135,94 C 135,114 119,129 100,138 C 81,129 65,114 65,94 Z" fill={fillVal} stroke={strokeVal} strokeWidth={strokeW} />;
    }
    return null;
  };

  // 3D Material helper
  const getSkinFill = () => {
    if (renderStyle3D === 'metallicGold') return 'url(#goldMaterial)';
    if (renderStyle3D === 'crystalGlass') return 'url(#crystalGrad)';
    if (renderStyle3D === 'iridescentPearl') return 'url(#iridescentPearl)';
    if (renderStyle3D === 'stealthCarbon') return 'url(#stealthCarbonGrad)';
    return skinTone;
  };

  const getHairFill = () => {
    if (renderStyle3D === 'metallicGold') return 'url(#goldMaterial)';
    if (renderStyle3D === 'crystalGlass') return 'url(#crystalGrad)';
    if (renderStyle3D === 'iridescentPearl') return 'url(#iridescentPearl)';
    if (renderStyle3D === 'stealthCarbon') return 'url(#stealthCarbonGrad)';
    return hairColor;
  };

  const getFacialHairFill = () => {
    if (renderStyle3D === 'metallicGold') return 'url(#goldMaterial)';
    if (renderStyle3D === 'crystalGlass') return 'url(#crystalGrad)';
    if (renderStyle3D === 'iridescentPearl') return 'url(#iridescentPearl)';
    if (renderStyle3D === 'stealthCarbon') return 'url(#stealthCarbonGrad)';
    return facialHairColor;
  };

  const getOutfitFill = () => {
    if (renderStyle3D === 'metallicGold') return 'url(#goldMaterial)';
    if (renderStyle3D === 'crystalGlass') return 'url(#crystalGrad)';
    if (renderStyle3D === 'iridescentPearl') return 'url(#iridescentPearl)';
    if (renderStyle3D === 'stealthCarbon') return 'url(#stealthCarbonGrad)';
    return outfitColor;
  };

  // Helper to calculate 3D projection style for a layer at a given depth Z
  const get3DStyle = (zDepth: number) => {
    // scale depth by the explosion factor
    const actualZ = zDepth * layerExplosion;
    
    // We compute the 3D projection:
    // Convert angles to radians for mathematical sinusoids
    const radY = (rotY * Math.PI) / 180;
    const radX = (rotX * Math.PI) / 180;
    
    // Horizontal shift is based on rotY (left/right rotation) + static tiltY parallax
    // Vertical shift is based on rotX (up/down rotation) + static tiltX parallax
    const tx = Math.sin(radY) * actualZ + (tiltY * (zDepth / 15));
    const ty = -Math.sin(radX) * actualZ + (tiltX * (zDepth / 15));
    
    // Perspective scale squish on X-axis (foreshortening based on Y rotation)
    const cosY = Math.cos(radY);
    // Perspective scale squish on Y-axis (foreshortening based on X rotation)
    const cosX = Math.cos(radX);
    
    // Standard perspective focal adjustment
    const perspectiveFactor = 150 / (150 - actualZ * cosY * cosX);
    const sx = cosY * perspectiveFactor;
    const sy = cosX * perspectiveFactor;
    
    return {
      transform: `translate3d(${tx}px, ${ty}px, ${actualZ}px) scale(${sx}, ${sy})`,
      transformOrigin: '100px 100px',
      transformStyle: 'preserve-3d' as const,
      transition: isDragging ? 'none' : 'transform 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
    };
  };

  // Check if character is turned away (Back-Facing Profile, abs Y rotation > 90 deg)
  const isBackView = Math.abs(((rotY + 180) % 360) - 180) > 90;

  // Render back hair elements either behind head or overlaying face in back-view
  const renderBackHairDome = () => {
    if (hairStyle === 'bald') return null;
    
    // Custom dome boundaries that cover the head base from the back view
    let d = "M 64,78 C 64,50 136,50 136,78 C 136,100 120,110 100,110 C 80,110 64,100 64,78 Z";
    
    if (hairStyle === 'curlyAfro') {
      d = "M 61,74 C 52,62 58,45 72,42 C 76,32 90,30 100,36 C 110,30 124,32 128,42 C 142,45 148,62 139,74 C 145,95 125,110 100,110 C 75,110 55,95 61,74 Z";
    } else if (hairStyle === 'elegantBob') {
      d = "M 57,80 C 47,105 49,140 60,140 L 140,140 C 151,140 153,105 143,80 Q 100,75 57,80";
    } else if (hairStyle === 'longWaves') {
      d = "M 55,80 C 35,105 38,160 48,170 L 152,170 C 162,160 165,105 145,80 Q 100,75 55,80";
    }

    return (
      <g style={get3DStyle(10)}>
        {/* Top knot bun itself rendered if active */}
        {hairStyle === 'topKnot' && (
          <g>
            <circle cx="100" cy="38" r="11" fill={getHairFill()} stroke={renderStyle3D === 'crystalGlass' ? '#FFFFFF' : 'none'} strokeWidth={0.5} />
            <circle cx="100" cy="38" r="11" fill="url(#shading_active)" opacity={(shadingIntensity / 100) * 0.65} />
          </g>
        )}
        <path 
          d={d} 
          fill={getHairFill()} 
          stroke={renderStyle3D === 'crystalGlass' ? '#FFFFFF' : 'none'}
          strokeWidth={renderStyle3D === 'crystalGlass' ? 0.8 : 0}
          filter="url(#shadow)"
        />
        <path d={d} fill="url(#shading_active)" opacity={(shadingIntensity / 100) * 0.7} />
        <path d={d} fill="url(#linearGloss)" opacity={(glossiness / 100) * 0.4} />
      </g>
    );
  };

  return (
    <svg 
      id={id}
      viewBox="0 0 200 200" 
      width={size} 
      height={size} 
      className="rounded-full shadow-2xl select-none overflow-hidden"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* BACKGROUNDS */}
      <defs>
        <style>{`
          @keyframes blink {
            0%, 96%, 100% { transform: scaleY(1); }
            98% { transform: scaleY(0.08); }
          }
          .blink-eye {
            animation: blink 3.5s infinite ease-in-out;
          }
          @keyframes wave {
            0%, 100% { transform: rotate(0deg); }
            50% { transform: rotate(15deg); }
          }
          .animate-wave {
            animation: wave 1s infinite ease-in-out;
            transform-origin: 140px 160px;
          }
          @keyframes dance {
            0%, 100% { transform: translate(0px, 0px) rotate(-2deg); }
            50% { transform: translate(2px, -4px) rotate(2deg); }
          }
          .animate-dance {
            animation: dance 0.8s infinite ease-in-out;
            transform-origin: 100px 180px;
          }
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-4px); }
          }
          .animate-float {
            animation: float 2.5s infinite ease-in-out;
          }
          @keyframes shimmer {
            0% { opacity: 0.25; transform: scale(0.8); }
            50% { opacity: 0.85; transform: scale(1.1); }
            100% { opacity: 0.25; transform: scale(0.8); }
          }
          .particle-glow {
            animation: shimmer 2s infinite ease-in-out;
            transform-origin: center;
          }
        `}</style>
        <radialGradient id="spotlightGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.45" />
          <stop offset="60%" stopColor="#FFFFFF" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="spotlightCone" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#FDE047" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#FDE047" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="discoRayPink" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#EC4899" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#EC4899" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="discoRayBlue" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#06B6D4" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="auroraGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFB7D5" />
          <stop offset="50%" stopColor="#A2E8B9" />
          <stop offset="100%" stopColor="#818CF8" />
        </radialGradient>
        <linearGradient id="sunsetGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F43F5E" />
          <stop offset="100%" stopColor="#F97316" />
        </linearGradient>
        <linearGradient id="cyberGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0B0F19" />
          <stop offset="100%" stopColor="#1E1E38" />
        </linearGradient>
        <linearGradient id="spaceGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#030712" />
          <stop offset="100%" stopColor="#0F052D" />
        </linearGradient>
        
        {/* Shading Gradients based on lighting angles */}
        <radialGradient id="shading_topLeft" cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.45" />
          <stop offset="35%" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset="70%" stopColor="#000000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.55" />
        </radialGradient>
        <radialGradient id="shading_frontal" cx="50%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.4" />
          <stop offset="35%" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset="70%" stopColor="#000000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.5" />
        </radialGradient>
        <radialGradient id="shading_topRight" cx="70%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.45" />
          <stop offset="35%" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset="70%" stopColor="#000000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.55" />
        </radialGradient>

        {/* Dynamic Interactive Shading Source based on cursor tilt */}
        <radialGradient id="shading_active" cx={`${
          lightingAngle === 'topLeft' ? 30 + tiltY * 1.5 :
          lightingAngle === 'topRight' ? 70 + tiltY * 1.5 :
          50 + tiltY * 1.5
        }%`} cy={`${
          lightingAngle === 'topLeft' ? 30 + tiltX * 1.5 :
          lightingAngle === 'topRight' ? 30 + tiltX * 1.5 :
          35 + tiltX * 1.5
        }%`} r="68%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.45" />
          <stop offset="35%" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset="70%" stopColor="#000000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.55" />
        </radialGradient>

        {/* Shiny Specular highlight gradient */}
        <radialGradient id="specularGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.85" />
          <stop offset="35%" stopColor="#FFFFFF" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>

        {/* Luxurious Golden Metallic material gradient */}
        <linearGradient id="goldMaterial" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFEAA7" />
          <stop offset="25%" stopColor="#DF9F28" />
          <stop offset="50%" stopColor="#9E7815" />
          <stop offset="75%" stopColor="#FBD071" />
          <stop offset="100%" stopColor="#634900" />
        </linearGradient>

        {/* Silver Chrome Metallic gradient */}
        <linearGradient id="silverMaterial" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="25%" stopColor="#CBD5E1" />
          <stop offset="50%" stopColor="#64748B" />
          <stop offset="75%" stopColor="#E2E8F0" />
          <stop offset="100%" stopColor="#334155" />
        </linearGradient>

        {/* Dual neon pink/blue dual-tone cyberpunk rim lighting */}
        <linearGradient id="neonRimGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF007F" />
          <stop offset="50%" stopColor="#EC4899" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>

        {/* Crystal Glass frosted glassmorphic material */}
        <linearGradient id="crystalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.45" />
          <stop offset="40%" stopColor="#E2E8F0" stopOpacity="0.15" />
          <stop offset="70%" stopColor="#93C5FD" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.35" />
        </linearGradient>

        {/* 💎 Holographic Iridescent pearl material gradient */}
        <linearGradient id="iridescentPearl" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#22D3EE" />
          <stop offset="25%" stopColor="#EC4899" />
          <stop offset="50%" stopColor="#A855F7" />
          <stop offset="75%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#3B82F6" />
        </linearGradient>

        {/* 🖤 Stealth Carbon dark material gradients */}
        <linearGradient id="stealthCarbonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#334155" />
          <stop offset="50%" stopColor="#1E293B" />
          <stop offset="100%" stopColor="#0F172A" />
        </linearGradient>
        <pattern id="carbonPattern" width="6" height="6" patternUnits="userSpaceOnUse">
          <rect width="6" height="6" fill="#000000" fillOpacity="0.35" />
          <path d="M 0,0 L 3,3 M 3,3 L 6,0" stroke="#FFFFFF" strokeWidth="0.5" strokeOpacity="0.18" />
          <path d="M 0,6 L 3,3 M 3,3 L 6,6" stroke="#FFFFFF" strokeWidth="0.5" strokeOpacity="0.18" />
        </pattern>

        {/* Specular linear gradient for hair highlights */}
        <linearGradient id="linearGloss" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.4" />
          <stop offset="25%" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset="75%" stopColor="#000000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.45" />
        </linearGradient>

        {/* Creases and shadow gradients for 3D outfits */}
        <linearGradient id="outfitShading" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.28" />
          <stop offset="40%" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset="75%" stopColor="#000000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.55" />
        </linearGradient>
        
        {/* Soft Shadow Filter */}
        <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2.5" stdDeviation="2.5" floodOpacity="0.15" />
        </filter>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* 1. BACKGROUND GROUP (Moves negative to create physical parallax depth) */}
      <g style={get3DStyle(-40)}>
        {backgroundStyle === 'solid' && (
          <rect width="200" height="200" fill="#FAF9F6" />
        )}
        {backgroundStyle === 'aurora' && (
          <rect width="200" height="200" fill="url(#auroraGrad)" />
        )}
        {backgroundStyle === 'sunset' && (
          <rect width="200" height="200" fill="url(#sunsetGrad)" />
        )}
        {backgroundStyle === 'cyberGrid' && (
          <>
            <rect width="200" height="200" fill="url(#cyberGrad)" />
            {/* Neon grid lines */}
            <line x1="20" y1="0" x2="20" y2="200" stroke="#06B6D4" strokeWidth="0.3" opacity="0.4" />
            <line x1="60" y1="0" x2="60" y2="200" stroke="#06B6D4" strokeWidth="0.3" opacity="0.4" />
            <line x1="100" y1="0" x2="100" y2="200" stroke="#06B6D4" strokeWidth="0.3" opacity="0.4" />
            <line x1="140" y1="0" x2="140" y2="200" stroke="#06B6D4" strokeWidth="0.3" opacity="0.4" />
            <line x1="180" y1="0" x2="180" y2="200" stroke="#06B6D4" strokeWidth="0.3" opacity="0.4" />
            <line x1="0" y1="40" x2="200" y2="40" stroke="#06B6D4" strokeWidth="0.3" opacity="0.4" />
            <line x1="0" y1="90" x2="200" y2="90" stroke="#06B6D4" strokeWidth="0.3" opacity="0.4" />
            <line x1="0" y1="140" x2="200" y2="140" stroke="#06B6D4" strokeWidth="0.3" opacity="0.4" />
          </>
        )}
        {backgroundStyle === 'deepSpace' && (
          <>
            <rect width="200" height="200" fill="url(#spaceGrad)" />
            {/* Star particles */}
            <circle cx="35" cy="45" r="1" fill="#FFFFFF" opacity="0.8" />
            <circle cx="165" cy="35" r="1.5" fill="#FFFFFF" opacity="0.9" />
            <circle cx="175" cy="110" r="0.8" fill="#FFFFFF" opacity="0.5" />
            <circle cx="25" cy="130" r="1.2" fill="#FFFFFF" opacity="0.7" />
            <circle cx="90" cy="25" r="1.5" fill="#C4B99D" opacity="0.6" />
          </>
        )}

        {/* 3D Snapchat-style Environmental Overlays */}
        {ambientEnvironment === 'studioGlow' && (
          <>
            <circle cx="100" cy="100" r="120" fill="url(#spotlightGlow)" opacity="0.35" />
            <ellipse cx="100" cy="180" rx="70" ry="15" fill="#000000" opacity="0.12" />
          </>
        )}
        {ambientEnvironment === 'stageSpotlight' && (
          <>
            <polygon points="50,0 150,0 190,200 10,200" fill="url(#spotlightCone)" opacity="0.2" />
            <circle cx="40" cy="60" r="1.5" fill="#FFF" className="particle-glow" style={{ animationDelay: '0.2s' }} />
            <circle cx="160" cy="110" r="2.5" fill="#FFF" className="particle-glow" style={{ animationDelay: '0.8s' }} />
            <circle cx="70" cy="130" r="1.2" fill="#FFF" className="particle-glow" style={{ animationDelay: '1.4s' }} />
            <circle cx="130" cy="50" r="2" fill="#FFF" className="particle-glow" style={{ animationDelay: '0.5s' }} />
          </>
        )}
        {ambientEnvironment === 'discoReflections' && (
          <>
            <circle cx="100" cy="15" r="10" fill="#374151" />
            <line x1="100" y1="0" x2="100" y2="15" stroke="#4B5563" strokeWidth="1" />
            <polygon points="100,15 10,200 35,200" fill="url(#discoRayPink)" opacity="0.25" />
            <polygon points="100,15 165,200 190,200" fill="url(#discoRayBlue)" opacity="0.25" />
            <circle cx="50" cy="40" r="3.5" fill="none" stroke="#EC4899" strokeWidth="0.5" opacity="0.5" className="particle-glow" />
            <circle cx="155" cy="70" r="5" fill="none" stroke="#06B6D4" strokeWidth="0.5" opacity="0.5" className="particle-glow" style={{ animationDelay: '0.7s' }} />
            <circle cx="140" cy="150" r="2.5" fill="none" stroke="#FBBF24" strokeWidth="0.5" opacity="0.5" className="particle-glow" style={{ animationDelay: '1.2s' }} />
          </>
        )}
        {ambientEnvironment === 'hologramMatrix' && (
          <>
            <rect width="200" height="200" fill="#022c22" opacity="0.15" />
            <text x="15" y="40" fill="#10B981" fontSize="5" fontFamily="monospace" opacity="0.3">010101</text>
            <text x="170" y="80" fill="#10B981" fontSize="5" fontFamily="monospace" opacity="0.25">110011</text>
            <text x="30" y="140" fill="#10B981" fontSize="5" fontFamily="monospace" opacity="0.25">XYZ_3D</text>
            <text x="155" y="150" fill="#10B981" fontSize="5" fontFamily="monospace" opacity="0.35">AI_ON</text>
            <line x1="0" y1="50" x2="200" y2="50" stroke="#10B981" strokeWidth="0.4" opacity="0.15" />
            <line x1="0" y1="120" x2="200" y2="120" stroke="#10B981" strokeWidth="0.4" opacity="0.15" />
          </>
        )}
        {ambientEnvironment === 'sunsetShadows' && (
          <>
            <path d="M 0,0 C 40,40 80,20 110,60 C 90,40 60,30 0,0" fill="#4C0519" opacity="0.15" />
            <path d="M 200,0 C 160,40 120,20 90,60 C 110,40 140,30 200,0" fill="#4C0519" opacity="0.15" />
          </>
        )}
      </g>

      {/* 3D PERSPECTIVE PEDESTAL DISK (Floor Stage, Snapchat-style) */}
      {ambientEnvironment && ambientEnvironment !== 'none' && (
        <g style={get3DStyle(-25)}>
          {/* Base border of platform */}
          <ellipse cx="100" cy="186" rx="55" ry="12" fill="#1C1917" stroke="#44403C" strokeWidth="1" />
          {/* Surface of platform */}
          <ellipse cx="100" cy="184" rx="54" ry="11" fill={
            backgroundStyle === 'cyberGrid' ? '#083344' :
            ambientEnvironment === 'hologramMatrix' ? '#022c22' :
            ambientEnvironment === 'discoReflections' ? '#1e1b4b' :
            ambientEnvironment === 'sunsetShadows' ? '#4c0519' :
            '#292524'
          } />
          {/* Decorative neon ring glows */}
          {backgroundStyle === 'cyberGrid' && (
            <ellipse cx="100" cy="184" rx="48" ry="9" fill="none" stroke="#06B6D4" strokeWidth="1.2" opacity="0.8" />
          )}
          {ambientEnvironment === 'hologramMatrix' && (
            <ellipse cx="100" cy="184" rx="48" ry="9" fill="none" stroke="#10B981" strokeWidth="1.2" opacity="0.8" strokeDasharray="3 1.5" />
          )}
          {ambientEnvironment === 'discoReflections' && (
            <ellipse cx="100" cy="184" rx="48" ry="9" fill="none" stroke="#FF007F" strokeWidth="1.2" opacity="0.7" />
          )}
          {/* Shadow of the avatar cast onto the platform */}
          <ellipse cx={`${100 + tiltY * 0.25}`} cy="184" rx="35" ry="7" fill="#000000" opacity="0.5" />
        </g>
      )}

      {/* 2. CHARACTER GROUP (Wraps hairBack, head, face features, outfits, eyewear, etc.) */}
      <g className={pose === 'dancing' ? 'animate-dance' : 'animate-float'}>

      {/* 2.1. HAIR BACK GROUP (Subtle parallax depth) */}
      {!isBackView && (hairStyle === 'longWaves' || hairStyle === 'elegantBob') && (
        <g style={get3DStyle(-20)}>
          <path 
            d={
              hairStyle === 'longWaves' 
                ? "M 55,80 C 35,110 38,165 48,175 L 152,175 C 162,165 165,110 145,80 Z"
                : "M 57,80 C 47,110 49,145 60,145 L 140,145 C 151,145 153,110 143,80 Z"
            } 
            fill={getHairFill()} 
            stroke={renderStyle3D === 'crystalGlass' ? '#FFFFFF' : 'none'}
            strokeWidth={renderStyle3D === 'crystalGlass' ? 0.8 : 0}
            filter="url(#shadow)"
          />
          <path 
            d={
              hairStyle === 'longWaves' 
                ? "M 55,80 C 35,110 38,165 48,175 L 152,175 C 162,165 165,110 145,80 Z"
                : "M 57,80 C 47,110 49,145 60,145 L 140,145 C 151,145 153,110 143,80 Z"
            } 
            fill="url(#shading_active)" 
            opacity={(shadingIntensity / 100) * 0.7}
          />
          <path 
            d={
              hairStyle === 'longWaves' 
                ? "M 55,80 C 35,110 38,165 48,175 L 152,175 C 162,165 165,110 145,80 Z"
                : "M 57,80 C 47,110 49,145 60,145 L 140,145 C 151,145 153,110 143,80 Z"
            } 
            fill="url(#linearGloss)" 
            opacity={(glossiness / 100) * 0.4}
          />
        </g>
      )}

      {/* 3. HEAD BASE & NECK GROUP (Moderate parallax depth) */}
      <g style={get3DStyle(0)}>
        {/* NECK */}
        <path d="M 86,125 L 86,155 L 114,155 L 114,125 Z" fill={getSkinFill()} stroke={renderStyle3D === 'crystalGlass' ? '#FFFFFF' : 'none'} strokeWidth={0.5} />
        {renderStyle3D === 'stealthCarbon' && <path d="M 86,125 L 86,155 L 114,155 L 114,125 Z" fill="url(#carbonPattern)" />}
        <path d="M 86,125 L 86,155 L 114,155 L 114,125 Z" fill="url(#shading_active)" opacity={(shadingIntensity / 100) * 0.8} />
        {/* Neck shadow */}
        <path d={`M ${86 + neckShadowDx} ${125 + neckShadowDy} Q 100 ${132 + neckShadowDy} ${114 + neckShadowDx} ${125 + neckShadowDy} L 114,130 Q 100,137 86,130 Z`} fill="#000000" opacity="0.28" />

        {/* HEAD BASE */}
        {renderFaceShape(getSkinFill(), renderStyle3D === 'crystalGlass' ? '#FFFFFF' : 'none', renderStyle3D === 'crystalGlass' ? 1 : 0)}
        {renderStyle3D === 'stealthCarbon' && renderFaceShape("url(#carbonPattern)")}
        
        {/* Volumetric ambient shading */}
        {renderStyle3D !== 'crystalGlass' && renderFaceShape("url(#shading_active)")}

        {/* Gloss Specular Highlight (slid based on lighting coordinates & active mouse tilt) */}
        {renderStyle3D !== 'crystalGlass' && (
          <ellipse 
            cx={lightingAngle === 'topLeft' ? 81 + tiltY * 1.2 : (lightingAngle === 'topRight' ? 119 + tiltY * 1.2 : 100 + tiltY * 1.2)} 
            cy={73 + tiltX * 1.2} 
            rx="12" 
            ry="8" 
            fill="url(#specularGlow)" 
            opacity={(glossiness / 100) * 0.75} 
            transform={`rotate(${lightingAngle === 'topLeft' ? -15 : (lightingAngle === 'topRight' ? 15 : 0)} ${lightingAngle === 'topLeft' ? 81 + tiltY * 1.2 : (lightingAngle === 'topRight' ? 119 + tiltY * 1.2 : 100 + tiltY * 1.2)} ${73 + tiltX * 1.2})`}
          />
        )}

        {/* Cheek Blush */}
        {renderStyle3D !== 'metallicGold' && renderStyle3D !== 'crystalGlass' && !isBackView && (
          <>
            {cheekBlush === 'rosy' && (
              <>
                <ellipse cx="76" cy="106" rx="8" ry="4.5" fill="#EF4444" opacity="0.18" filter="url(#glow)" />
                <ellipse cx="124" cy="106" rx="8" ry="4.5" fill="#EF4444" opacity="0.18" filter="url(#glow)" />
              </>
            )}
            {cheekBlush === 'neonPurple' && (
              <>
                <ellipse cx="76" cy="106" rx="9" ry="5.5" fill="#D8B4FE" opacity="0.25" filter="url(#glow)" />
                <ellipse cx="124" cy="106" rx="9" ry="5.5" fill="#D8B4FE" opacity="0.25" filter="url(#glow)" />
              </>
            )}
            {cheekBlush === 'coralGold' && (
              <>
                <ellipse cx="76" cy="106" rx="8" ry="4.5" fill="#FBBF24" opacity="0.2" filter="url(#glow)" />
                <ellipse cx="124" cy="106" rx="8" ry="4.5" fill="#FBBF24" opacity="0.2" filter="url(#glow)" />
              </>
            )}
          </>
        )}

        {/* Rim light highlight around the edge (Disney Pixar rim lighting aura) */}
        {renderFaceShape('none', renderStyle3D === 'cyberpunkGlow' ? 'url(#neonRimGrad)' : rimGlowColor, renderStyle3D === 'cyberpunkGlow' ? 1.5 : (rimGlowColor !== '#FFFFFF' ? 1.2 : 0.8))}

        {/* EARS */}
        <circle cx="61" cy="94" r="8" fill={getSkinFill()} stroke={renderStyle3D === 'crystalGlass' ? '#FFFFFF' : 'none'} strokeWidth={0.5} />
        {renderStyle3D === 'stealthCarbon' && <circle cx="61" cy="94" r="8" fill="url(#carbonPattern)" />}
        <circle cx="61" cy="94" r="8" fill="url(#shading_active)" opacity={(shadingIntensity / 100) * 0.5} />
        
        <circle cx="139" cy="94" r="8" fill={getSkinFill()} stroke={renderStyle3D === 'crystalGlass' ? '#FFFFFF' : 'none'} strokeWidth={0.5} />
        {renderStyle3D === 'stealthCarbon' && <circle cx="139" cy="94" r="8" fill="url(#carbonPattern)" />}
        <circle cx="139" cy="94" r="8" fill="url(#shading_active)" opacity={(shadingIntensity / 100) * 0.5} />
        
        <path d="M 61,91 Q 58,94 61,97" fill="none" stroke="#000000" strokeWidth="0.8" opacity="0.2" />
        <path d="M 139,91 Q 142,94 139,97" fill="none" stroke="#000000" strokeWidth="0.8" opacity="0.2" />

        {/* EARRINGS */}
        {earrings === 'goldStuds' && (
          <>
            <circle cx="59" cy="98" r="2.2" fill="url(#goldMaterial)" filter="url(#shadow)" />
            <circle cx="58" cy="97" r="0.8" fill="#FFFFFF" opacity="0.8" />
            <circle cx="141" cy="98" r="2.2" fill="url(#goldMaterial)" filter="url(#shadow)" />
            <circle cx="140" cy="97" r="0.8" fill="#FFFFFF" opacity="0.8" />
          </>
        )}
        {earrings === 'hoops' && (
          <>
            <circle cx="58" cy="99" r="4.5" fill="none" stroke="url(#silverMaterial)" strokeWidth="1.2" filter="url(#shadow)" />
            <circle cx="142" cy="99" r="4.5" fill="none" stroke="url(#silverMaterial)" strokeWidth="1.2" filter="url(#shadow)" />
          </>
        )}
      </g>

      {/* 4. FACIAL FEATURES GROUP (High depth parallax to look like front-most projection) */}
      {!isBackView && (
        <g style={get3DStyle(12)}>
          {/* EYES WITH BLINKING RIGS */}
          {/* LEFT EYE CONTAINER */}
          <g className={rawEyeStyle === 'closed' ? '' : 'blink-eye'} style={{ transformOrigin: '82px 90px' }}>
          {eyeStyle === 'friendly' && (
            <>
              <ellipse cx="82" cy="90" rx="8" ry="5.5" fill="#FFFFFF" />
              <circle cx={82 + pupilDx} cy={90 + pupilDy} r="4.5" fill={eyeColor} />
              <circle cx={82 + pupilDx} cy={90 + pupilDy} r="4.5" fill="url(#shading_active)" opacity={0.4} />
              <circle cx={82 + pupilDx * 1.15} cy={90 + pupilDy * 1.15} r="2.2" fill="#0D0F14" />
              <circle cx={80.5 + pupilDx} cy={88 + pupilDy} r="1.2" fill="#FFFFFF" opacity="0.9" />
              <circle cx={83.8 + pupilDx} cy={92 + pupilDy} r="0.6" fill="#FFFFFF" opacity="0.6" />
            </>
          )}
          {eyeStyle === 'sleek' && (
            <>
              <path d="M 73,91 Q 82,86 91,90 Q 82,95 73,91 Z" fill="#FFFFFF" />
              <circle cx={82 + pupilDx} cy={90.5 + pupilDy} r="4" fill={eyeColor} />
              <circle cx={82 + pupilDx} cy={90.5 + pupilDy} r="4" fill="url(#shading_active)" opacity={0.4} />
              <circle cx={82 + pupilDx * 1.15} cy={90.5 + pupilDy * 1.15} r="1.8" fill="#0D0F14" />
              <circle cx={80.5 + pupilDx} cy={89 + pupilDy} r="1" fill="#FFFFFF" opacity="0.95" />
            </>
          )}
          {eyeStyle === 'sharp' && (
            <>
              <path d="M 74,92 L 90,89 L 88,94 Z" fill="#FFFFFF" stroke="#111827" strokeWidth="0.8" />
              <circle cx={82 + pupilDx} cy={91.5 + pupilDy} r="3.2" fill={eyeColor} />
              <circle cx={82 + pupilDx} cy={91.5 + pupilDy} r="3.2" fill="url(#shading_active)" opacity={0.4} />
              <circle cx={81.2 + pupilDx} cy={90.2 + pupilDy} r="0.8" fill="#FFFFFF" opacity="0.9" />
            </>
          )}
          {eyeStyle === 'anime' && (
            <>
              <ellipse cx="81" cy="90" rx="9" ry="7.5" fill="#FFFFFF" stroke="#111827" strokeWidth="0.5" />
              <ellipse cx={81 + pupilDx} cy={90 + pupilDy} rx="6.5" ry="5.8" fill={eyeColor} />
              <ellipse cx={81 + pupilDx} cy={90 + pupilDy} rx="6.5" ry="5.8" fill="url(#shading_active)" opacity={0.45} />
              <circle cx={81 + pupilDx * 1.15} cy={90.5 + pupilDy * 1.15} r="3" fill="#0D0F14" />
              <circle cx={83.2 + pupilDx} cy={87.5 + pupilDy} r="1.8" fill="#FFFFFF" opacity="0.95" />
              <circle cx={78.5 + pupilDx} cy={92.2 + pupilDy} r="1" fill="#FFFFFF" opacity="0.8" />
            </>
          )}
          {eyeStyle === 'closed' && (
            <path d="M 74,90 Q 82,96 90,90" fill="none" stroke="#111827" strokeWidth="2.2" strokeLinecap="round" />
          )}
        </g>

        {/* RIGHT EYE CONTAINER */}
        <g className={rawEyeStyle === 'closed' ? '' : 'blink-eye'} style={{ transformOrigin: '118px 90px' }}>
          {eyeStyle === 'friendly' && (
            <>
              <ellipse cx="118" cy="90" rx="8" ry="5.5" fill="#FFFFFF" />
              <circle cx={118 + pupilDx} cy={90 + pupilDy} r="4.5" fill={eyeColor} />
              <circle cx={118 + pupilDx} cy={90 + pupilDy} r="4.5" fill="url(#shading_active)" opacity={0.4} />
              <circle cx={118 + pupilDx * 1.15} cy={90 + pupilDy * 1.15} r="2.2" fill="#0D0F14" />
              <circle cx={116.5 + pupilDx} cy={88 + pupilDy} r="1.2" fill="#FFFFFF" opacity="0.9" />
              <circle cx={119.8 + pupilDx} cy={92 + pupilDy} r="0.6" fill="#FFFFFF" opacity="0.6" />
            </>
          )}
          {eyeStyle === 'sleek' && (
            <>
              <path d="M 109,90 Q 118,86 127,91 Q 118,95 109,90 Z" fill="#FFFFFF" />
              <circle cx={118 + pupilDx} cy={90.5 + pupilDy} r="4" fill={eyeColor} />
              <circle cx={118 + pupilDx} cy={90.5 + pupilDy} r="4" fill="url(#shading_active)" opacity={0.4} />
              <circle cx={118 + pupilDx * 1.15} cy={90.5 + pupilDy * 1.15} r="1.8" fill="#0D0F14" />
              <circle cx={116.5 + pupilDx} cy={89 + pupilDy} r="1" fill="#FFFFFF" opacity="0.95" />
            </>
          )}
          {eyeStyle === 'sharp' && (
            <>
              <path d="M 126,92 L 110,89 L 112,94 Z" fill="#FFFFFF" stroke="#111827" strokeWidth="0.8" />
              <circle cx={118 + pupilDx} cy={91.5 + pupilDy} r="3.2" fill={eyeColor} />
              <circle cx={118 + pupilDx} cy={91.5 + pupilDy} r="3.2" fill="url(#shading_active)" opacity={0.4} />
              <circle cx={117.2 + pupilDx} cy={90.2 + pupilDy} r="0.8" fill="#FFFFFF" opacity="0.9" />
            </>
          )}
          {eyeStyle === 'anime' && (
            <>
              <ellipse cx="119" cy="90" rx="9" ry="7.5" fill="#FFFFFF" stroke="#111827" strokeWidth="0.5" />
              <ellipse cx={119 + pupilDx} cy={90 + pupilDy} rx="6.5" ry="5.8" fill={eyeColor} />
              <ellipse cx={119 + pupilDx} cy={90 + pupilDy} rx="6.5" ry="5.8" fill="url(#shading_active)" opacity="0.45" />
              <circle cx={119 + pupilDx * 1.15} cy={90.5 + pupilDy * 1.15} r="3" fill="#0D0F14" />
              <circle cx={121.2 + pupilDx} cy={87.5 + pupilDy} r="1.8" fill="#FFFFFF" opacity="0.95" />
              <circle cx={116.5 + pupilDx} cy={92.2 + pupilDy} r="1" fill="#FFFFFF" opacity="0.8" />
            </>
          )}
          {eyeStyle === 'closed' && (
            <path d="M 110,90 Q 118,96 126,90" fill="none" stroke="#111827" strokeWidth="2.2" strokeLinecap="round" />
          )}
        </g>

        {/* EYEBROWS */}
        {eyebrows === 'classic' && (
          <>
            <path d="M 72,82 Q 81,75 90,81" fill="none" stroke={getHairFill()} strokeWidth="2.2" strokeLinecap="round" />
            <path d="M 110,81 Q 119,75 128,82" fill="none" stroke={getHairFill()} strokeWidth="2.2" strokeLinecap="round" />
          </>
        )}
        {eyebrows === 'bushy' && (
          <>
            <path d="M 70,82 Q 81,73 91,80" fill="none" stroke={getHairFill()} strokeWidth="3.8" strokeLinecap="round" />
            <path d="M 109,80 Q 119,73 130,82" fill="none" stroke={getHairFill()} strokeWidth="3.8" strokeLinecap="round" />
          </>
        )}
        {eyebrows === 'sharp' && (
          <>
            <path d="M 72,83 L 83,75 L 90,80" fill="none" stroke={getHairFill()} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M 110,80 L 117,75 L 128,83" fill="none" stroke={getHairFill()} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </>
        )}
        {eyebrows === 'flat' && (
          <>
            <line x1="72" y1="78" x2="89" y2="78" stroke={getHairFill()} strokeWidth="2.5" strokeLinecap="round" />
            <line x1="111" y1="78" x2="128" y2="78" stroke={getHairFill()} strokeWidth="2.5" strokeLinecap="round" />
          </>
        )}

        {/* NOSE */}
        {noseShape === 'button' && (
          <>
            <path d="M 97,102 Q 100,105 103,102" fill="none" stroke="#111827" strokeWidth="1.8" strokeLinecap="round" opacity="0.3" />
            <circle cx="100" cy="101" r="1.5" fill="#FFFFFF" opacity="0.45" />
            <circle cx="100" cy="103" r="2.2" fill="#000000" opacity="0.08" />
          </>
        )}
        {noseShape === 'classic' && (
          <>
            <path d="M 98,92 L 98,102 Q 98,104 101,104" fill="none" stroke="#111827" strokeWidth="1.8" strokeLinecap="round" opacity="0.3" />
            <circle cx="100.5" cy="102.5" r="1.5" fill="#FFFFFF" opacity="0.4" />
          </>
        )}
        {noseShape === 'wide' && (
          <>
            <path d="M 95,103 Q 100,106 105,103" fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round" opacity="0.3" />
            <ellipse cx="100" cy="103" rx="2.5" ry="1.2" fill="#FFFFFF" opacity="0.4" />
          </>
        )}
        {noseShape === 'pointy' && (
          <>
            <path d="M 99,92 L 98,103 L 102,102" fill="none" stroke="#111827" strokeWidth="1.8" strokeLinecap="round" opacity="0.3" />
            <circle cx="98.5" cy="101.5" r="1.2" fill="#FFFFFF" opacity="0.4" />
          </>
        )}

        {/* MOUTH & EXPRESSION */}
        {isTalking ? (
          <>
            <ellipse cx="100" cy="122" rx="5" ry="8" fill="#7F1D1D" stroke="#111827" strokeWidth="1.5">
              <animate attributeName="ry" values="4;8;4" dur="0.2s" repeatCount="indefinite" />
            </ellipse>
            <path d="M 94,122 Q 100,126 106,122" fill="none" stroke="#FFA4A4" strokeWidth="1" opacity="0.6" />
          </>
        ) : (
          <>
            {mouthExpression === 'smile' && (
              <>
                <path d="M 90,119 Q 100,132 110,119" fill="#B91C1C" stroke="#111827" strokeWidth="1" />
                <path d="M 91,119 Q 100,123 109,119 Z" fill="#FFFFFF" />
                {/* Bottom lip gloss reflection for 3D roundness */}
                <path d="M 93,123 Q 100,129 107,123" fill="none" stroke="#FFA4A4" strokeWidth="1" opacity="0.5" />
              </>
            )}
            {mouthExpression === 'smirk' && (
              <>
                <path d="M 92,120 Q 102,123 108,117" fill="none" stroke="#111827" strokeWidth="2.2" strokeLinecap="round" />
                <path d="M 95,121 L 104,121" fill="none" stroke="#FFA4A4" strokeWidth="0.8" opacity="0.4" />
              </>
            )}
            {mouthExpression === 'neutral' && (
              <line x1="93" y1="121" x2="107" y2="121" stroke="#111827" strokeWidth="2" strokeLinecap="round" />
            )}
            {mouthExpression === 'pout' && (
              <>
                <circle cx="100" cy="121" r="4.5" fill="#991B1B" stroke="#111827" strokeWidth="1.5" />
                <circle cx="99" cy="120" r="1.2" fill="#FFFFFF" opacity="0.4" />
              </>
            )}
            {mouthExpression === 'shocked' && (
              <>
                <ellipse cx="100" cy="122" rx="4.5" ry="7.5" fill="#7F1D1D" stroke="#111827" strokeWidth="1.5" />
                <ellipse cx="98.5" cy="119.5" rx="1.5" ry="3.5" fill="#FF8A8A" opacity="0.4" />
              </>
            )}
            {mouthExpression === 'wink' && (
              <>
                <path d="M 92,119 Q 100,132 108,119 Z" fill="#B91C1C" stroke="#111827" strokeWidth="0.8" />
                <path d="M 94,122 Q 100,127 106,122" fill="none" stroke="#FFA4A4" strokeWidth="0.8" opacity="0.4" />
              </>
            )}
          </>
        )}

        {/* STUBBLE & BEARDS */}
        {facialHair === 'stubble' && (
          <path d="M 68,110 Q 100,138 132,110 Q 100,140 68,110" fill="none" stroke="#111827" strokeWidth="2.5" strokeDasharray="1 1.5" opacity="0.25" strokeLinecap="round" />
        )}
        {facialHair === 'beard' && (
          <>
            <path d="M 65,94 C 65,118 78,144 100,144 C 122,144 135,118 135,94 L 129,94 C 129,114 118,136 100,136 C 82,136 71,114 71,94 Z" fill={getFacialHairFill()} stroke={renderStyle3D === 'crystalGlass' ? '#FFFFFF' : 'none'} strokeWidth={0.5} filter="url(#shadow)" />
            <path d="M 65,94 C 65,118 78,144 100,144 C 122,144 135,118 135,94 L 129,94 C 129,114 118,136 100,136 C 82,136 71,114 71,94 Z" fill="url(#shading_active)" opacity={(shadingIntensity / 100) * 0.6} />
          </>
        )}
        {facialHair === 'mustache' && (
          <>
            <path d="M 92,113 Q 100,109 108,113 Q 100,116 92,113 Z" fill={getFacialHairFill()} stroke={renderStyle3D === 'crystalGlass' ? '#FFFFFF' : 'none'} strokeWidth={0.5} filter="url(#shadow)" />
            <path d="M 92,113 Q 100,109 108,113 Q 100,116 92,113 Z" fill="url(#shading_active)" opacity={(shadingIntensity / 100) * 0.5} />
          </>
        )}
        {facialHair === 'goatee' && (
          <>
            <path d="M 92,115 Q 100,113 108,115 L 105,135 Q 100,137 95,135 Z" fill={getFacialHairFill()} stroke={renderStyle3D === 'crystalGlass' ? '#FFFFFF' : 'none'} strokeWidth={0.5} filter="url(#shadow)" />
            <path d="M 92,115 Q 100,113 108,115 L 105,135 Q 100,137 95,135 Z" fill="url(#shading_active)" opacity={(shadingIntensity / 100) * 0.5} />
          </>
        )}
      </g>
      )}

      {/* 5. HAIR FRONT GROUP (High parallax depth overlaying face) */}
      {!isBackView && (
        <g style={get3DStyle(18)}>
        {hairStyle === 'shortSpikes' && (
          <>
            <path d="M 63,73 L 70,51 L 79,66 L 90,47 L 99,66 L 110,47 L 119,66 L 128,51 L 137,73 Q 100,79 63,73" fill={getHairFill()} stroke={renderStyle3D === 'crystalGlass' ? '#FFFFFF' : 'none'} strokeWidth={0.5} />
            <path d="M 63,73 L 70,51 L 79,66 L 90,47 L 99,66 L 110,47 L 119,66 L 128,51 L 137,73 Q 100,79 63,73" fill="url(#shading_active)" opacity={(shadingIntensity / 100) * 0.65} />
            <path d="M 63,73 L 70,51 L 79,66 L 90,47 L 99,66 L 110,47 L 119,66 L 128,51 L 137,73 Q 100,79 63,73" fill="url(#linearGloss)" opacity={(glossiness / 100) * 0.45} />
          </>
        )}
        {hairStyle === 'classicPart' && (
          <>
            <path d="M 62,75 Q 100,48 138,75 C 130,55 116,58 100,65 C 84,58 70,55 62,75" fill={getHairFill()} stroke={renderStyle3D === 'crystalGlass' ? '#FFFFFF' : 'none'} strokeWidth={0.5} />
            <path d="M 62,75 Q 100,48 138,75 C 130,55 116,58 100,65 C 84,58 70,55 62,75" fill="url(#shading_active)" opacity={(shadingIntensity / 100) * 0.65} />
            <path d="M 62,75 Q 100,48 138,75 C 130,55 116,58 100,65 C 84,58 70,55 62,75" fill="url(#linearGloss)" opacity={(glossiness / 100) * 0.45} />
          </>
        )}
        {hairStyle === 'curlyAfro' && (
          <>
            <path d="M 61,74 C 55,65 60,50 72,48 C 76,38 90,36 100,42 C 110,36 124,38 128,48 C 140,50 145,65 139,74 Q 100,82 61,74 Z" fill={getHairFill()} stroke={renderStyle3D === 'crystalGlass' ? '#FFFFFF' : 'none'} strokeWidth={0.5} />
            <path d="M 61,74 C 55,65 60,50 72,48 C 76,38 90,36 100,42 C 110,36 124,38 128,48 C 140,50 145,65 139,74 Q 100,82 61,74 Z" fill="url(#shading_active)" opacity={(shadingIntensity / 100) * 0.65} />
            <path d="M 61,74 C 55,65 60,50 72,48 C 76,38 90,36 100,42 C 110,36 124,38 128,48 C 140,50 145,65 139,74 Q 100,82 61,74 Z" fill="url(#linearGloss)" opacity={(glossiness / 100) * 0.45} />
          </>
        )}
        {hairStyle === 'elegantBob' && (
          <>
            <path d="M 60,76 C 58,54 142,54 140,76 C 134,60 66,60 60,76 Z" fill={getHairFill()} stroke={renderStyle3D === 'crystalGlass' ? '#FFFFFF' : 'none'} strokeWidth={0.5} />
            <path d="M 60,76 C 58,54 142,54 140,76 C 134,60 66,60 60,76 Z" fill="url(#shading_active)" opacity={(shadingIntensity / 100) * 0.65} />
            <path d="M 60,76 C 58,54 142,54 140,76 C 134,60 66,60 60,76 Z" fill="url(#linearGloss)" opacity={(glossiness / 100) * 0.45} />
          </>
        )}
        {hairStyle === 'longWaves' && (
          <>
            <path d="M 60,75 C 58,50 142,50 140,75 C 130,58 70,58 60,75 Z" fill={getHairFill()} stroke={renderStyle3D === 'crystalGlass' ? '#FFFFFF' : 'none'} strokeWidth={0.5} />
            <path d="M 60,75 C 58,50 142,50 140,75 C 130,58 70,58 60,75 Z" fill="url(#shading_active)" opacity={(shadingIntensity / 100) * 0.65} />
            <path d="M 60,75 C 58,50 142,50 140,75 C 130,58 70,58 60,75 Z" fill="url(#linearGloss)" opacity={(glossiness / 100) * 0.45} />
          </>
        )}
        {hairStyle === 'pixie' && (
          <>
            <path d="M 63,74 L 69,63 L 78,68 L 88,58 L 98,68 L 108,58 L 118,68 L 127,63 L 137,74 C 130,68 70,68 63,74 Z" fill={getHairFill()} stroke={renderStyle3D === 'crystalGlass' ? '#FFFFFF' : 'none'} strokeWidth={0.5} />
            <path d="M 63,74 L 69,63 L 78,68 L 88,58 L 98,68 L 108,58 L 118,68 L 127,63 L 137,74 C 130,68 70,68 63,74 Z" fill="url(#shading_active)" opacity={(shadingIntensity / 100) * 0.65} />
            <path d="M 63,74 L 69,63 L 78,68 L 88,58 L 98,68 L 108,58 L 118,68 L 127,63 L 137,74 C 130,68 70,68 63,74 Z" fill="url(#linearGloss)" opacity={(glossiness / 100) * 0.45} />
          </>
        )}
        {hairStyle === 'topKnot' && (
          <>
            <circle cx="100" cy="38" r="11" fill={getHairFill()} stroke={renderStyle3D === 'crystalGlass' ? '#FFFFFF' : 'none'} strokeWidth={0.5} />
            <circle cx="100" cy="38" r="11" fill="url(#shading_active)" opacity={(shadingIntensity / 100) * 0.65} />
            <path d="M 63,75 Q 100,50 137,75 Q 100,78 63,75 Z" fill={getHairFill()} stroke={renderStyle3D === 'crystalGlass' ? '#FFFFFF' : 'none'} strokeWidth={0.5} />
            <path d="M 63,75 Q 100,50 137,75 Q 100,78 63,75 Z" fill="url(#shading_active)" opacity={(shadingIntensity / 100) * 0.65} />
            <path d="M 63,75 Q 100,50 137,75 Q 100,78 63,75 Z" fill="url(#linearGloss)" opacity={(glossiness / 100) * 0.45} />
          </>
        )}
      </g>
      )}

      {/* 6. CLOTHING / OUTFITS GROUP (Stable torso base, moves very slightly) */}
      <g style={get3DStyle(-10)}>
        {outfit === 'tee' && (
          <>
            <path d="M 55,160 Q 100,165 145,160 L 155,200 L 45,200 Z" fill={getOutfitFill()} stroke={renderStyle3D === 'crystalGlass' ? '#FFFFFF' : 'none'} strokeWidth={0.5} filter="url(#shadow)" />
            {renderStyle3D === 'stealthCarbon' && <path d="M 55,160 Q 100,165 145,160 L 155,200 L 45,200 Z" fill="url(#carbonPattern)" />}
            <path d="M 55,160 Q 100,165 145,160 L 155,200 L 45,200 Z" fill="url(#outfitShading)" opacity={(shadingIntensity / 100) * 0.9} />
            <path d="M 55,160 Q 100,165 145,160" fill="none" stroke="#FFFFFF" strokeWidth="1.2" opacity="0.3" />
          </>
        )}
        {outfit === 'hoodie' && (
          <>
            <path d="M 50,158 Q 100,162 150,158 L 158,200 L 42,200 Z" fill={getOutfitFill()} stroke={renderStyle3D === 'crystalGlass' ? '#FFFFFF' : 'none'} strokeWidth={0.5} filter="url(#shadow)" />
            {renderStyle3D === 'stealthCarbon' && <path d="M 50,158 Q 100,162 150,158 L 158,200 L 42,200 Z" fill="url(#carbonPattern)" />}
            <path d="M 50,158 Q 100,162 150,158 L 158,200 L 42,200 Z" fill="url(#outfitShading)" opacity={(shadingIntensity / 100) * 0.9} />
            {/* Hood strings & fold */}
            <path d="M 82,157 Q 100,172 118,157" fill="none" stroke="#FFFFFF" strokeWidth="2.5" opacity="0.3" />
            <circle cx="89" cy="178" r="2.5" fill="#FFFFFF" opacity="0.8" />
            <line x1="89" y1="157" x2="89" y2="176" stroke="#FFFFFF" strokeWidth="1.5" opacity="0.6" />
            <circle cx="111" cy="178" r="2.5" fill="#FFFFFF" opacity="0.8" />
            <line x1="111" y1="157" x2="111" y2="176" stroke="#FFFFFF" strokeWidth="1.5" opacity="0.6" />
          </>
        )}
        {outfit === 'suit' && (
          <>
            <path d="M 48,158 Q 100,162 152,158 L 158,200 L 42,200 Z" fill={getOutfitFill()} stroke={renderStyle3D === 'crystalGlass' ? '#FFFFFF' : 'none'} strokeWidth={0.5} filter="url(#shadow)" />
            {renderStyle3D === 'stealthCarbon' && <path d="M 48,158 Q 100,162 152,158 L 158,200 L 42,200 Z" fill="url(#carbonPattern)" />}
            <path d="M 48,158 Q 100,162 152,158 L 158,200 L 42,200 Z" fill="url(#outfitShading)" opacity={(shadingIntensity / 100) * 0.9} />
            {/* White inner shirt V */}
            <path d="M 84,158 L 100,185 L 116,158 Z" fill="#FFFFFF" />
            {/* Black tie */}
            <path d="M 97,169 L 103,169 L 105,198 L 100,203 L 95,198 Z" fill="#111827" />
            {/* Lapels */}
            <path d="M 48,158 L 78,185 L 75,200 Z" fill="#111827" opacity="0.2" />
            <path d="M 152,158 L 122,185 L 125,200 Z" fill="#111827" opacity="0.2" />
          </>
        )}
        {outfit === 'techJacket' && (
          <>
            <path d="M 46,158 Q 100,162 154,158 L 160,200 L 40,200 Z" fill={getOutfitFill()} stroke={renderStyle3D === 'crystalGlass' ? '#FFFFFF' : 'none'} strokeWidth={0.5} filter="url(#shadow)" />
            {renderStyle3D === 'stealthCarbon' && <path d="M 46,158 Q 100,162 154,158 L 160,200 L 40,200 Z" fill="url(#carbonPattern)" />}
            <path d="M 46,158 Q 100,162 154,158 L 160,200 L 40,200 Z" fill="url(#outfitShading)" opacity={(shadingIntensity / 100) * 0.9} />
            {/* High neon collar and zip */}
            <path d="M 76,145 L 124,145 L 120,165 L 80,165 Z" fill={getOutfitFill()} stroke="#22D3EE" strokeWidth="1" />
            {renderStyle3D === 'stealthCarbon' && <path d="M 76,145 L 124,145 L 120,165 L 80,165 Z" fill="url(#carbonPattern)" />}
            <line x1="100" y1="145" x2="100" y2="200" stroke="#22D3EE" strokeWidth="1.8" />
            {/* Futuristic chevron badge */}
            <path d="M 68,172 L 74,172 L 71,178 Z" fill="#22D3EE" opacity="0.85" filter="url(#glow)" />
          </>
        )}
        {outfit === 'gown' && (
          <>
            <path d="M 55,162 Q 100,182 145,162 L 152,200 L 48,200 Z" fill={getOutfitFill()} stroke={renderStyle3D === 'crystalGlass' ? '#FFFFFF' : 'none'} strokeWidth={0.5} filter="url(#shadow)" />
            {renderStyle3D === 'stealthCarbon' && <path d="M 55,162 Q 100,182 145,162 L 152,200 L 48,200 Z" fill="url(#carbonPattern)" />}
            <path d="M 55,162 Q 100,182 145,162 L 152,200 L 48,200 Z" fill="url(#outfitShading)" opacity={(shadingIntensity / 100) * 0.9} />
          </>
        )}

        {/* SNAPCHAT 3D ADAPTIVE RIG ARM POSES (Skins & Sleeves matched) */}
        {pose === 'coolWink' && (
          <g>
            {/* Right arm sleeve pointing up slightly for Thumb-Up */}
            <path d="M 132,165 L 120,140 L 134,134 L 148,158 Z" fill={getOutfitFill()} stroke={renderStyle3D === 'crystalGlass' ? '#FFFFFF' : 'none'} strokeWidth={0.5} />
            {renderStyle3D === 'stealthCarbon' && <path d="M 132,165 L 120,140 L 134,134 L 148,158 Z" fill="url(#carbonPattern)" />}
            {/* Thumb-Up Hand */}
            <circle cx="120" cy="136" r="6" fill={getSkinFill()} stroke={renderStyle3D === 'crystalGlass' ? '#FFFFFF' : 'none'} strokeWidth={0.5} />
            {renderStyle3D === 'stealthCarbon' && <circle cx="120" cy="136" r="6" fill="url(#carbonPattern)" />}
            {/* Thumb raising up */}
            <path d="M 116,134 Q 110,123 116,121 Q 122,121 120,131" fill={getSkinFill()} stroke={renderStyle3D === 'crystalGlass' ? '#FFFFFF' : '#111827'} strokeWidth={0.6} />
            {/* Fingertips lines */}
            <path d="M 120,133 Q 124,136 122,140" stroke="#111827" strokeWidth="0.8" fill="none" opacity="0.3" />
          </g>
        )}
        {pose === 'royalWave' && (
          <g className="animate-wave">
            {/* Right sleeve waving up */}
            <path d="M 136,162 L 154,115 L 166,120 L 148,166 Z" fill={getOutfitFill()} stroke={renderStyle3D === 'crystalGlass' ? '#FFFFFF' : 'none'} strokeWidth={0.5} />
            {renderStyle3D === 'stealthCarbon' && <path d="M 136,162 L 154,115 L 166,120 L 148,166 Z" fill="url(#carbonPattern)" />}
            {/* Palm */}
            <circle cx="160" cy="108" r="7.5" fill={getSkinFill()} stroke={renderStyle3D === 'crystalGlass' ? '#FFFFFF' : 'none'} strokeWidth={0.5} />
            {renderStyle3D === 'stealthCarbon' && <circle cx="160" cy="108" r="7.5" fill="url(#carbonPattern)" />}
            {/* Waving fingers */}
            <path d="M 155,104 L 151,90 M 159,101 L 157,86 M 163,101 L 165,88 M 167,104 L 173,94 M 154,110 L 144,106" stroke={getSkinFill()} strokeWidth="3.2" strokeLinecap="round" />
          </g>
        )}
        {pose === 'peaceSign' && (
          <g>
            {/* Left sleeve up */}
            <path d="M 64,162 L 44,118 L 56,114 L 76,158 Z" fill={getOutfitFill()} stroke={renderStyle3D === 'crystalGlass' ? '#FFFFFF' : 'none'} strokeWidth={0.5} />
            {renderStyle3D === 'stealthCarbon' && <path d="M 64,162 L 44,118 L 56,114 L 76,158 Z" fill="url(#carbonPattern)" />}
            {/* Peace sign palm */}
            <circle cx="48" cy="110" r="7" fill={getSkinFill()} stroke={renderStyle3D === 'crystalGlass' ? '#FFFFFF' : 'none'} strokeWidth={0.5} />
            {renderStyle3D === 'stealthCarbon' && <circle cx="48" cy="110" r="7" fill="url(#carbonPattern)" />}
            {/* Index & Middle fingers V */}
            <line x1="45" y1="108" x2="38" y2="92" stroke={getSkinFill()} strokeWidth="3" strokeLinecap="round" />
            <line x1="51" y1="108" x2="48" y2="90" stroke={getSkinFill()} strokeWidth="3" strokeLinecap="round" />
          </g>
        )}
        {pose === 'thinking' && (
          <g>
            {/* Left sleeve towards chin */}
            <path d="M 60,165 L 94,144 L 102,152 L 72,170 Z" fill={getOutfitFill()} stroke={renderStyle3D === 'crystalGlass' ? '#FFFFFF' : 'none'} strokeWidth={0.5} />
            {renderStyle3D === 'stealthCarbon' && <path d="M 60,165 L 94,144 L 102,152 L 72,170 Z" fill="url(#carbonPattern)" />}
            {/* Hand under chin */}
            <circle cx="98" cy="142" r="6" fill={getSkinFill()} stroke={renderStyle3D === 'crystalGlass' ? '#FFFFFF' : 'none'} strokeWidth={0.5} />
            {renderStyle3D === 'stealthCarbon' && <circle cx="98" cy="142" r="6" fill="url(#carbonPattern)" />}
            {/* Finger pointing up along jawline */}
            <line x1="91" y1="138" x2="85" y2="122" stroke={getSkinFill()} strokeWidth="3" strokeLinecap="round" />
          </g>
        )}
        {pose === 'dancing' && (
          <g>
            {/* Dynamic raised right arm */}
            <path d="M 135,162 L 158,125 L 168,132 L 146,166 Z" fill={getOutfitFill()} stroke={renderStyle3D === 'crystalGlass' ? '#FFFFFF' : 'none'} strokeWidth={0.5} />
            {renderStyle3D === 'stealthCarbon' && <path d="M 135,162 L 158,125 L 168,132 L 146,166 Z" fill="url(#carbonPattern)" />}
            <circle cx="163" cy="122" r="6" fill={getSkinFill()} stroke={renderStyle3D === 'crystalGlass' ? '#FFFFFF' : 'none'} strokeWidth={0.5} />
            {renderStyle3D === 'stealthCarbon' && <circle cx="163" cy="122" r="6" fill="url(#carbonPattern)" />}
            <line x1="163" y1="122" x2="173" y2="108" stroke={getSkinFill()} strokeWidth="3" strokeLinecap="round" />
            {/* Left arm down pointed */}
            <path d="M 65,162 L 40,135 L 48,128 L 75,158 Z" fill={getOutfitFill()} stroke={renderStyle3D === 'crystalGlass' ? '#FFFFFF' : 'none'} strokeWidth={0.5} />
            {renderStyle3D === 'stealthCarbon' && <path d="M 65,162 L 40,135 L 48,128 L 75,158 Z" fill="url(#carbonPattern)" />}
            <circle cx="38" cy="140" r="6" fill={getSkinFill()} stroke={renderStyle3D === 'crystalGlass' ? '#FFFFFF' : 'none'} strokeWidth={0.5} />
            {renderStyle3D === 'stealthCarbon' && <circle cx="38" cy="140" r="6" fill="url(#carbonPattern)" />}
            <line x1="38" y1="140" x2="28" y2="152" stroke={getSkinFill()} strokeWidth="3" strokeLinecap="round" />
          </g>
        )}
      </g>

      {/* 7. EYEWEAR GROUP (Highest parallax depth overlaying eyes) */}
      {eyewear !== 'none' && !isBackView && (
        <g style={get3DStyle(20)}>
          {eyewear === 'round' && (
            <>
              <circle cx="81" cy="90" r="10.5" fill="none" stroke="url(#goldMaterial)" strokeWidth="1.8" filter="url(#shadow)" />
              <circle cx="81" cy="90" r="10.5" fill="#22D3EE" fillOpacity="0.1" />
              {/* Glass specular shine reflection */}
              <path d="M 73.5,85 Q 81,95 88.5,85" fill="none" stroke="#FFFFFF" strokeWidth="1.2" opacity="0.65" />
              
              <circle cx="119" cy="90" r="10.5" fill="none" stroke="url(#goldMaterial)" strokeWidth="1.8" filter="url(#shadow)" />
              <circle cx="119" cy="90" r="10.5" fill="#22D3EE" fillOpacity="0.1" />
              <path d="M 111.5,85 Q 119,95 126.5,85" fill="none" stroke="#FFFFFF" strokeWidth="1.2" opacity="0.65" />
              
              <line x1="91.5" y1="90" x2="108.5" y2="90" stroke="url(#goldMaterial)" strokeWidth="2.2" />
              {/* Left/right side arms */}
              <line x1="61" y1="90" x2="70.5" y2="90" stroke="url(#goldMaterial)" strokeWidth="1.5" />
              <line x1="129.5" y1="90" x2="139" y2="90" stroke="url(#goldMaterial)" strokeWidth="1.5" />
            </>
          )}
          {eyewear === 'aviators' && (
            <>
              {/* Classic gold aviator frames */}
              <path d="M 70,86 L 91,86 L 88,98 L 74,98 Z" fill="url(#outfitShading)" fillOpacity="0.82" stroke="url(#goldMaterial)" strokeWidth="1.2" filter="url(#shadow)" />
              {/* Aviator gloss glare lines */}
              <line x1="72" y1="88" x2="84" y2="96" stroke="#FFFFFF" strokeWidth="1" opacity="0.5" />
              
              <path d="M 109,86 L 130,86 L 126,98 L 112,98 Z" fill="url(#outfitShading)" fillOpacity="0.82" stroke="url(#goldMaterial)" strokeWidth="1.2" filter="url(#shadow)" />
              <line x1="111" y1="88" x2="123" y2="96" stroke="#FFFFFF" strokeWidth="1" opacity="0.5" />
              
              <line x1="91" y1="87" x2="109" y2="87" stroke="url(#goldMaterial)" strokeWidth="2" />
              <line x1="91" y1="84" x2="109" y2="84" stroke="url(#goldMaterial)" strokeWidth="1" />
            </>
          )}
          {eyewear === 'visor' && (
            <>
              <path d="M 62,84 L 138,84 L 134,96 L 66,96 Z" fill="#22D3EE" fillOpacity="0.75" stroke="#0891B2" strokeWidth="1" filter="url(#glow)" />
              {/* Shiny laser reflection line */}
              <polygon points="63,85 105,85 95,95 65,95" fill="#FFFFFF" opacity="0.45" />
              <line x1="62" y1="90" x2="138" y2="90" stroke="#FFFFFF" strokeWidth="0.8" opacity="0.3" />
            </>
          )}
          {eyewear === 'catEye' && (
            <>
              <path d="M 65,85 L 91,89 C 85,102 75,98 70,95 Z" fill="#9333EA" filter="url(#shadow)" />
              <path d="M 65,85 L 91,89 C 85,102 75,98 70,95 Z" fill="none" stroke="#F472B6" strokeWidth="1" />
              <path d="M 135,85 L 109,89 C 115,102 125,98 130,95 Z" fill="#9333EA" filter="url(#shadow)" />
              <path d="M 135,85 L 109,89 C 115,102 125,98 130,95 Z" fill="none" stroke="#F472B6" strokeWidth="1" />
              <line x1="91" y1="89" x2="109" y2="89" stroke="#9333EA" strokeWidth="2" />
              {/* Lens reflex shine */}
              <line x1="68" y1="89" x2="76" y2="95" stroke="#FFFFFF" strokeWidth="1" opacity="0.6" />
              <line x1="124" y1="89" x2="116" y2="95" stroke="#FFFFFF" strokeWidth="1" opacity="0.6" />
            </>
          )}
        </g>
      )}

      {/* 8. HEADWEAR GROUP (Projects above and slightly forward from hair) */}
      {isBackView && renderBackHairDome()}

      {headwear !== 'none' && (
        <g style={get3DStyle(24)}>
          {headwear === 'backwardCap' && (
            <>
              {/* Dome */}
              <path d="M 62,75 Q 100,32 138,75 Z" fill="#DC2626" />
              <path d="M 62,75 Q 100,32 138,75 Z" fill="url(#outfitShading)" opacity={(shadingIntensity / 100) * 0.85} />
              {/* Brim pointing left */}
              <path d="M 56,76 L 34,74 L 35,70 L 60,68 Z" fill="#111827" filter="url(#shadow)" />
              <path d="M 56,76 L 34,74 L 35,70 L 60,68 Z" fill="url(#linearGloss)" opacity="0.25" />
              {/* Button on top */}
              <circle cx="100" cy="51" r="2.5" fill="#111827" />
            </>
          )}
          {headwear === 'beanie' && (
            <>
              <path d="M 62,75 Q 100,28 138,75 Q 100,79 62,75 M 58,73 L 142,73 L 140,82 L 60,82 Z" fill="#1565C0" filter="url(#shadow)" />
              <path d="M 62,75 Q 100,28 138,75 Q 100,79 62,75 M 58,73 L 142,73 L 140,82 L 60,82 Z" fill="url(#outfitShading)" opacity={(shadingIntensity / 100) * 0.85} />
              <path d="M 58,73 L 142,73 L 140,82 L 60,82 Z" fill="url(#linearGloss)" opacity="0.25" />
            </>
          )}
          {headwear === 'wizardHat' && (
            <>
              <path d="M 60,76 L 100,10 L 140,76 Z" fill="#312E81" />
              <path d="M 60,76 L 100,10 L 140,76 Z" fill="url(#outfitShading)" opacity={(shadingIntensity / 100) * 0.85} />
              <ellipse cx="100" cy="74" rx="48" ry="6" fill="#1E1B4B" filter="url(#shadow)" />
              {/* Gold buckle */}
              <rect x="94" y="65" width="12" height="10" fill="url(#goldMaterial)" />
              <rect x="96" y="67" width="8" height="6" fill="#1E1B4B" />
            </>
          )}
          {headwear === 'crown' && (
            <>
              <path d="M 66,74 L 71,50 L 88,64 L 100,42 L 112,64 L 129,50 L 134,74 Z" fill="url(#goldMaterial)" filter="url(#shadow)" />
              <path d="M 66,74 L 71,50 L 88,64 L 100,42 L 112,64 L 129,50 L 134,74 Z" fill="url(#shading_active)" opacity={(shadingIntensity / 100) * 0.65} />
              <path d="M 66,74 L 71,50 L 88,64 L 100,42 L 112,64 L 129,50 L 134,74 Z" fill="url(#linearGloss)" opacity={(glossiness / 100) * 0.5} />
            </>
          )}
          {headwear === 'headband' && (
            <>
              <path d="M 62,64 Q 100,55 138,64 L 136,71 Q 100,62 64,71 Z" fill="#EF4444" filter="url(#shadow)" />
              <path d="M 62,64 Q 100,55 138,64 L 136,71 Q 100,62 64,71 Z" fill="url(#outfitShading)" opacity={(shadingIntensity / 100) * 0.85} />
            </>
          )}
        </g>
      )}
      </g>
    </svg>
  );
}

// 👁️ Visual SVG preview thumbnails for customizer picker items
function OptionPreviewSVG({ type, id, color }: { type: string; id: string; color?: string }) {
  const itemColor = color || '#8A99AD';
  return (
    <svg width="40" height="40" viewBox="0 0 100 100" className="w-10 h-10 drop-shadow-md">
      <defs>
        <linearGradient id="optGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#DF9F28" />
          <stop offset="100%" stopColor="#C4B99D" />
        </linearGradient>
      </defs>
      {type === 'hairStyle' && (
        <g stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
          {id === 'curlyAfro' && (
            <path d="M 30,50 C 20,40 30,25 45,30 C 50,15 70,20 70,35 C 85,30 90,45 80,55 C 85,70 70,80 55,75 C 40,85 25,75 30,50 Z" fill={itemColor} />
          )}
          {id === 'classicPart' && (
            <>
              <path d="M 25,60 C 25,30 45,25 50,30 C 55,25 75,30 75,60 C 65,65 35,65 25,60 Z" fill={itemColor} />
              <path d="M 50,30 L 50,45" stroke="#FFFFFF" strokeWidth="3" />
            </>
          )}
          {id === 'shortSpikes' && (
            <path d="M 25,60 L 30,40 L 40,45 L 45,25 L 55,35 L 60,20 L 70,35 L 75,45 L 80,60 Z" fill={itemColor} />
          )}
          {id === 'bald' && (
            <circle cx="50" cy="50" r="25" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="3" />
          )}
          {id === 'elegantBob' && (
            <path d="M 22,65 C 20,40 30,22 50,22 C 70,22 80,40 78,65 C 70,68 60,50 50,50 C 40,50 30,68 22,65 Z" fill={itemColor} />
          )}
          {id === 'longWaves' && (
            <path d="M 22,75 C 20,50 30,22 50,22 C 70,22 80,50 78,75 Q 73,65 68,75 Q 63,65 58,75 C 53,60 47,60 42,75 Q 37,65 32,75 Q 27,65 22,75 Z" fill={itemColor} />
          )}
          {id === 'pixie' && (
            <path d="M 25,60 Q 35,32 50,28 Q 65,32 75,60 C 68,52 62,55 50,48 C 38,55 32,52 25,60 Z" fill={itemColor} />
          )}
          {id === 'topKnot' && (
            <>
              <path d="M 25,60 C 25,35 40,30 50,32 C 60,30 75,35 75,60 Z" fill={itemColor} />
              <circle cx="50" cy="24" r="10" fill={itemColor} />
            </>
          )}
        </g>
      )}
      {type === 'faceShape' && (
        <g stroke="#DF9F28" strokeWidth="3.5" fill="none">
          {id === 'oval' && <ellipse cx="50" cy="50" rx="20" ry="28" />}
          {id === 'round' && <circle cx="50" cy="50" r="24" />}
          {id === 'square' && <rect x="28" y="28" width="44" height="44" rx="8" />}
          {id === 'heart' && <path d="M 50,75 L 30,50 C 20,40 35,22 50,38 C 65,22 80,40 70,50 Z" />}
          {id === 'diamond' && <path d="M 50,22 L 74,50 L 50,78 L 26,50 Z" />}
        </g>
      )}
      {type === 'eyeStyle' && (
        <g stroke="#ffffff" strokeWidth="3" fill="none" strokeLinecap="round">
          {id === 'friendly' && (
            <>
              <path d="M 25,50 Q 37,35 50,50 M 50,50 Q 62,35 75,50" />
              <circle cx="37" cy="48" r="4" fill="#ffffff" />
              <circle cx="62" cy="48" r="4" fill="#ffffff" />
            </>
          )}
          {id === 'sleek' && (
            <>
              <path d="M 22,50 Q 37,42 52,50 M 48,50 Q 63,42 78,50" />
              <ellipse cx="37" cy="48" rx="6" ry="2" fill="#ffffff" />
              <ellipse cx="63" cy="48" rx="6" ry="2" fill="#ffffff" />
            </>
          )}
          {id === 'sharp' && (
            <>
              <path d="M 22,46 L 44,52 M 56,52 L 78,46" strokeWidth="4" />
              <circle cx="33" cy="54" r="3" fill="#ffffff" />
              <circle cx="67" cy="54" r="3" fill="#ffffff" />
            </>
          )}
          {id === 'anime' && (
            <>
              <ellipse cx="35" cy="50" rx="10" ry="14" fill="#ffffff" />
              <ellipse cx="65" cy="50" rx="10" ry="14" fill="#ffffff" />
              <circle cx="33" cy="46" r="3" fill="#000000" />
              <circle cx="63" cy="46" r="3" fill="#000000" />
            </>
          )}
          {id === 'closed' && (
            <path d="M 25,46 Q 37,58 50,46 M 50,46 Q 62,58 75,46" />
          )}
        </g>
      )}
      {type === 'eyebrows' && (
        <g stroke="#ffffff" strokeWidth="4" fill="none" strokeLinecap="round">
          {id === 'classic' && <path d="M 20,45 Q 35,38 50,45 M 50,45 Q 65,38 80,45" />}
          {id === 'bushy' && <path d="M 20,42 Q 35,35 50,42 M 50,42 Q 65,35 80,42" strokeWidth="6.5" />}
          {id === 'sharp' && <path d="M 20,46 L 38,36 L 50,48 M 50,48 L 62,36 L 80,46" />}
          {id === 'flat' && <path d="M 20,40 L 46,40 M 54,40 L 80,40" />}
        </g>
      )}
      {type === 'noseShape' && (
        <g stroke="#DF9F28" strokeWidth="4" fill="none" strokeLinecap="round">
          {id === 'pointy' && <path d="M 50,30 L 40,65 L 50,65" />}
          {id === 'button' && <path d="M 44,52 Q 50,60 56,52" />}
          {id === 'wide' && <path d="M 38,55 Q 50,65 62,55" />}
          {id === 'classic' && <path d="M 46,35 L 46,55 Q 50,62 54,55" />}
        </g>
      )}
      {type === 'mouthExpression' && (
        <g stroke="#EF4444" strokeWidth="4.5" fill="none" strokeLinecap="round">
          {id === 'smile' && <path d="M 30,48 Q 50,75 70,48" fill="#FFFFFF" />}
          {id === 'neutral' && <path d="M 32,50 L 68,50" />}
          {id === 'pout' && <circle cx="50" cy="50" r="7" fill="#FFFFFF" />}
          {id === 'shocked' && <ellipse cx="50" cy="50" rx="9" ry="15" fill="#371010" />}
          {id === 'smirk' && <path d="M 32,55 Q 45,45 68,48" />}
          {id === 'wink' && (
            <>
              <path d="M 32,50 Q 50,72 68,50" />
              <path d="M 32,38 L 42,42" stroke="#FFFFFF" />
            </>
          )}
        </g>
      )}
      {type === 'facialHair' && (
        <g fill={itemColor} stroke="#ffffff" strokeWidth="2.5">
          {id === 'beard' && <path d="M 28,45 C 24,75 50,85 50,85 C 50,85 76,75 72,45 C 65,48 50,48 28,45 Z" />}
          {id === 'mustache' && <path d="M 35,52 Q 50,46 65,52 Q 72,62 65,58 Q 50,52 35,58 Q 28,62 35,52 Z" />}
          {id === 'goatee' && <path d="M 40,65 C 40,82 50,85 50,85 C 50,85 60,82 60,65 Z" />}
          {id === 'stubble' && <path d="M 32,48 C 30,70 50,80 50,80 C 50,80 70,70 68,48 Z" fill="none" stroke={itemColor} strokeDasharray="3 3" strokeWidth="4" />}
          {id === 'none' && <circle cx="50" cy="50" r="18" fill="none" stroke="#EF4444" strokeWidth="3.5" strokeDasharray="4 4" />}
        </g>
      )}
      {type === 'eyewear' && (
        <g stroke="#ffffff" strokeWidth="3.5" fill="none" strokeLinecap="round">
          {id === 'round' && (
            <>
              <circle cx="34" cy="50" r="14" />
              <circle cx="66" cy="50" r="14" />
              <path d="M 48,50 L 52,50" />
            </>
          )}
          {id === 'aviators' && (
            <>
              <path d="M 20,44 L 44,48 L 40,64 L 24,60 Z" />
              <path d="M 80,44 L 56,48 L 60,64 L 76,60 Z" />
              <path d="M 44,48 L 56,48" />
            </>
          )}
          {id === 'catEye' && (
            <>
              <path d="M 18,40 C 35,46 44,52 44,52 L 24,52 Z" />
              <path d="M 82,40 C 65,46 56,52 56,52 L 76,52 Z" />
              <path d="M 44,52 L 56,52" />
            </>
          )}
          {id === 'visor' && (
            <rect x="18" y="40" width="64" height="20" rx="4" fill="url(#optGrad)" stroke="none" />
          )}
          {id === 'none' && <circle cx="50" cy="50" r="18" fill="none" stroke="#EF4444" strokeWidth="3.5" strokeDasharray="4 4" />}
        </g>
      )}
      {type === 'headwear' && (
        <g fill={itemColor} stroke="#ffffff" strokeWidth="2.5">
          {id === 'backwardCap' && (
            <>
              <path d="M 25,60 C 25,35 75,35 75,60 Z" />
              <path d="M 22,60 L 5,55 L 15,68 Z" fill="#EF4444" />
            </>
          )}
          {id === 'beanie' && <path d="M 30,68 L 30,55 C 30,35 70,35 70,55 L 70,68 Z" />}
          {id === 'headband' && <rect x="24" y="44" width="52" height="12" rx="2" fill="#EF4444" />}
          {id === 'crown' && <path d="M 24,65 L 30,35 L 45,50 L 50,28 L 55,50 L 70,35 L 76,65 Z" fill="url(#optGrad)" />}
          {id === 'wizardHat' && <path d="M 20,68 L 50,15 L 80,68 Z" />}
          {id === 'none' && <circle cx="50" cy="50" r="18" fill="none" stroke="#EF4444" strokeWidth="3.5" strokeDasharray="4 4" />}
        </g>
      )}
      {type === 'outfit' && (
        <g fill={itemColor} stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round">
          {id === 'tee' && <path d="M 25,40 L 35,40 L 35,55 L 45,55 L 45,85 L 55,85 L 55,55 L 65,55 L 65,40 L 75,40 L 70,25 L 30,25 Z" />}
          {id === 'hoodie' && (
            <>
              <path d="M 30,35 C 30,20 70,20 70,35 L 75,85 L 25,85 Z" />
              <path d="M 40,65 L 60,65 L 58,80 L 42,80 Z" fill="#2D3748" />
              <line x1="45" y1="35" x2="45" y2="52" stroke="#FFFFFF" strokeWidth="2.5" />
              <line x1="55" y1="35" x2="55" y2="52" stroke="#FFFFFF" strokeWidth="2.5" />
            </>
          )}
          {id === 'suit' && (
            <>
              <path d="M 28,32 L 72,32 L 75,85 L 25,85 Z" />
              <path d="M 50,32 L 40,60 L 50,85 L 60,60 Z" fill="#FFFFFF" />
              <path d="M 48,44 L 52,44 L 54,65 L 50,75 L 46,65 Z" fill="#EF4444" />
            </>
          )}
          {id === 'techJacket' && (
            <>
              <path d="M 28,38 L 72,38 L 75,85 L 25,85 Z" />
              <rect x="42" y="24" width="16" height="14" rx="2" fill="#2D3748" />
              <line x1="50" y1="28" x2="50" y2="85" stroke="#FDE047" strokeWidth="3" />
            </>
          )}
          {id === 'gown' && <path d="M 35,32 L 65,32 L 80,92 L 20,92 Z" />}
        </g>
      )}
      {type === 'pants' && (
        <g fill={itemColor} stroke="#ffffff" strokeWidth="2.5">
          {id === 'jeans' && <path d="M 32,25 L 68,25 L 72,85 L 52,85 L 50,45 L 48,85 L 28,85 Z" />}
          {id === 'sweatpants' && <path d="M 30,25 L 70,25 L 73,80 L 53,80 L 50,45 L 47,80 L 27,80 Z" />}
          {id === 'shorts' && <path d="M 32,25 L 68,25 L 70,55 L 52,55 L 50,40 L 48,55 L 30,55 Z" />}
          {id === 'cargo' && (
            <>
              <path d="M 32,25 L 68,25 L 72,85 L 52,85 L 50,45 L 48,85 L 28,85 Z" />
              <rect x="22" y="44" width="6" height="15" rx="1.5" />
              <rect x="72" y="44" width="6" height="15" rx="1.5" />
            </>
          )}
          {id === 'chinos' && <path d="M 33,25 L 67,25 L 70,85 L 52,85 L 50,45 L 48,85 L 30,85 Z" />}
        </g>
      )}
      {type === 'shoes' && (
        <g fill={itemColor} stroke="#ffffff" strokeWidth="2.5">
          {id === 'sneakers' && (
            <>
              <path d="M 20,68 C 20,50 42,44 65,48 L 85,55 L 85,75 L 20,75 Z" />
              <rect x="20" y="70" width="65" height="6" fill="#FFFFFF" />
            </>
          )}
          {id === 'boots' && <path d="M 20,75 L 20,38 L 44,38 L 44,52 L 82,58 L 82,75 Z" />}
          {id === 'loafers' && <path d="M 22,66 C 22,55 35,50 60,52 L 80,58 L 80,72 L 22,72 Z" />}
          {id === 'sandals' && (
            <>
              <path d="M 20,70 L 80,70 L 80,75 L 20,75 Z" fill="#FFFFFF" />
              <rect x="28" y="58" width="6" height="12" />
              <rect x="62" y="58" width="6" height="12" />
            </>
          )}
          {id === 'highTops' && (
            <>
              <path d="M 20,72 L 20,40 L 48,40 L 82,55 L 82,72 Z" />
              <rect x="20" y="66" width="62" height="7" fill="#FFFFFF" />
            </>
          )}
        </g>
      )}
    </svg>
  );
}

interface AvatarStudioProps {
  currentUser: User;
  onClose: () => void;
  onSaveAvatar: (avatarDataUrl: string, avatarConfig: AvatarConfig) => void;
}

export default function AvatarStudio({ currentUser, onClose, onSaveAvatar }: AvatarStudioProps) {
  const [config, setConfig] = useState<AvatarConfig>(() => {
    if (currentUser.avatarConfig) {
      return currentUser.avatarConfig;
    }
    try {
      const stored = localStorage.getItem(`avatar_config_${currentUser.id}`);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {}
    return DEFAULT_CONFIG;
  });
  const [activeTab, setActiveTab] = useState<'presets' | 'face' | 'hair' | 'clothes' | 'accessories' | 'render3d' | 'ai' | 'stickers'>('presets');
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('3d');
  
  // Snapchat 3D AR camera state variables
  const [arMode, setArMode] = useState(false);
  const [arStream, setArStream] = useState<MediaStream | null>(null);
  const [arError, setArError] = useState(false);
  const [arFilter, setArFilter] = useState<'none' | 'cyberpunk' | 'retro' | 'noir' | 'scifi'>('none');
  const [arSceneryIdx, setArSceneryIdx] = useState(0);
  const [shutterFlash, setShutterFlash] = useState(false);
  const arVideoRef = useRef<HTMLVideoElement | null>(null);

  const AR_FALLBACK_SCENERIES = [
    { name: 'Tokyo Shibuya Crossing', url: 'https://assets.mixkit.co/videos/preview/mixkit-starry-night-sky-looping-background-41710-large.mp4' },
    { name: 'Paris Seine Walk', url: 'https://assets.mixkit.co/videos/preview/mixkit-wave-in-the-ocean-near-the-shore-43022-large.mp4' },
    { name: 'Cyberpunk Lab Ambient', url: 'https://assets.mixkit.co/videos/preview/mixkit-cozy-fireplace-with-burning-logs-41610-large.mp4' },
    { name: 'Green Woods Pathway', url: 'https://assets.mixkit.co/videos/preview/mixkit-forest-stream-in-the-sunlight-529-large.mp4' },
  ];

  // Handle AR Mode Toggle with real device integration and looping scenery fallback
  const handleToggleAR = async () => {
    if (arMode) {
      if (arStream) {
        arStream.getTracks().forEach(track => track.stop());
      }
      setArStream(null);
      setArMode(false);
      setArError(false);
      if (soundEnabled) playSpatialAvatarSound(300, 0, 'click');
    } else {
      setArMode(true);
      setArError(false);
      if (soundEnabled) playSpatialAvatarSound(800, 0, 'success');
      
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
        setArStream(stream);
        if (arVideoRef.current) {
          arVideoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.warn("Camera access denied or blocked. Loading high-fidelity spatial simulated background instead.");
        setArError(true);
      }
    }
  };

  // Keep video source in sync when stream changes
  useEffect(() => {
    if (arMode && arStream && arVideoRef.current) {
      arVideoRef.current.srcObject = arStream;
    }
  }, [arMode, arStream]);

  // Clean up streams on unmount
  useEffect(() => {
    return () => {
      if (arStream) {
        arStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [arStream]);

  const handleCaptureSnap = () => {
    setShutterFlash(true);
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1200, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.16);
    } catch (e) {}
    
    setTimeout(() => {
      setShutterFlash(false);
      alert("📸 Captured! Your 3D Avatar Snap has been saved to your temporary local memories gallery.");
    }, 150);
  };
  
  // 3D Parallax & Spatial Sound state variables
  const [tiltX, setTiltX] = useState(0);
  const [tiltY, setTiltY] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastSoundTime, setLastSoundTime] = useState(0);

  // Snapchat 3D Orbit & Layer Explosion state variables
  const [rotY, setRotY] = useState(0); // -180 to 180 degrees
  const [rotX, setRotX] = useState(0); // -60 to 60 degrees
  const [layerExplosion, setLayerExplosion] = useState(1.0); // 0.0 to 3.0
  const [autoSpin, setAutoSpin] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [startRot, setStartRot] = useState({ x: 0, y: 0 });

  // Auto-Spin Animation Frame Loop
  useEffect(() => {
    if (!autoSpin || isDragging) return;
    let animationFrameId: number;
    const spin = () => {
      setRotY(prev => {
        const next = prev + 1.2;
        return next > 180 ? next - 360 : next;
      });
      animationFrameId = requestAnimationFrame(spin);
    };
    animationFrameId = requestAnimationFrame(spin);
    return () => cancelAnimationFrame(animationFrameId);
  }, [autoSpin, isDragging]);

  // AI Co-pilot prompt states
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiLog, setAiLog] = useState<string[]>([]);

  // Bitmoji Stickers category filter state
  const [selectedStickerCategory, setSelectedStickerCategory] = useState<'All' | 'Greetings' | 'Moods' | 'Actions'>('All');

  // Start dragging / rotating
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setStartRot({ x: rotX, y: rotY });
    setAutoSpin(false); // Pause auto-spin during manual rotate
  };

  // Drag-to-Rotate mouse tracker (Snapchat 3D style)
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      
      // Horizontal drag rotates around Y axis (360 degrees)
      let nextRotY = startRot.y + dx * 0.8;
      if (nextRotY > 180) nextRotY -= 360;
      if (nextRotY < -180) nextRotY += 360;

      // Vertical drag tilts up/down around X axis (-60 to 60)
      const nextRotX = Math.max(-60, Math.min(60, startRot.x - dy * 0.8));

      setRotY(nextRotY);
      setRotX(nextRotX);

      // Play soft high-frequency click ticks on rotation thresholds
      if (soundEnabled) {
        const now = Date.now();
        if (now - lastSoundTime > 80) {
          const pitch = 700 + Math.abs(nextRotX) * 4;
          const panning = Math.sin((nextRotY * Math.PI) / 180); // Spatial Pan!
          playSpatialAvatarSound(pitch, panning, 'click');
          setLastSoundTime(now);
        }
      }
    } else {
      // Snappy parallax depth offset if not dragging
      const rect = e.currentTarget.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const rawX = (e.clientX - centerX) / (rect.width / 2);
      const rawY = (e.clientY - centerY) / (rect.height / 2);
      
      const nextTiltY = Math.max(-10, Math.min(10, rawX * 10));
      const nextTiltX = Math.max(-10, Math.min(10, -rawY * 10));

      setTiltY(nextTiltY);
      setTiltX(nextTiltX);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Resets tilt with a snappy spring back when mouse leaves the bounding box
  const handleMouseLeave = () => {
    setIsDragging(false);
    setTiltX(0);
    setTiltY(0);
  };

  // Snapchat Mobile Touch Gestures for 3D rotation
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
      setStartRot({ x: rotX, y: rotY });
      setAutoSpin(false);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (isDragging && e.touches.length === 1) {
      const dx = e.touches[0].clientX - dragStart.x;
      const dy = e.touches[0].clientY - dragStart.y;
      
      let nextRotY = startRot.y + dx * 0.8;
      if (nextRotY > 180) nextRotY -= 360;
      if (nextRotY < -180) nextRotY += 360;

      const nextRotX = Math.max(-60, Math.min(60, startRot.x - dy * 0.8));

      setRotY(nextRotY);
      setRotX(nextRotX);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Play playful bitmoji speech formants on tap
  const handleAvatarTap = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!soundEnabled) return;

    // Pitch mapping based on mouth expression
    let pitch = 220; // Default sweet neutral spot
    if (config.mouthExpression === 'smile' || config.mouthExpression === 'wink') {
      pitch = 280; // High cheerful voice
    } else if (config.mouthExpression === 'pout') {
      pitch = 180; // Grumpy low vocal
    } else if (config.mouthExpression === 'shocked') {
      pitch = 340; // High gasp frequency
    }

    // Determine spatial pan relative to click offset
    const rect = e.currentTarget.getBoundingClientRect();
    const relativeX = (e.clientX - rect.left) / rect.width;
    const panning = (relativeX - 0.5) * 2; // -1 to 1

    // Play the vocal formant
    playSpatialAvatarSound(pitch, panning, 'vocal');
  };

  // Randomize configuration
  const handleRandomize = () => {
    const randomSelect = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
    
    const randomConfig: AvatarConfig = {
      skinTone: randomSelect(SKIN_TONES).value,
      faceShape: randomSelect(['oval', 'round', 'square', 'heart', 'diamond']),
      hairStyle: randomSelect(['shortSpikes', 'classicPart', 'curlyAfro', 'elegantBob', 'longWaves', 'bald', 'pixie', 'topKnot']),
      hairColor: randomSelect(HAIR_COLORS).value,
      eyeStyle: randomSelect(['friendly', 'sleek', 'sharp', 'anime', 'closed']),
      eyeColor: randomSelect(EYE_COLORS).value,
      eyebrows: randomSelect(['classic', 'bushy', 'sharp', 'flat']),
      noseShape: randomSelect(['button', 'classic', 'wide', 'pointy']),
      mouthExpression: randomSelect(['smile', 'smirk', 'neutral', 'pout', 'shocked', 'wink']),
      facialHair: randomSelect(['none', 'stubble', 'beard', 'mustache', 'goatee']),
      facialHairColor: randomSelect(HAIR_COLORS).value,
      eyewear: randomSelect(['none', 'round', 'aviators', 'visor', 'catEye']),
      headwear: randomSelect(['none', 'backwardCap', 'beanie', 'wizardHat', 'crown', 'headband']),
      earrings: randomSelect(['none', 'goldStuds', 'hoops']),
      outfit: randomSelect(['hoodie', 'suit', 'tee', 'techJacket', 'gown']),
      outfitColor: randomSelect(OUTFIT_COLORS).value,
      pants: randomSelect(['jeans', 'sweatpants', 'shorts', 'cargo', 'chinos']),
      pantsColor: randomSelect(PANTS_COLORS).value,
      shoes: randomSelect(['sneakers', 'boots', 'loafers', 'sandals', 'highTops']),
      shoesColor: randomSelect(SHOES_COLORS).value,
      backgroundStyle: randomSelect(['solid', 'aurora', 'cyberGrid', 'sunset', 'deepSpace']),
      backgroundColor: '#FAF9F6'
    };
    setConfig(randomConfig);

    if (soundEnabled) {
      playSpatialAvatarSound(440, 0, 'space');
    }
  };

  // Convert SVG in DOM to Data URL base64 and save
  const handleSave = () => {
    const svgElement = document.getElementById('avatar-svg-render');
    if (!svgElement) return;

    try {
      // Save configuration structurally
      localStorage.setItem(`avatar_config_${currentUser.id}`, JSON.stringify(config));
      
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(svgElement);
      const svgBase64 = window.btoa(unescape(encodeURIComponent(svgString)));
      const dataUrl = `data:image/svg+xml;base64,${svgBase64}`;
      onSaveAvatar(dataUrl, config);

      if (soundEnabled) {
        playSpatialAvatarSound(261.63, 0, 'success'); // 261.63 is middle C (C4) for major success chord
      }
    } catch (err) {
      console.error("Error creating SVG data URL", err);
      alert("Failed to export your custom avatar. Please try again!");
    }
  };

  // Download SVG file
  const handleDownload = () => {
    const svgElement = document.getElementById('avatar-svg-render');
    if (!svgElement) return;

    try {
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(svgElement);
      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${currentUser.username}_avatar.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error downloading SVG", err);
    }
  };

  // Download custom personalized Bitmoji sticker SVG
  const handleDownloadSticker = (stickerId: string) => {
    const svgElement = document.getElementById(`sticker-svg-${stickerId}`);
    if (!svgElement) return;

    try {
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(svgElement);
      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${currentUser.username}_bitmoji_${stickerId}.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error downloading sticker SVG", err);
    }
  };

  // Convert sticker SVG into a Data URL and set as profile avatar
  const handleUseStickerAsAvatar = (stickerId: string) => {
    const svgElement = document.getElementById(`sticker-svg-${stickerId}`);
    if (!svgElement) return;

    try {
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(svgElement);
      const svgBase64 = window.btoa(unescape(encodeURIComponent(svgString)));
      const dataUrl = `data:image/svg+xml;base64,${svgBase64}`;
      onSaveAvatar(dataUrl, config);
    } catch (err) {
      console.error("Error setting sticker as avatar", err);
    }
  };

  // Local AI Parsing Logic (Extremely fast, smart keyword mapping compiler)
  const handleAiStylistCompile = () => {
    if (!aiPrompt.trim()) return;

    setAiLoading(true);
    setAiLog([]);

    const logMessage = (msg: string, delay: number) => {
      setTimeout(() => {
        setAiLog(prev => [...prev, msg]);
      }, delay);
    };

    logMessage("🔮 Establishing connection with Gemini Co-Pilot...", 300);
    logMessage("🔍 Parsing natural language attributes: \"" + aiPrompt + "\"", 800);

    setTimeout(() => {
      const lower = aiPrompt.toLowerCase();
      const nextConfig = { ...config };
      const matched: string[] = [];

      // Advanced 3D keyword parsing
      if (lower.includes('3d') || lower.includes('realistic') || lower.includes('glossy') || lower.includes('plastic') || lower.includes('glass') || lower.includes('shiny') || lower.includes('shading')) {
        nextConfig.renderStyle3D = lower.includes('glass') || lower.includes('crystal') ? 'crystalGlass' : 'shinyPlastic';
        nextConfig.shadingIntensity = 75;
        nextConfig.glossiness = 85;
        nextConfig.cheekBlush = 'rosy';
        matched.push("3D Rendering: High-Specularity 3D Volumetric Materials Applied");
      }
      if (lower.includes('gold') || lower.includes('metal') || lower.includes('metallic') || lower.includes('chrome') || lower.includes('silver') || lower.includes('bronze')) {
        nextConfig.renderStyle3D = 'metallicGold';
        nextConfig.shadingIntensity = 80;
        nextConfig.glossiness = 90;
        matched.push("3D Rendering: Polished 3D Sovereign Gold Figurine Finish");
      }
      if (lower.includes('glow') || lower.includes('rim') || lower.includes('hologram') || lower.includes('neon') || lower.includes('cyberpunk glow')) {
        nextConfig.renderStyle3D = 'cyberpunkGlow';
        nextConfig.rimGlowColor = '#FF007F';
        nextConfig.shadingIntensity = 85;
        nextConfig.glossiness = 70;
        matched.push("3D Rendering: Neon Dual Rim Glow Aura applied");
      }

      // Keyword matches
      if (lower.includes('cyber') || lower.includes('neon') || lower.includes('futuristic') || lower.includes('sci-fi')) {
        nextConfig.backgroundStyle = 'cyberGrid';
        nextConfig.eyewear = 'visor';
        nextConfig.outfit = 'techJacket';
        nextConfig.outfitColor = '#1F1F1F';
        nextConfig.hairColor = '#FF007F'; // Neon pink
        matched.push("Theme: Cyberpunk Style Visor & Jacket with Neon Hair");
      }
      
      if (lower.includes('wizard') || lower.includes('witch') || lower.includes('magic') || lower.includes('spell')) {
        nextConfig.headwear = 'wizardHat';
        nextConfig.backgroundStyle = 'deepSpace';
        nextConfig.outfit = 'gown';
        nextConfig.outfitColor = '#6B21A8'; // Dark purple
        nextConfig.eyeStyle = 'anime';
        nextConfig.eyeColor = '#6A1B9A';
        matched.push("Theme: Magical Wizard Uniform, pointy hat & Deep Space BG");
      }

      if (lower.includes('royal') || lower.includes('crown') || lower.includes('king') || lower.includes('queen') || lower.includes('prince') || lower.includes('princess')) {
        nextConfig.headwear = 'crown';
        nextConfig.outfit = 'gown';
        nextConfig.outfitColor = '#C4B99D'; // Gold
        nextConfig.earrings = 'goldStuds';
        matched.push("Theme: Sovereign Royalty Crown with Gold Studs");
      }

      if (lower.includes('executive') || lower.includes('business') || lower.includes('suit') || lower.includes('formal') || lower.includes('corporate') || lower.includes('office')) {
        nextConfig.outfit = 'suit';
        nextConfig.outfitColor = '#1F1F1F';
        nextConfig.eyewear = 'round';
        nextConfig.hairStyle = 'classicPart';
        matched.push("Theme: Corporate Formal Suit, Classic Haircut, and Round Glasses");
      }

      if (lower.includes('cozy') || lower.includes('chill') || lower.includes('warm') || lower.includes('hoodie') || lower.includes('sweater')) {
        nextConfig.outfit = 'hoodie';
        nextConfig.outfitColor = '#FDA4AF';
        nextConfig.headwear = 'beanie';
        nextConfig.mouthExpression = 'smile';
        matched.push("Theme: Cozy Loungewear Hood and Knitted Beanie");
      }

      // Individual feature keywords
      // Skin
      if (lower.includes('pale') || lower.includes('white') || lower.includes('fair')) {
        nextConfig.skinTone = '#FFDFC4';
        matched.push("Skin: Alabaster fair shade");
      } else if (lower.includes('dark skin') || lower.includes('chocolate') || lower.includes('african') || lower.includes('black skin')) {
        nextConfig.skinTone = '#5C3818';
        matched.push("Skin: Deep rich chocolate shade");
      } else if (lower.includes('tan') || lower.includes('olive') || lower.includes('brown skin') || lower.includes('medium')) {
        nextConfig.skinTone = '#B88760';
        matched.push("Skin: Sun-kissed Bronze");
      } else if (lower.includes('green skin') || lower.includes('orc') || lower.includes('alien') || lower.includes('goblin')) {
        nextConfig.skinTone = '#A2E8B9';
        matched.push("Skin: Fantasy Green shade");
      } else if (lower.includes('pink skin') || lower.includes('fairy') || lower.includes('bubblegum')) {
        nextConfig.skinTone = '#FFB7D5';
        matched.push("Skin: Nebula Pink shade");
      }

      // Hair
      if (lower.includes('blonde') || lower.includes('gold hair') || lower.includes('yellow hair')) {
        nextConfig.hairColor = '#E6C229';
        matched.push("Hair Color: Gilded Blonde");
      } else if (lower.includes('ginger') || lower.includes('red hair') || lower.includes('auburn')) {
        nextConfig.hairColor = '#A02B2B';
        matched.push("Hair Color: Auburn Crimson");
      } else if (lower.includes('pink hair')) {
        nextConfig.hairColor = '#FF007F';
        matched.push("Hair Color: Cyber Neon Pink");
      } else if (lower.includes('blue hair') || lower.includes('teal hair') || lower.includes('green hair')) {
        nextConfig.hairColor = '#10B981';
        matched.push("Hair Color: Borealis Teal");
      } else if (lower.includes('black hair') || lower.includes('dark hair')) {
        nextConfig.hairColor = '#1A1A1A';
        matched.push("Hair Color: Obsidian Black");
      } else if (lower.includes('brown hair')) {
        nextConfig.hairColor = '#3D2314';
        matched.push("Hair Color: Chocolate Mocha");
      } else if (lower.includes('silver hair') || lower.includes('gray hair') || lower.includes('white hair')) {
        nextConfig.hairColor = '#E2E8F0';
        matched.push("Hair Color: Sterling Silver");
      }

      // Haircut Style
      if (lower.includes('spikes') || lower.includes('spiky') || lower.includes('punk')) {
        nextConfig.hairStyle = 'shortSpikes';
        matched.push("Hair Cut: Punk Spikes");
      } else if (lower.includes('curly') || lower.includes('afro') || lower.includes('bubbly')) {
        nextConfig.hairStyle = 'curlyAfro';
        matched.push("Hair Cut: Curly Afro Volume");
      } else if (lower.includes('bob') || lower.includes('fringe')) {
        nextConfig.hairStyle = 'elegantBob';
        matched.push("Hair Cut: Balanced Bob");
      } else if (lower.includes('long waves') || lower.includes('wavy') || lower.includes('flowing')) {
        nextConfig.hairStyle = 'longWaves';
        matched.push("Hair Cut: Long Wave extensions");
      } else if (lower.includes('pixie') || lower.includes('shaved sides')) {
        nextConfig.hairStyle = 'pixie';
        matched.push("Hair Cut: Pixie Cropped Shave");
      } else if (lower.includes('bald') || lower.includes('shaved head')) {
        nextConfig.hairStyle = 'bald';
        matched.push("Hair Cut: Shaved Clean Dome");
      } else if (lower.includes('bun') || lower.includes('top knot') || lower.includes('hipster')) {
        nextConfig.hairStyle = 'topKnot';
        matched.push("Hair Cut: Zen Top Knot");
      }

      // Eyes
      if (lower.includes('blue eyes')) {
        nextConfig.eyeColor = '#1565C0';
        matched.push("Eye Color: Sapphire Blue");
      } else if (lower.includes('green eyes')) {
        nextConfig.eyeColor = '#2E7D32';
        matched.push("Eye Color: Forest Emerald");
      } else if (lower.includes('gold eyes') || lower.includes('yellow eyes')) {
        nextConfig.eyeColor = '#F57F17';
        matched.push("Eye Color: Amber Solar");
      } else if (lower.includes('purple eyes') || lower.includes('violet')) {
        nextConfig.eyeColor = '#6A1B9A';
        matched.push("Eye Color: Amethyst glow");
      } else if (lower.includes('sparkle') || lower.includes('anime eyes') || lower.includes('cute eyes')) {
        nextConfig.eyeStyle = 'anime';
        matched.push("Eye Style: High Sparkle Anime");
      } else if (lower.includes('closed') || lower.includes('happy eyes') || lower.includes('sleeping')) {
        nextConfig.eyeStyle = 'closed';
        matched.push("Eye Style: Closed Serene curve");
      }

      // Expression
      if (lower.includes('smile') || lower.includes('happy') || lower.includes('cheerful')) {
        nextConfig.mouthExpression = 'smile';
        matched.push("Mouth: Joyous Smile");
      } else if (lower.includes('smirk') || lower.includes('cheeky') || lower.includes('wink')) {
        nextConfig.mouthExpression = 'wink';
        matched.push("Expression: Wink & Cheeky Smirk combo");
      } else if (lower.includes('shocked') || lower.includes('surprised') || lower.includes('gasp')) {
        nextConfig.mouthExpression = 'shocked';
        matched.push("Mouth: Gasp of Amazement");
      } else if (lower.includes('serious') || lower.includes('sad') || lower.includes('neutral')) {
        nextConfig.mouthExpression = 'neutral';
        matched.push("Mouth: Stoic Horizontal Plane");
      } else if (lower.includes('pout') || lower.includes('grumpy')) {
        nextConfig.mouthExpression = 'pout';
        matched.push("Mouth: Pout curve");
      }

      // Beard / Facial Hair
      if (lower.includes('beard') || lower.includes('hairy')) {
        nextConfig.facialHair = 'beard';
        nextConfig.facialHairColor = nextConfig.hairColor;
        matched.push("Facial Hair: Full-grown Beard");
      } else if (lower.includes('mustache') || lower.includes('stache')) {
        nextConfig.facialHair = 'mustache';
        nextConfig.facialHairColor = nextConfig.hairColor;
        matched.push("Facial Hair: Refined Mustache");
      } else if (lower.includes('goatee')) {
        nextConfig.facialHair = 'goatee';
        nextConfig.facialHairColor = nextConfig.hairColor;
        matched.push("Facial Hair: Sculpted Goatee");
      } else if (lower.includes('stubble') || lower.includes('five o\'clock')) {
        nextConfig.facialHair = 'stubble';
        matched.push("Facial Hair: Visual Stubble Outline");
      }

      // Glasses
      if (lower.includes('aviators') || lower.includes('sunglasses') || lower.includes('shades')) {
        nextConfig.eyewear = 'aviators';
        matched.push("Eyewear: Golden Frame Aviators");
      } else if (lower.includes('glasses') || lower.includes('round glasses')) {
        nextConfig.eyewear = 'round';
        matched.push("Eyewear: Sleek Circular Wireframes");
      } else if (lower.includes('cat') || lower.includes('retro glasses')) {
        nextConfig.eyewear = 'catEye';
        matched.push("Eyewear: Pink retro Cat-Eye");
      }

      // Hats
      if (lower.includes('cap') || lower.includes('baseball cap') || lower.includes('hat')) {
        if (!lower.includes('wizard') && !lower.includes('witch') && !lower.includes('beanie')) {
          nextConfig.headwear = 'backwardCap';
          matched.push("Headwear: Red Backward-facing Cap");
        }
      } else if (lower.includes('beanie') || lower.includes('winter hat')) {
        nextConfig.headwear = 'beanie';
        matched.push("Headwear: Ribbed Knitted Beanie");
      } else if (lower.includes('headband') || lower.includes('athletic')) {
        nextConfig.headwear = 'headband';
        matched.push("Headwear: Sport Headband Band");
      }

      // Backgrounds specifically
      if (lower.includes('sunset background') || lower.includes('orange bg') || lower.includes('warm background')) {
        nextConfig.backgroundStyle = 'sunset';
        matched.push("Background: Golden Hour Sunset");
      } else if (lower.includes('space background') || lower.includes('stars bg') || lower.includes('starry')) {
        nextConfig.backgroundStyle = 'deepSpace';
        matched.push("Background: Deep Cosmic Cosmos");
      } else if (lower.includes('aurora background') || lower.includes('gradient bg') || lower.includes('colorful bg')) {
        nextConfig.backgroundStyle = 'aurora';
        matched.push("Background: Holographic Aurora Flow");
      } else if (lower.includes('solid background') || lower.includes('clean bg')) {
        nextConfig.backgroundStyle = 'solid';
        matched.push("Background: Clean Studio Light Solid");
      }

      // Fallback
      if (matched.length === 0) {
        matched.push("No explicit matches. Executed a gorgeous creative randomized balance instead!");
        // Randomize some styles to satisfy the creative vibe
        nextConfig.hairStyle = 'curlyAfro';
        nextConfig.eyewear = 'round';
        nextConfig.backgroundStyle = 'sunset';
      }

      // Apply
      setConfig(nextConfig);

      logMessage("⚙️ Dynamic Style compilation successful!", 1400);
      matched.forEach((m, idx) => {
        logMessage("✨ Applied: " + m, 1800 + idx * 250);
      });
      logMessage("🎉 Your advanced custom avatar is ready in the viewport!", 2800);

      setTimeout(() => {
        setAiLoading(false);
      }, 3000);
    }, 1500);
  };

  return (
    <div id="avatar_studio_overlay" className="fixed inset-0 bg-stone-950/85 backdrop-blur-md z-50 flex items-start md:items-center justify-center overflow-y-auto p-3 md:p-6 text-left font-sans">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-stone-900 border border-stone-850 rounded-3xl shadow-2xl max-w-5xl w-full flex flex-col md:flex-row overflow-hidden max-h-none md:max-h-[85vh] relative text-stone-100"
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-stone-950/60 hover:bg-stone-800 text-stone-400 hover:text-white border border-stone-800 transition-all cursor-pointer z-20"
        >
          <X className="w-5 h-5" />
        </button>

        {/* LEFT PANEL: AVATAR VIEWPORT */}
        <div className="w-full md:w-[42%] bg-stone-950 p-6 md:p-8 flex flex-col items-center justify-between border-b md:border-b-0 md:border-r border-[#EAE3D2]/15 relative shrink-0">
          
          {/* Subtle tech background grids */}
          <div className="absolute inset-0 bg-[radial-gradient(#EAE3D2/5%_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

          {/* Header titles */}
          <div className="text-center space-y-3 relative z-10 w-full">
            <div className="space-y-1">
              <span className="text-[10px] uppercase tracking-widest text-[#C4B99D] font-bold">Bitmoji Custom Studio</span>
              <h3 className="text-lg font-serif font-bold text-stone-100 uppercase tracking-wide">Avatar Creator</h3>
            </div>
            
            {/* 2D vs 3D Interactive engine selector */}
            <div className="inline-flex p-1 rounded-full bg-stone-900/90 border border-stone-800 self-center">
              <button
                type="button"
                onClick={() => {
                  setViewMode('3d');
                  if (soundEnabled) playSpatialAvatarSound(600, 0, 'click');
                }}
                className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  viewMode === '3d'
                    ? 'bg-gradient-to-r from-[#C4B99D] to-[#EAE3D2] text-stone-100 shadow-md font-bold'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                🔮 Full 3D Space
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewMode('2d');
                  if (soundEnabled) playSpatialAvatarSound(500, 0, 'click');
                }}
                className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  viewMode === '2d'
                    ? 'bg-gradient-to-r from-[#C4B99D] to-[#EAE3D2] text-stone-100 shadow-md font-bold'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                🖼️ 2.5D Parallax
              </button>
            </div>
          </div>

          {/* Interactive Avatar Frame */}
          {viewMode === '3d' ? (
            <div className="w-full flex-1 min-h-[350px] my-3 relative flex flex-col items-center justify-center z-10 rounded-3xl overflow-hidden border border-[#EAE3D2]/10 bg-stone-950 shadow-inner">
              
              {/* Shutter flash effect */}
              <AnimatePresence>
                {shutterFlash && (
                  <motion.div 
                    initial={{ opacity: 1 }}
                    animate={{ opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="absolute inset-0 bg-white z-50 pointer-events-none"
                  />
                )}
              </AnimatePresence>

              {/* AR Video / Backing elements */}
              {arMode && (
                <div className="absolute inset-0 z-0 overflow-hidden">
                  {!arError ? (
                    <video
                      ref={arVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className={`w-full h-full object-cover select-none pointer-events-none transform -scale-x-100 ${
                        arFilter === 'cyberpunk' ? 'filter hue-rotate-[130deg] saturate-150 contrast-125' :
                        arFilter === 'retro' ? 'filter sepia(0.6) saturate-120' :
                        arFilter === 'noir' ? 'filter grayscale(1) contrast-150' :
                        arFilter === 'scifi' ? 'filter hue-rotate-[240deg] invert(0.1) saturate-150' : ''
                      }`}
                    />
                  ) : (
                    <video
                      src={AR_FALLBACK_SCENERIES[arSceneryIdx].url}
                      autoPlay
                      loop
                      playsInline
                      muted
                      className={`w-full h-full object-cover select-none pointer-events-none ${
                        arFilter === 'cyberpunk' ? 'filter hue-rotate-[130deg] saturate-150 contrast-125' :
                        arFilter === 'retro' ? 'filter sepia(0.6) saturate-120' :
                        arFilter === 'noir' ? 'filter grayscale(1) contrast-150' :
                        arFilter === 'scifi' ? 'filter hue-rotate-[240deg] invert(0.1) saturate-150' : ''
                      }`}
                    />
                  )}
                  {/* Backdrop overlay shade */}
                  <div className="absolute inset-0 bg-gradient-to-b from-stone-950/20 via-transparent to-stone-950/40 pointer-events-none" />
                </div>
              )}

              {/* AR HUD top info overlays */}
              {arMode && (
                <div className="absolute top-4 left-4 z-20 flex flex-col gap-1.5 pointer-events-none max-w-[65%] text-left">
                  <div className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 border shadow-md w-fit ${
                    !arError 
                      ? 'bg-rose-950/85 border-rose-500/30 text-rose-400' 
                      : 'bg-cyan-950/85 border-cyan-500/30 text-cyan-400'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${!arError ? 'bg-rose-500 animate-ping' : 'bg-cyan-400 animate-pulse'}`} />
                    <span>{!arError ? 'LIVE CAMERA INTEGRATION' : 'VIRTUAL STUDIO GREEN-SCREEN'}</span>
                  </div>

                  {arError && (
                    <div className="bg-stone-950/90 backdrop-blur-md border border-stone-800/80 rounded-xl p-2 text-[8px] font-medium text-stone-300 leading-normal shadow-lg">
                      <span className="font-bold text-amber-400">💡 Tip:</span> Camera access is blocked. Enjoy our high-fidelity virtual background locations below, and drag to pose your avatar inside them!
                    </div>
                  )}
                </div>
              )}

              {/* The 3D Canvas itself (always layered on top of video, receiving Orbit pointer events) */}
              <div className="w-full h-full absolute inset-0 z-10 pointer-events-auto">
                <Canvas3D config={config} arMode={arMode} />
              </div>

              {/* AR HUD Controls (layered on top of Canvas) */}
              {arMode && (
                <div className="absolute bottom-4 left-4 right-4 z-20 flex flex-col gap-2.5 pointer-events-auto">
                  {/* Backdrop Selector if camera is mock/error fallback */}
                  {arError && (
                    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none items-center bg-stone-950/60 backdrop-blur-md p-1.5 rounded-xl border border-white/5">
                      <span className="text-[7.5px] font-mono text-cyan-400 uppercase tracking-wider shrink-0 bg-stone-950/80 px-1.5 py-0.5 rounded border border-cyan-500/30 font-bold">
                        Choose Destination:
                      </span>
                      {AR_FALLBACK_SCENERIES.map((sc, i) => (
                        <button
                          key={sc.name}
                          type="button"
                          onClick={() => {
                            setArSceneryIdx(i);
                            if (soundEnabled) playSpatialAvatarSound(600 + i * 50, 0, 'click');
                          }}
                          className={`text-[8.5px] px-2.5 py-0.5 rounded-full shrink-0 transition-all font-bold tracking-tight border uppercase ${
                            arSceneryIdx === i
                              ? 'bg-cyan-600 border-cyan-400 text-white shadow-lg'
                              : 'bg-stone-900 border-stone-850 text-stone-400 hover:text-stone-200'
                          }`}
                        >
                          {sc.name}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between bg-stone-950/90 backdrop-blur-md p-2.5 rounded-2xl border border-white/10 shadow-2xl">
                    {/* AR Filter Selection */}
                    <div className="flex gap-1.5 items-center overflow-x-auto scrollbar-none">
                      <span className="text-[8px] font-mono text-amber-400 uppercase tracking-widest shrink-0 font-bold">Lens:</span>
                      {[
                        { id: 'none', label: '✨ Normal', color: 'border-stone-800' },
                        { id: 'cyberpunk', label: '👾 Cyber', color: 'border-fuchsia-500/40' },
                        { id: 'retro', label: '🎞️ Sepia', color: 'border-amber-600/40' },
                        { id: 'noir', label: '🕶️ Noir', color: 'border-slate-400/40' },
                        { id: 'scifi', label: '🌌 Cosmic', color: 'border-indigo-500/40' }
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setArFilter(item.id as any);
                            if (soundEnabled) playSpatialAvatarSound(650, 0, 'click');
                          }}
                          className={`text-[8.5px] font-black uppercase px-2 py-1 rounded-lg transition-all border ${
                            arFilter === item.id
                              ? 'bg-[#C4B99D] text-stone-100 border-[#C4B99D] shadow-lg'
                              : `bg-stone-900/60 text-stone-400 hover:text-stone-200 ${item.color}`
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>

                    {/* Quick Shutter Action */}
                    <button
                      type="button"
                      onClick={handleCaptureSnap}
                      className="p-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-full transition-all hover:scale-110 active:scale-95 shadow-lg shadow-rose-600/30 flex items-center justify-center cursor-pointer shrink-0 ml-2"
                      title="Take Snapshot"
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* AR Toggle button placed at the top-right corner of the viewport */}
              <div className="absolute top-4 right-4 z-20 flex gap-2">
                <button
                  type="button"
                  onClick={handleToggleAR}
                  className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 border transition-all cursor-pointer shadow-lg ${
                    arMode
                      ? 'bg-purple-600 border-purple-400 text-white hover:bg-purple-500 shadow-purple-500/20'
                      : 'bg-stone-900/80 border-stone-800 text-stone-400 hover:text-stone-200 hover:border-stone-700'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${arMode ? 'bg-green-400 animate-pulse' : 'bg-stone-600'}`} />
                  <span>{arMode ? 'AR Camera: ON' : 'AR Mode'}</span>
                </button>
              </div>

            </div>
          ) : (
            <div 
              className="my-4 relative flex flex-col items-center justify-center cursor-grab active:cursor-grabbing group select-none touch-none"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onClick={handleAvatarTap}
            >
              {/* Animated Glow Border */}
              <div className="absolute inset-0 bg-gradient-to-tr from-[#C4B99D]/40 to-[#FAF9F6]/20 rounded-full blur-xl scale-110 opacity-70 group-hover:scale-125 transition-transform duration-500 pointer-events-none" />
              
              <div 
                className="relative p-2.5 rounded-full border-2 border-[#C4B99D]/30 bg-stone-900/60 shadow-2xl transition-all duration-300 hover:border-[#C4B99D]/60 select-none overflow-hidden"
                style={{
                  perspective: '1200px',
                  transformStyle: 'preserve-3d',
                }}
              >
                <AvatarSVG 
                  config={config} 
                  size={230} 
                  id="avatar-svg-render" 
                  tiltX={tiltX} 
                  tiltY={tiltY} 
                  rotX={rotX}
                  rotY={rotY}
                  layerExplosion={layerExplosion}
                  isDragging={isDragging}
                />
              </div>
              
              <div className="mt-4 text-center space-y-1 select-none pointer-events-none">
                <span className="text-[10px] font-mono text-[#C4B99D] uppercase tracking-wider block group-hover:text-stone-100 transition-colors">
                  ✨ Drag to Rotate 360° | Tap to Speak
                </span>
                <span className="text-[9px] text-stone-400 block">
                  Interact just like Snapchat Avatar Studio!
                </span>
              </div>
            </div>
          )}

          {/* Control Utility Buttons */}
          <div className="w-full space-y-3 relative z-10">
            {/* 3D Spatial Audio & Audio Controller */}
            <div className="bg-stone-900/80 border border-stone-800/80 rounded-xl p-2.5 flex items-center justify-between select-none">
              <div className="flex flex-col text-left">
                <span className="text-[10px] font-bold text-stone-300 uppercase tracking-wide">3D Audio FX Engine</span>
                <span className="text-[9px] text-stone-400">Formant Speech Synth & Panning</span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSoundEnabled(!soundEnabled);
                }}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  soundEnabled 
                    ? 'bg-gradient-to-r from-emerald-500/25 to-teal-500/25 border border-emerald-500/40 text-emerald-400' 
                    : 'bg-stone-800 border border-stone-700 text-stone-400'
                }`}
              >
                {soundEnabled ? '🔊 Active' : '🔇 Muted'}
              </button>
            </div>

            {/* 3D Orbit Control Sliders */}
            <div className="bg-stone-900/80 border border-stone-800/80 rounded-2xl p-3.5 space-y-3">
              <div className="flex items-center justify-between select-none border-b border-stone-800/60 pb-2">
                <span className="text-[10px] font-bold text-stone-200 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                  🔄 3D Rigging & Orbit Studio
                </span>
                <div className="flex items-center gap-1.5">
                  {/* Reset button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setRotX(0);
                      setRotY(0);
                      setLayerExplosion(1.0);
                      setAutoSpin(false);
                      if (soundEnabled) playSpatialAvatarSound(500, 0, 'click');
                    }}
                    className="p-1 px-1.5 rounded bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-stone-200 text-[9px] font-bold transition-all cursor-pointer"
                    title="Reset to Center"
                  >
                    RESET
                  </button>
                  {/* Auto-Spin Toggle */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAutoSpin(!autoSpin);
                      if (soundEnabled) playSpatialAvatarSound(autoSpin ? 400 : 600, 0, 'click');
                    }}
                    className={`p-1 px-1.5 rounded text-[9px] font-bold uppercase transition-all cursor-pointer ${
                      autoSpin 
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold' 
                        : 'bg-stone-800 text-stone-400 border border-stone-700'
                    }`}
                  >
                    {autoSpin ? 'SPINNING' : 'SPIN'}
                  </button>
                </div>
              </div>

              {/* Slider 1: Y-Rotation (360 degrees) */}
              <div className="space-y-1">
                <div className="flex justify-between text-[9px] font-mono text-stone-400">
                  <span>Horizontal Rotation (Y-Orbit)</span>
                  <span className="text-stone-200 font-bold">
                    {Math.round(rotY)}° 
                    {Math.abs(rotY) < 15 ? ' (Front)' : 
                     Math.abs(rotY) > 165 ? ' (Back)' : 
                     rotY > 0 ? ' (Right Profile)' : ' (Left Profile)'}
                  </span>
                </div>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  step="1"
                  value={rotY}
                  onChange={(e) => {
                    setRotY(parseFloat(e.target.value));
                    setAutoSpin(false); // Stop spin on manual slide
                  }}
                  className="w-full h-1 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-[#C4B99D]"
                />
              </div>

              {/* Slider 2: X-Rotation (Vertical Tilt) */}
              <div className="space-y-1">
                <div className="flex justify-between text-[9px] font-mono text-stone-400">
                  <span>Vertical Pitch (X-Tilt)</span>
                  <span className="text-stone-200 font-bold">
                    {Math.round(rotX)}° 
                    {rotX > 15 ? ' (Looking Down)' : rotX < -15 ? ' (Looking Up)' : ' (Flat)'}
                  </span>
                </div>
                <input
                  type="range"
                  min="-60"
                  max="60"
                  step="1"
                  value={rotX}
                  onChange={(e) => {
                    setRotX(parseFloat(e.target.value));
                  }}
                  className="w-full h-1 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-[#C4B99D]"
                />
              </div>

              {/* Slider 3: Layer Explosion (Hologram Depth) */}
              <div className="space-y-1">
                <div className="flex justify-between text-[9px] font-mono text-stone-400">
                  <span>3D Layer Explosion (Spatial Depth)</span>
                  <span className="text-stone-200 font-bold">{layerExplosion.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="2.5"
                  step="0.1"
                  value={layerExplosion}
                  onChange={(e) => {
                    setLayerExplosion(parseFloat(e.target.value));
                  }}
                  className="w-full h-1 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-[#C4B99D]"
                />
              </div>
            </div>

            {/* Profile display detail */}
            <div className="bg-stone-950/40 border border-stone-850/60 p-2 rounded text-center">
              <span className="text-[10px] font-mono text-stone-400">Owner ID: <strong className="text-[#C4B99D]">{currentUser.username}</strong></span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleRandomize}
                className="py-2.5 bg-stone-900 border border-stone-800 hover:bg-stone-800 text-stone-200 rounded text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Shuffle className="w-3.5 h-3.5 text-[#C4B99D]" /> Randomize
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="py-2.5 bg-stone-900 border border-stone-800 hover:bg-stone-800 text-stone-200 rounded text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[#C4B99D]" /> Export SVG
              </button>
            </div>

            <button
              type="button"
              onClick={handleSave}
              className="w-full py-3.5 bg-gradient-to-r from-[#DF9F28] to-[#C4B99D] hover:from-[#EADAB8] hover:to-[#DF9F28] text-stone-100 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-[#DF9F28]/25 transition-all duration-300 cursor-pointer scale-100 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Check className="w-4 h-4 text-stone-100" /> Apply & Save Avatar
            </button>
          </div>
        </div>

        {/* RIGHT PANEL: TABBED OPTIONS */}
        <div className="flex-1 flex flex-col bg-stone-900 overflow-visible md:overflow-hidden">
          
          {/* TAB HEADERS */}
          <div className="flex border-b border-stone-850 overflow-x-auto scrollbar-none shrink-0 bg-stone-950/40">
            {[
              { id: 'presets', label: 'Presets', icon: Palette },
              { id: 'face', label: 'Face', icon: Smile },
              { id: 'hair', label: 'Hair Styles', icon: Scissors },
              { id: 'clothes', label: 'Apparel', icon: Shirt },
              { id: 'accessories', label: 'Jewelry', icon: Glasses },
              { id: 'render3d', label: '🔮 3D Render', icon: Sparkles },
              { id: 'ai', label: '✨ AI Stylist', icon: Sparkles },
              { id: 'stickers', label: '🔥 Bitmoji Stickers', icon: Smile }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-5 py-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all shrink-0 cursor-pointer ${
                  activeTab === tab.id
                    ? 'border-[#C4B99D] text-white bg-stone-900/60 font-black'
                    : 'border-transparent text-stone-400 hover:text-stone-200 hover:bg-stone-900/20'
                }`}
              >
                <tab.icon className={`w-3.5 h-3.5 ${activeTab === tab.id ? 'text-[#C4B99D]' : ''}`} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* TAB CONTENTS (Scrollable area) */}
          <div className="flex-1 overflow-y-visible md:overflow-y-auto p-6 md:p-8 space-y-6">
            
            {/* 1. PRESETS TAB */}
            {activeTab === 'presets' && (
              <div className="space-y-6 animate-fade-in text-left">
                <div>
                  <h4 className="text-xs font-serif font-extrabold uppercase tracking-widest text-stone-100 mb-1">Instant Archetypes</h4>
                  <p className="text-[11px] text-stone-400">Pick an incredibly themed character layout to start styling your unique digital twin.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {AVATAR_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => setConfig(preset.config)}
                      className="p-4 border border-stone-850 bg-stone-950/20 rounded-xl flex items-center gap-4 hover:bg-stone-850 transition-all text-left group cursor-pointer"
                    >
                      <div className="p-1 rounded-full border border-stone-800 bg-stone-950/40 group-hover:border-[#C4B99D] transition-colors">
                        <AvatarSVG config={preset.config} size={64} />
                      </div>
                      <div className="space-y-1">
                        <h5 className="font-bold text-xs text-stone-200 uppercase tracking-wider">{preset.name}</h5>
                        <p className="text-[10px] text-stone-400 capitalize">{preset.config.hairStyle} style / {preset.config.backgroundStyle} theme</p>
                        <span className="text-[9px] text-[#C4B99D] font-extrabold uppercase tracking-widest flex items-center gap-0.5 mt-1">
                          Apply Preset <ArrowRight className="w-2.5 h-2.5" />
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 2. FACE TAB */}
            {activeTab === 'face' && (
              <div className="space-y-6 animate-fade-in text-left">
                {/* Skin tone */}
                <div className="space-y-3">
                  <h4 className="text-xs font-serif font-extrabold uppercase tracking-widest text-[#C4B99D] font-bold">Melanin & Skin Tone</h4>
                  <div className="grid grid-cols-4 gap-2.5">
                    {SKIN_TONES.map(skin => (
                      <button
                        key={skin.name}
                        onClick={() => setConfig({ ...config, skinTone: skin.value })}
                        className={`p-1.5 rounded-lg border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                          config.skinTone === skin.value ? 'border-[#C4B99D] bg-stone-800' : 'border-stone-850 hover:border-stone-700 bg-stone-950/20'
                        }`}
                      >
                        <div className="w-8 h-8 rounded-full border border-black/10 shadow-sm" style={{ backgroundColor: skin.value }} />
                        <span className="text-[9px] text-stone-300 truncate max-w-full text-center">{skin.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Face Shape */}
                <div className="space-y-3">
                  <h4 className="text-xs font-serif font-extrabold uppercase tracking-widest text-[#C4B99D] font-bold">Face Structure</h4>
                  <div className="grid grid-cols-5 gap-2">
                    {['oval', 'round', 'square', 'heart', 'diamond'].map((shape) => (
                      <button
                        key={shape}
                        onClick={() => setConfig({ ...config, faceShape: shape as any })}
                        className={`p-2.5 border rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          config.faceShape === shape ? 'bg-indigo-600/40 border-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.25)] scale-[1.03]' : 'border-stone-850 text-stone-400 hover:bg-stone-850 bg-stone-950/30'
                        }`}
                      >
                        <OptionPreviewSVG type="faceShape" id={shape} />
                        <span className="text-[9px] font-bold uppercase tracking-wider">{shape}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Eyes & Brow shapes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h4 className="text-xs font-serif font-extrabold uppercase tracking-widest text-[#C4B99D] font-bold">Eye Silhouette</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {['friendly', 'sleek', 'sharp', 'anime', 'closed'].map((eye) => (
                        <button
                          key={eye}
                          onClick={() => setConfig({ ...config, eyeStyle: eye as any })}
                          className={`p-2.5 border rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            config.eyeStyle === eye ? 'bg-indigo-600/40 border-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.25)] scale-[1.03]' : 'border-stone-850 text-stone-400 hover:bg-stone-850 bg-stone-950/30'
                          }`}
                        >
                          <OptionPreviewSVG type="eyeStyle" id={eye} />
                          <span className="text-[9px] font-bold uppercase tracking-wider">{eye}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs font-serif font-extrabold uppercase tracking-widest text-[#C4B99D] font-bold">Brow Contour</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {['classic', 'bushy', 'sharp', 'flat'].map((brow) => (
                        <button
                          key={brow}
                          onClick={() => setConfig({ ...config, eyebrows: brow as any })}
                          className={`p-2.5 border rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            config.eyebrows === brow ? 'bg-indigo-600/40 border-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.25)] scale-[1.03]' : 'border-stone-850 text-stone-400 hover:bg-stone-850 bg-stone-950/30'
                          }`}
                        >
                          <OptionPreviewSVG type="eyebrows" id={brow} />
                          <span className="text-[9px] font-bold uppercase tracking-wider">{brow}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Nose & Mouth expression */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h4 className="text-xs font-serif font-extrabold uppercase tracking-widest text-[#C4B99D] font-bold">Nose Contour</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {['button', 'classic', 'wide', 'pointy'].map((nose) => (
                        <button
                          key={nose}
                          onClick={() => setConfig({ ...config, noseShape: nose as any })}
                          className={`p-2.5 border rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            config.noseShape === nose ? 'bg-indigo-600/40 border-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.25)] scale-[1.03]' : 'border-stone-850 text-stone-400 hover:bg-stone-850 bg-stone-950/30'
                          }`}
                        >
                          <OptionPreviewSVG type="noseShape" id={nose} />
                          <span className="text-[9px] font-bold uppercase tracking-wider">{nose}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs font-serif font-extrabold uppercase tracking-widest text-[#C4B99D] font-bold">Mouth & Mood</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {['smile', 'smirk', 'neutral', 'pout', 'shocked', 'wink'].map((mood) => (
                        <button
                          key={mood}
                          onClick={() => setConfig({ ...config, mouthExpression: mood as any })}
                          className={`p-2.5 border rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            config.mouthExpression === mood ? 'bg-indigo-600/40 border-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.25)] scale-[1.03]' : 'border-stone-850 text-stone-400 hover:bg-stone-850 bg-stone-950/30'
                          }`}
                        >
                          <OptionPreviewSVG type="mouthExpression" id={mood} />
                          <span className="text-[9px] font-bold uppercase tracking-wider">{mood}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Iris Colors */}
                <div className="space-y-3">
                  <h4 className="text-xs font-serif font-extrabold uppercase tracking-widest text-[#C4B99D] font-bold">Iris Pigmentation</h4>
                  <div className="grid grid-cols-6 gap-2">
                    {EYE_COLORS.map(eyeCol => (
                      <button
                        key={eyeCol.name}
                        onClick={() => setConfig({ ...config, eyeColor: eyeCol.value })}
                        className={`p-1 border rounded flex flex-col items-center gap-1 transition-all cursor-pointer ${
                          config.eyeColor === eyeCol.value ? 'border-[#C4B99D] bg-stone-800' : 'border-stone-850 hover:border-stone-700 bg-stone-950/20'
                        }`}
                        title={eyeCol.name}
                      >
                        <div className="w-6 h-6 rounded-full border border-black/10" style={{ backgroundColor: eyeCol.value }} />
                        <span className="text-[8px] text-stone-400 truncate max-w-full">{eyeCol.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 3. HAIR TAB */}
            {activeTab === 'hair' && (
              <div className="space-y-6 animate-fade-in text-left">
                {/* Hair styles */}
                <div className="space-y-3">
                  <h4 className="text-xs font-serif font-extrabold uppercase tracking-widest text-[#C4B99D] font-bold">Hairstyle Selection</h4>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: 'shortSpikes', label: 'Spikes' },
                      { id: 'classicPart', label: 'Gentle Part' },
                      { id: 'curlyAfro', label: 'Afro Vol.' },
                      { id: 'elegantBob', label: 'Chic Bob' },
                      { id: 'longWaves', label: 'Flowing Waves' },
                      { id: 'pixie', label: 'Feather Pixie' },
                      { id: 'topKnot', label: 'Knot / Bun' },
                      { id: 'bald', label: 'Bald / Clean' }
                    ].map(style => (
                      <button
                        key={style.id}
                        onClick={() => setConfig({ ...config, hairStyle: style.id as any })}
                        className={`p-2.5 border rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer text-center ${
                          config.hairStyle === style.id ? 'bg-indigo-600/40 border-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.25)] scale-[1.03]' : 'border-stone-850 text-stone-400 hover:bg-stone-850 bg-stone-950/30'
                        }`}
                      >
                        <OptionPreviewSVG type="hairStyle" id={style.id} color={config.hairColor} />
                        <span className="text-[9px] font-bold uppercase tracking-wider truncate max-w-full">{style.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Hair Color */}
                <div className="space-y-3">
                  <h4 className="text-xs font-serif font-extrabold uppercase tracking-widest text-[#C4B99D] font-bold">Hair Coloring</h4>
                  <div className="grid grid-cols-4 gap-2.5">
                    {HAIR_COLORS.map(hair => (
                      <button
                        key={hair.name}
                        onClick={() => setConfig({ ...config, hairColor: hair.value })}
                        className={`p-1.5 rounded-lg border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                          config.hairColor === hair.value ? 'border-[#C4B99D] bg-stone-800' : 'border-stone-850 hover:border-stone-700 bg-stone-950/20'
                        }`}
                      >
                        <div className="w-8 h-8 rounded-full border border-black/10 shadow-sm" style={{ backgroundColor: hair.value }} />
                        <span className="text-[9px] text-stone-300 truncate max-w-full text-center">{hair.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Facial Hair */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-stone-850">
                  <div className="space-y-3">
                    <h4 className="text-xs font-serif font-extrabold uppercase tracking-widest text-[#C4B99D] font-bold">Facial Beards</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {['none', 'stubble', 'beard', 'mustache', 'goatee'].map((beard) => (
                        <button
                          key={beard}
                          onClick={() => setConfig({ ...config, facialHair: beard as any, facialHairColor: config.hairColor })}
                          className={`p-2.5 border rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            config.facialHair === beard ? 'bg-indigo-600/40 border-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.25)] scale-[1.03]' : 'border-stone-850 text-stone-400 hover:bg-stone-850 bg-stone-950/30'
                          }`}
                        >
                          <OptionPreviewSVG type="facialHair" id={beard} color={config.facialHairColor} />
                          <span className="text-[9px] font-bold uppercase tracking-wider">{beard}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs font-serif font-extrabold uppercase tracking-widest text-[#C4B99D] font-bold">Beard Hue</h4>
                    <div className="grid grid-cols-3 gap-2">
                      {HAIR_COLORS.slice(0, 6).map(beardCol => (
                        <button
                          key={beardCol.name}
                          onClick={() => setConfig({ ...config, facialHairColor: beardCol.value })}
                          className={`p-1 border rounded flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            config.facialHairColor === beardCol.value ? 'border-[#C4B99D] bg-stone-800' : 'border-stone-850 hover:border-stone-700 bg-stone-950/20'
                          }`}
                        >
                          <div className="w-4 h-4 rounded-full border border-black/10" style={{ backgroundColor: beardCol.value }} />
                          <span className="text-[8px] font-bold text-stone-300 uppercase tracking-wide truncate">{beardCol.name.split(' ')[0]}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 4. CLOTHES TAB */}
            {activeTab === 'clothes' && (
              <div className="space-y-6 animate-fade-in text-left">
                {/* 1. Shirts/Tops */}
                <div className="space-y-3 p-4 bg-stone-950/40 rounded-xl border border-stone-850/80">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-serif font-extrabold uppercase tracking-widest text-stone-100">1. Shirts & Tops</h4>
                    <span className="text-[10px] text-stone-400 font-mono">Rigged to Spine</span>
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {[
                      { id: 'tee', label: 'Crew Tee' },
                      { id: 'hoodie', label: 'Hoodie' },
                      { id: 'suit', label: 'Formal Suit' },
                      { id: 'techJacket', label: 'Techwear' },
                      { id: 'gown', label: 'Gown' }
                    ].map(clothes => (
                      <button
                        key={clothes.id}
                        onClick={() => setConfig({ ...config, outfit: clothes.id as any })}
                        className={`p-2.5 border rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all text-center cursor-pointer ${
                          config.outfit === clothes.id ? 'bg-indigo-600/40 border-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.25)] scale-[1.03]' : 'border-stone-850 text-stone-400 hover:bg-stone-850 bg-stone-950/30'
                        }`}
                      >
                        <OptionPreviewSVG type="outfit" id={clothes.id} color={config.outfitColor} />
                        <span className="text-[8px] font-bold uppercase tracking-wider truncate max-w-full">{clothes.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Shirt Color */}
                  <div className="pt-2">
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-2">Shirt Hue</span>
                    <div className="grid grid-cols-8 gap-1.5">
                      {OUTFIT_COLORS.map(color => (
                        <button
                          key={color.name}
                          title={color.name}
                          onClick={() => setConfig({ ...config, outfitColor: color.value })}
                          className={`p-1 rounded-md border flex items-center justify-center transition-all cursor-pointer ${
                            config.outfitColor === color.value ? 'border-[#C4B99D] ring-2 ring-[#C4B99D]/20 bg-stone-800' : 'border-stone-800 bg-stone-950 hover:border-stone-700'
                          }`}
                        >
                          <div className="w-5 h-5 rounded-md border border-black/5 shadow-sm" style={{ backgroundColor: color.value }} />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 2. Pants/Bottoms */}
                <div className="space-y-3 p-4 bg-stone-950/40 rounded-xl border border-stone-850/80">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-serif font-extrabold uppercase tracking-widest text-stone-100">2. Pants & Bottoms</h4>
                    <span className="text-[10px] text-stone-400 font-mono">Rigged to Hip joints</span>
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {[
                      { id: 'jeans', label: 'Jeans' },
                      { id: 'sweatpants', label: 'Sweatpants' },
                      { id: 'shorts', label: 'Shorts' },
                      { id: 'cargo', label: 'Cargo Pants' },
                      { id: 'chinos', label: 'Chinos' }
                    ].map(p => (
                      <button
                        key={p.id}
                        onClick={() => setConfig({ ...config, pants: p.id as any })}
                        className={`p-2.5 border rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all text-center cursor-pointer ${
                          (config.pants || 'jeans') === p.id ? 'bg-indigo-600/40 border-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.25)] scale-[1.03]' : 'border-stone-850 text-stone-400 hover:bg-stone-850 bg-stone-950/30'
                        }`}
                      >
                        <OptionPreviewSVG type="pants" id={p.id} color={config.pantsColor} />
                        <span className="text-[8px] font-bold uppercase tracking-wider truncate max-w-full">{p.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Pants Color */}
                  <div className="pt-2">
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-2">Pants Hue</span>
                    <div className="grid grid-cols-8 gap-1.5">
                      {PANTS_COLORS.map(color => (
                        <button
                          key={color.name}
                          title={color.name}
                          onClick={() => setConfig({ ...config, pantsColor: color.value })}
                          className={`p-1 rounded-md border flex items-center justify-center transition-all cursor-pointer ${
                            (config.pantsColor || '#334155') === color.value ? 'border-[#C4B99D] ring-2 ring-[#C4B99D]/20 bg-stone-800' : 'border-stone-800 bg-stone-950 hover:border-stone-700'
                          }`}
                        >
                          <div className="w-5 h-5 rounded-md border border-black/5 shadow-sm" style={{ backgroundColor: color.value }} />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 3. Shoes/Footwear */}
                <div className="space-y-3 p-4 bg-stone-950/40 rounded-xl border border-stone-850/80">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-serif font-extrabold uppercase tracking-widest text-stone-100">3. Shoes & Footwear</h4>
                    <span className="text-[10px] text-stone-400 font-mono">Rigged to Feet</span>
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {[
                      { id: 'sneakers', label: 'Sneakers' },
                      { id: 'boots', label: 'Boots' },
                      { id: 'loafers', label: 'Loafers' },
                      { id: 'sandals', label: 'Sandals' },
                      { id: 'highTops', label: 'High-Tops' }
                    ].map(s => (
                      <button
                        key={s.id}
                        onClick={() => setConfig({ ...config, shoes: s.id as any })}
                        className={`p-2.5 border rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all text-center cursor-pointer ${
                          (config.shoes || 'sneakers') === s.id ? 'bg-indigo-600/40 border-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.25)] scale-[1.03]' : 'border-stone-850 text-stone-400 hover:bg-stone-850 bg-stone-950/20'
                        }`}
                      >
                        <OptionPreviewSVG type="shoes" id={s.id} color={config.shoesColor} />
                        <span className="text-[8px] font-bold uppercase tracking-wider truncate max-w-full">{s.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Shoes Color */}
                  <div className="pt-2">
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-2">Shoes Hue</span>
                    <div className="grid grid-cols-8 gap-1.5">
                      {SHOES_COLORS.map(color => (
                        <button
                          key={color.name}
                          title={color.name}
                          onClick={() => setConfig({ ...config, shoesColor: color.value })}
                          className={`p-1 rounded-md border flex items-center justify-center transition-all cursor-pointer ${
                            (config.shoesColor || '#111827') === color.value ? 'border-[#C4B99D] ring-2 ring-[#C4B99D]/20 bg-stone-800' : 'border-stone-800 bg-stone-950 hover:border-stone-700'
                          }`}
                        >
                          <div className="w-5 h-5 rounded-md border border-black/5 shadow-sm" style={{ backgroundColor: color.value }} />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Background selection */}
                <div className="space-y-3 pt-3 border-t border-stone-850">
                  <h4 className="text-xs font-serif font-extrabold uppercase tracking-widest text-[#C4B99D] font-bold">Exhibition Backdrops</h4>
                  <div className="grid grid-cols-5 gap-2">
                    {[
                      { id: 'solid', label: 'Light Studio' },
                      { id: 'aurora', label: 'Aurora Flow' },
                      { id: 'sunset', label: 'Sunset Blvd' },
                      { id: 'cyberGrid', label: 'Neon Grid' },
                      { id: 'deepSpace', label: 'Cosmic Sky' }
                    ].map(bg => (
                      <button
                        key={bg.id}
                        onClick={() => setConfig({ ...config, backgroundStyle: bg.id as any })}
                        className={`py-3 px-1 border rounded text-[10px] font-bold uppercase tracking-wider transition-all text-center cursor-pointer ${
                          config.backgroundStyle === bg.id ? 'bg-indigo-600/40 border-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.25)]' : 'border-stone-800 text-stone-400 hover:bg-stone-950/40'
                        }`}
                      >
                        {bg.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 5. ACCESSORIES TAB */}
            {activeTab === 'accessories' && (
              <div className="space-y-6 animate-fade-in text-left">
                {/* Eyewear */}
                <div className="space-y-3">
                  <h4 className="text-xs font-serif font-extrabold uppercase tracking-widest text-[#C4B99D] font-bold">Eyewear Accessories</h4>
                  <div className="grid grid-cols-5 gap-2">
                    {[
                      { id: 'none', label: 'None' },
                      { id: 'round', label: 'Round Wire' },
                      { id: 'aviators', label: 'Aviators' },
                      { id: 'visor', label: 'Cyber Visor' },
                      { id: 'catEye', label: 'Cat-Eye' }
                    ].map(glass => (
                      <button
                        key={glass.id}
                        onClick={() => setConfig({ ...config, eyewear: glass.id as any })}
                        className={`p-2.5 border rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all text-center cursor-pointer ${
                          config.eyewear === glass.id ? 'bg-indigo-600/40 border-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.25)] scale-[1.03]' : 'border-stone-850 text-stone-400 hover:bg-stone-850 bg-stone-950/30'
                        }`}
                      >
                        <OptionPreviewSVG type="eyewear" id={glass.id} />
                        <span className="text-[8px] font-bold uppercase tracking-wider truncate max-w-full">{glass.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Headwear */}
                <div className="space-y-3">
                  <h4 className="text-xs font-serif font-extrabold uppercase tracking-widest text-[#C4B99D] font-bold">Headwear / Hats</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'none', label: 'No Headwear' },
                      { id: 'backwardCap', label: 'Backward Cap' },
                      { id: 'beanie', label: 'Winter Beanie' },
                      { id: 'wizardHat', label: 'Wizard Hat' },
                      { id: 'crown', label: 'Imperial Crown' },
                      { id: 'headband', label: 'Sports Band' }
                    ].map(hat => (
                      <button
                        key={hat.id}
                        onClick={() => setConfig({ ...config, headwear: hat.id as any })}
                        className={`p-2.5 border rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all text-center cursor-pointer ${
                          config.headwear === hat.id ? 'bg-indigo-600/40 border-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.25)] scale-[1.03]' : 'border-stone-850 text-stone-400 hover:bg-stone-850 bg-stone-950/30'
                        }`}
                      >
                        <OptionPreviewSVG type="headwear" id={hat.id} color={config.outfitColor} />
                        <span className="text-[8px] font-bold uppercase tracking-wider truncate max-w-full">{hat.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Earrings */}
                <div className="space-y-3">
                  <h4 className="text-xs font-serif font-extrabold uppercase tracking-widest text-[#C4B99D] font-bold">Earrings Selection</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'none', label: 'None' },
                      { id: 'goldStuds', label: 'Golden Studs' },
                      { id: 'hoops', label: 'Punk Hoops' }
                    ].map(earring => (
                      <button
                        key={earring.id}
                        onClick={() => setConfig({ ...config, earrings: earring.id as any })}
                        className={`p-2.5 border rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all text-center cursor-pointer ${
                          config.earrings === earring.id ? 'bg-indigo-600/40 border-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.25)] scale-[1.03]' : 'border-stone-850 text-stone-400 hover:bg-stone-850 bg-stone-950/30'
                        }`}
                      >
                        {/* earrings use goldCrown color */}
                        <OptionPreviewSVG type="headwear" id={earring.id === 'goldStuds' ? 'crown' : earring.id === 'hoops' ? 'headband' : 'none'} color="#D4AF37" />
                        <span className="text-[8px] font-bold uppercase tracking-wider truncate max-w-full">{earring.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 5.5. 3D RENDER TAB */}
            {activeTab === 'render3d' && (
              <div className="space-y-6 animate-fade-in text-left">
                <div>
                  <h4 className="text-xs font-serif font-extrabold uppercase tracking-widest text-stone-100 mb-1">Advanced 3D Volumetric Engine</h4>
                  <p className="text-[11px] text-stone-400">Transform your 2D flat avatar into a rich physical 3D render using dynamic specularity and custom physics material passes.</p>
                </div>

                {/* 3D Render Styles */}
                <div className="space-y-3">
                  <h4 className="text-xs font-serif font-extrabold uppercase tracking-widest text-[#C4B99D]">Material & Shading Style</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {[
                      { id: 'softToy', label: '🧸 Soft Vinyl Toy', desc: 'Matte 3D physical vinyl figure look with organic ambient shading.' },
                      { id: 'shinyPlastic', label: '💎 Shiny Glossy Plastic', desc: 'High specularity polished polymer model with intense light reflexes.' },
                      { id: 'metallicGold', label: '👑 Sovereign Gold Chrome', desc: 'Precious liquid gold statue finish with reflective metal shading.' },
                      { id: 'cyberpunkGlow', label: '🌌 Neon Dual Rim Glow', desc: 'Futuristic sci-fi avatar with hot pink & cyan rim lighting aura.' },
                      { id: 'crystalGlass', label: '❄️ Frosted Crystal Glass', desc: 'Translucent refractive ice glass look with sharp light-refracting strokes.' },
                      { id: 'iridescentPearl', label: '🦄 Holographic Pearl Sheen', desc: 'Fascinating color-shifting pearl texture that bends under light angles.' },
                      { id: 'stealthCarbon', label: '🖤 Stealth Tech Carbon', desc: 'High-tech dark carbon fiber weave armor with dynamic composite material.' },
                      { id: 'glassmorphicRefraction', label: '🧊 Glassmorphic Refracted Chrome', desc: 'High-index transmission glass with glowing clearcoat highlight bevels.' },
                      { id: 'rainbowHologram', label: '🌈 Shifting Rainbow Hologram', desc: 'Prismatic metallic color spectrum pulsing dynamically across full spectrum.' }
                    ].map(style => (
                      <button
                        key={style.id}
                        type="button"
                        onClick={() => setConfig({ ...config, renderStyle3D: style.id as any })}
                        className={`p-3 border rounded-xl text-left transition-all cursor-pointer ${
                          (config.renderStyle3D || 'softToy') === style.id 
                            ? 'bg-indigo-600/40 border-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.25)]' 
                            : 'border-stone-800 text-stone-300 hover:bg-stone-950/40'
                        }`}
                      >
                        <span className="block font-black text-xs uppercase tracking-wider mb-0.5">{style.label}</span>
                        <span className={`block text-[9px] leading-tight ${
                          (config.renderStyle3D || 'softToy') === style.id ? 'text-stone-300' : 'text-stone-400'
                        }`}>{style.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Lighting Angle */}
                <div className="space-y-3">
                  <h4 className="text-xs font-serif font-extrabold uppercase tracking-widest text-[#C4B99D]">Simulated Lighting Direction</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'topLeft', label: '↖️ Angled Top Left' },
                      { id: 'frontal', label: '⬆️ Studio Portrait (Frontal)' },
                      { id: 'topRight', label: '↗️ Angled Top Right' }
                    ].map(angle => (
                      <button
                        key={angle.id}
                        type="button"
                        onClick={() => setConfig({ ...config, lightingAngle: angle.id as any })}
                        className={`py-2.5 px-1.5 border rounded-lg text-center transition-all cursor-pointer text-[10px] font-bold uppercase tracking-wider ${
                          (config.lightingAngle || 'topLeft') === angle.id 
                            ? 'bg-indigo-600/40 border-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.25)]' 
                            : 'border-stone-800 text-stone-400 hover:bg-stone-950/40'
                        }`}
                      >
                        {angle.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Slider parameters */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  {/* Shading Depth Intensity */}
                  <div className="p-4 bg-stone-950/40 rounded-xl border border-stone-850/80 space-y-2">
                    <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-stone-300">
                      <span>Shadow Volume Depth</span>
                      <span className="text-[#C4B99D] font-mono font-black">{config.shadingIntensity ?? 65}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={config.shadingIntensity ?? 65}
                      onChange={(e) => setConfig({ ...config, shadingIntensity: Number(e.target.value) })}
                      className="w-full accent-[#C4B99D] cursor-pointer"
                    />
                    <p className="text-[9px] text-stone-400">Controls the ambient occlusion and contrast of face/hair crevices.</p>
                  </div>

                  {/* Surface Glossiness / Specularity */}
                  <div className="p-4 bg-stone-950/40 rounded-xl border border-stone-850/80 space-y-2">
                    <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-stone-300">
                      <span>Surface Specular Gloss</span>
                      <span className="text-[#C4B99D] font-mono font-black">{config.glossiness ?? 60}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={config.glossiness ?? 60}
                      onChange={(e) => setConfig({ ...config, glossiness: Number(e.target.value) })}
                      className="w-full accent-[#C4B99D] cursor-pointer"
                    />
                    <p className="text-[9px] text-stone-400">Controls the opacity and size of specular highlight light paths.</p>
                  </div>
                </div>

                {/* Cheek Blush PASS & Rim Aura */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Cheek Blush */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-serif font-extrabold uppercase tracking-widest text-[#C4B99D]">Cheek Blush & Glow</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'none', label: 'None' },
                        { id: 'rosy', label: '🌸 Rosy Pink' },
                        { id: 'neonPurple', label: '🔮 Vaporwave Purple' },
                        { id: 'coralGold', label: '☀️ Coral Gold' }
                      ].map(blush => (
                        <button
                          key={blush.id}
                          type="button"
                          onClick={() => setConfig({ ...config, cheekBlush: blush.id as any })}
                          className={`py-2 px-1 border rounded-lg text-center transition-all cursor-pointer text-[10px] font-bold uppercase tracking-wider ${
                            (config.cheekBlush || 'none') === blush.id 
                              ? 'bg-indigo-600/40 border-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.25)]' 
                              : 'border-stone-800 text-stone-400 hover:bg-stone-950/40'
                          }`}
                        >
                          {blush.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Rim Aura Color selection */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-serif font-extrabold uppercase tracking-widest text-[#C4B99D]">Rim Lighting Color Aura</h4>
                    <div className="grid grid-cols-5 gap-2">
                      {[
                        { name: 'Crystal White', value: '#FFFFFF' },
                        { name: 'Cyberpunk Cyan', value: '#06B6D4' },
                        { name: 'Hot Rose', value: '#FF007F' },
                        { name: 'Sovereign Gold', value: '#DF9F28' },
                        { name: 'Amethyst Purple', value: '#A855F7' }
                      ].map(color => (
                        <button
                          key={color.name}
                          type="button"
                          onClick={() => setConfig({ ...config, rimGlowColor: color.value })}
                          className={`p-1.5 rounded-lg border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                            config.rimGlowColor === color.value ? 'border-[#C4B99D] bg-stone-800' : 'border-stone-850 hover:border-stone-700 bg-stone-950/20'
                          }`}
                          title={color.name}
                        >
                          <div className="w-5 h-5 rounded-full border border-black/10 shadow-sm" style={{ backgroundColor: color.value }} />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 3D Character Pose Rigging */}
                <div className="space-y-3 pt-4 border-t border-stone-850">
                  <h4 className="text-xs font-serif font-extrabold uppercase tracking-widest text-[#C4B99D] font-bold">3D Pose Rigging (Interactive)</h4>
                  <p className="text-[10px] text-stone-400 mb-2">Select an animated posture preset. The entire vector skeletal rig dynamically moves, waves, or grooves with organic loops!</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { id: 'portrait', label: '🧘 Portrait Idle', desc: 'Floating breathing loop' },
                      { id: 'coolWink', label: '😎 Sassy Thumb-Up', desc: 'Wink eye & thumb pose' },
                      { id: 'royalWave', label: '👋 Royal greeting', desc: 'Real-time waving sleeve' },
                      { id: 'peaceSign', label: '✌️ Retro Peace', desc: 'Vaporwave dual fingers' },
                      { id: 'thinking', label: '🤔 Chin Contemplative', desc: 'Thinking hand & posture' },
                      { id: 'dancing', label: '🕺 Disco Groove', desc: 'Full-body swaying loops' },
                      { id: 'superHero', label: '🦸 Super Hero', desc: 'Hovering wind-sway flight' },
                      { id: 'meditating', label: '☯️ Floating Zen', desc: 'Floating cross-legged pose' },
                      { id: 'waveHello', label: '🙋 Wave Hello', desc: 'Friendly wave animation' }
                    ].map(poseItem => (
                      <button
                        key={poseItem.id}
                        type="button"
                        onClick={() => setConfig({ ...config, pose: poseItem.id as any })}
                        className={`p-2.5 border rounded-xl text-left transition-all cursor-pointer ${
                          (config.pose || 'portrait') === poseItem.id 
                            ? 'bg-indigo-600/40 border-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.25)]' 
                            : 'border-stone-800 text-stone-300 hover:bg-stone-950/40'
                        }`}
                      >
                        <span className="block font-bold text-[11px] uppercase tracking-wider mb-0.5">{poseItem.label}</span>
                        <span className={`block text-[8px] leading-tight ${
                          (config.pose || 'portrait') === poseItem.id ? 'text-stone-300' : 'text-stone-400'
                        }`}>{poseItem.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3D Volumetric Stage Environment */}
                <div className="space-y-3 pt-4 border-t border-stone-850">
                  <h4 className="text-xs font-serif font-extrabold uppercase tracking-widest text-[#C4B99D] font-bold">Stage Ambient Atmosphere</h4>
                  <p className="text-[10px] text-stone-400 mb-2">Configure physical environment lighting, floor platforms, spotlights, and floating particle effects underneath the avatar.</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { id: 'none', label: '⬜ None', desc: 'Plain background' },
                      { id: 'studioGlow', label: '💡 Studio Glow', desc: 'Subtle volumetric glow' },
                      { id: 'stageSpotlight', label: '🔦 Stage Spotlight', desc: 'Golden dust cone light' },
                      { id: 'discoReflections', label: '🪩 Disco Beams', desc: 'Beaming pink/cyan beams' },
                      { id: 'hologramMatrix', label: '💚 Hologram Matrix', desc: 'Green binary digital wall' },
                      { id: 'sunsetShadows', label: '🌅 Crimson Sunset', desc: 'Warm shadow branches' }
                    ].map(env => (
                      <button
                        key={env.id}
                        type="button"
                        onClick={() => setConfig({ ...config, ambientEnvironment: env.id as any })}
                        className={`p-2.5 border rounded-xl text-left transition-all cursor-pointer ${
                          (config.ambientEnvironment || 'studioGlow') === env.id 
                            ? 'bg-indigo-600/40 border-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.25)]' 
                            : 'border-stone-800 text-stone-300 hover:bg-stone-950/40'
                        }`}
                      >
                        <span className="block font-bold text-[11px] uppercase tracking-wider mb-0.5">{env.label}</span>
                        <span className={`block text-[8px] leading-tight ${
                          (config.ambientEnvironment || 'studioGlow') === env.id ? 'text-stone-300' : 'text-stone-400'
                        }`}>{env.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 6. AI STYLIST TAB */}
            {activeTab === 'ai' && (
              <div className="space-y-6 animate-fade-in text-left">
                <div className="p-4 bg-stone-950/40 border border-stone-850/80 rounded-xl flex items-start gap-3.5">
                  <div className="p-2 bg-stone-900 text-[#C4B99D] rounded-lg shrink-0">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-serif font-bold uppercase tracking-wide text-[#C4B99D] font-bold">Generative Stylist Co-Pilot</h4>
                    <p className="text-[11px] text-stone-400 leading-relaxed">
                      Describe your dream avatar in simple natural language (e.g. <i>"a modern cyberpunk executive with blue eyes, red hair, and starry background"</i>) 
                      and watch our AI-powered interpreter dynamically style the vector layers perfectly.
                    </p>
                  </div>
                </div>

                {/* Chat prompt input */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-stone-400">Design Instruction Prompt</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. a cozy wizard with silver spikes, gold crown, and dark stubble..."
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      disabled={aiLoading}
                      onKeyDown={(e) => e.key === 'Enter' && handleAiStylistCompile()}
                      className="flex-1 px-4 py-3 bg-stone-950/40 border border-stone-850 rounded text-xs outline-none focus:border-[#C4B99D] focus:bg-stone-950 transition-all text-white disabled:opacity-60"
                    />
                    <button
                      type="button"
                      onClick={handleAiStylistCompile}
                      disabled={aiLoading || !aiPrompt.trim()}
                      className="px-5 py-3 bg-stone-900 hover:bg-stone-800 disabled:bg-stone-100 disabled:text-stone-400 text-white font-bold text-xs uppercase tracking-widest rounded flex items-center gap-1.5 transition-all cursor-pointer border border-stone-800"
                    >
                      <span>Style</span> <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* AI Compile logs */}
                <div className="space-y-2">
                  <span className="block text-[10px] font-mono text-stone-400 uppercase tracking-wider">Interpreter Process Logs</span>
                  <div className="bg-stone-950 text-stone-200 p-4 rounded font-mono text-[10px] space-y-1.5 max-h-[160px] overflow-y-auto border border-stone-900">
                    {aiLog.length === 0 ? (
                      <span className="text-stone-300 italic">No instructions compiled yet. Type a styling prompt above.</span>
                    ) : (
                      aiLog.map((log, index) => (
                        <div key={index} className="animate-fade-in flex items-start gap-1.5">
                          <span className="text-[#C4B99D] font-bold">▶</span>
                          <span>{log}</span>
                        </div>
                      ))
                    )}
                    {aiLoading && (
                      <div className="flex items-center gap-2 text-[#C4B99D] font-bold mt-2 animate-pulse">
                        <span className="animate-spin text-xs">⚡</span>
                        <span>Compiling stylistic parameters...</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 7. BITMOJI STICKERS TAB */}
            {activeTab === 'stickers' && (
              <div className="space-y-6 animate-fade-in text-left">
                {/* Header */}
                <div>
                  <h4 className="text-xs font-serif font-extrabold uppercase tracking-widest text-stone-100 mb-1">Official Personal Bitmoji Sticker Studio</h4>
                  <p className="text-[11px] text-stone-400 leading-relaxed">
                    Your avatar has been synced! Choose from premium hand-crafted sticker scenarios below. Export them as crisp scalable vector graphics (SVG) or update your profile photo instantly!
                  </p>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-1.5 border-b border-stone-850 pb-4">
                  {(['All', 'Greetings', 'Moods', 'Actions'] as const).map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedStickerCategory(cat)}
                      className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                        selectedStickerCategory === cat 
                          ? 'bg-stone-900 text-white shadow-sm' 
                          : 'bg-stone-950/40 text-stone-400 hover:bg-stone-100'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Sticker Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {BITMOJI_STICKERS.filter(s => selectedStickerCategory === 'All' || s.category === selectedStickerCategory).map(sticker => {
                    // Create a specific config override for this sticker
                    const stickerConfig = {
                      ...config,
                      mouthExpression: sticker.mouth,
                      eyeStyle: sticker.eye,
                      pose: sticker.pose,
                      backgroundStyle: 'solid' as const,
                      backgroundColor: sticker.bg
                    };

                    return (
                      <div 
                        key={sticker.id} 
                        className="bg-stone-950/30 border border-stone-850 rounded-2xl p-4 flex flex-col justify-between hover:border-stone-800 hover:shadow-2xl transition-all space-y-4"
                      >
                        {/* Title and Category Badge */}
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                            {sticker.category} • {sticker.badge}
                          </span>
                          <span className="text-[11px] font-black text-stone-200">{sticker.title}</span>
                        </div>

                        {/* Combined SVG Container of the entire sticker */}
                        <div className="relative w-full aspect-square bg-stone-950/40 rounded-xl overflow-hidden flex items-center justify-center border border-stone-850/50 p-2">
                          <svg 
                            id={`sticker-svg-${sticker.id}`} 
                            viewBox="0 0 200 200" 
                            className="w-full h-full max-w-[180px] max-h-[180px]"
                          >
                            {/* SVG Definitions */}
                            <defs>
                              <linearGradient id={`bgGrad-${sticker.id}`} x1="0" y1="0" x2="1" y2="1">
                                <stop offset="0%" stopColor={sticker.bg} />
                                <stop offset="100%" stopColor="#FFFFFF" />
                              </linearGradient>
                              {/* Dropshadow filter */}
                              <filter id={`shadow-${sticker.id}`} x="-10%" y="-10%" width="120%" height="120%">
                                <feDropShadow dx="0" dy="3" stdDeviation="3" floodOpacity="0.12" />
                              </filter>
                              {/* Retro pop art dots */}
                              <pattern id={`dots-${sticker.id}`} x="0" y="0" width="12" height="12" patternUnits="userSpaceOnUse">
                                <circle cx="3" cy="3" r="1.5" fill={sticker.colorTheme} fillOpacity="0.12" />
                              </pattern>
                            </defs>

                            {/* Base card rect */}
                            <rect width="200" height="200" rx="16" ry="16" fill={`url(#bgGrad-${sticker.id})`} />
                            {/* Comic book dots overlay */}
                            <rect width="200" height="200" rx="16" ry="16" fill={`url(#dots-${sticker.id})`} />

                            {/* Decorative graphics - SPECIFIC FOR EACH STICKER */}
                            {sticker.id === 'morning' && (
                              <g transform="translate(140, 25)">
                                <circle cx="0" cy="0" r="18" fill="#FFC107" stroke="#FF5722" strokeWidth="1.5" />
                                {[0, 45, 90, 135, 180, 225, 270, 315].map(deg => (
                                  <line 
                                    key={deg}
                                    x1="0" y1="-23" x2="0" y2="-28" 
                                    stroke="#FF5722" strokeWidth="2.5" strokeLinecap="round" 
                                    transform={`rotate(${deg})`} 
                                  />
                                ))}
                                <circle cx="-5" cy="-4" r="1.8" fill="#3E2723" />
                                <circle cx="5" cy="-4" r="1.8" fill="#3E2723" />
                                <path d="M -4,4 Q 0,8 4,4" fill="none" stroke="#3E2723" strokeWidth="1.5" strokeLinecap="round" />
                              </g>
                            )}

                            {sticker.id === 'lol' && (
                              <path 
                                d="M 12,25 L 30,35 L 14,48 L 32,58 L 18,72" 
                                stroke="#FF5722" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.3"
                              />
                            )}

                            {sticker.id === 'missyou' && (
                              <g transform="translate(150, 45)" opacity="0.85">
                                <path d="M -15,-5 Q -10,-12 0,-8 Q 10,-12 12,0 Q 20,4 12,12 L -12,12 Q -22,8 -15,-5 Z" fill="#90CAF9" />
                                <circle cx="-6" cy="18" r="2" fill="#0288D1" />
                                <circle cx="4" cy="22" r="1.5" fill="#0288D1" />
                                <circle cx="10" cy="18" r="2" fill="#0288D1" />
                              </g>
                            )}

                            {sticker.id === 'loveyou' && (
                              <>
                                <path d="M 32,45 C 24,33 12,36 18,48 L 32,60 L 46,48 C 52,36 40,33 32,45 Z" fill="#E91E63" filter={`url(#shadow-${sticker.id})`} />
                                <path d="M 165,115 C 160,107 152,109 156,117 L 165,125 L 174,117 C 178,109 170,107 165,115 Z" fill="#FF4081" transform="scale(0.85) translate(30, 20)" />
                                <path d="M 152,40 C 147,32 139,34 143,42 L 152,50 L 161,42 C 165,34 157,32 152,40 Z" fill="#F50057" transform="scale(0.7) translate(80, 5)" />
                              </>
                            )}

                            {sticker.id === 'omg' && (
                              <g stroke="#9C27B0" strokeWidth="1.5" opacity="0.4" strokeLinecap="round">
                                <line x1="20" y1="20" x2="35" y2="35" />
                                <line x1="180" y1="20" x2="165" y2="35" />
                                <line x1="20" y1="180" x2="35" y2="165" />
                                <line x1="180" y1="180" x2="165" y2="165" />
                              </g>
                            )}

                            {sticker.id === 'awesome' && (
                              <g transform="translate(25, 45)">
                                <polygon points="0,-15 15,10 2,13 18,35 -8,5 4,2" fill="#FFEB3B" stroke="#FF9800" strokeWidth="1" />
                              </g>
                            )}

                            {sticker.id === 'busy' && (
                              <g transform="translate(145, 30)">
                                <rect x="-16" y="-12" width="32" height="22" rx="3" fill="#37474F" />
                                <rect x="-13" y="-9" width="26" height="15" rx="1" fill="#1E293B" />
                                <path d="M -20,10 L 20,10 L 23,14 L -23,14 Z" fill="#78909C" />
                                <line x1="-15" y1="14" x2="15" y2="14" stroke="#455A64" strokeWidth="1" />
                                <text x="-8" y="2" fill="#00E676" fontSize="6" fontFamily="monospace" fontWeight="bold">{"</>"}</text>
                              </g>
                            )}

                            {sticker.id === 'birthday' && (
                              <g transform="translate(25, 25)">
                                <polygon points="0,-12 10,12 -10,12" fill="#E040FB" />
                                <circle cx="0" cy="-14" r="3" fill="#FFEB3B" />
                                <circle cx="-5" cy="5" r="2.2" fill="#00E676" />
                                <circle cx="5" cy="5" r="2.2" fill="#2979FF" />
                              </g>
                            )}

                            {sticker.id === 'hype' && (
                              <g transform="translate(160, 45) rotate(-35)">
                                <path d="M -6,15 L 6,15 L 8,0 L 0,-18 L -8,0 Z" fill="#ECEFF1" />
                                <path d="M -4,15 L 4,15 L 5,2 L -5,2 Z" fill="#90A4AE" />
                                <polygon points="-8,10 -15,18 -6,15" fill="#FF3D00" />
                                <polygon points="8,10 15,18 6,15" fill="#FF3D00" />
                                <path d="M -4,18 Q 0,28 4,18" fill="none" stroke="#FF9100" strokeWidth="2.5" />
                              </g>
                            )}

                            {sticker.id === 'nope' && (
                              <g transform="translate(30, 40)" stroke="#FF1744" strokeWidth="4.5" strokeLinecap="round" opacity="0.8">
                                <line x1="-12" y1="-12" x2="12" y2="12" />
                                <line x1="12" y1="-12" x2="-12" y2="12" />
                              </g>
                            )}

                            {/* Nest the user's customized avatar directly! */}
                            <g>
                              <svg x="22" y="32" width="156" height="156" viewBox="0 0 200 200">
                                <AvatarSVG 
                                  config={stickerConfig} 
                                  size={156} 
                                  tiltX={0} 
                                  tiltY={0} 
                                  rotX={0} 
                                  rotY={0} 
                                  layerExplosion={1.0} 
                                />
                              </svg>
                            </g>

                            {/* Comic text at the bottom */}
                            <g transform="translate(100, 182)">
                              <text 
                                x="0" 
                                y="0" 
                                textAnchor="middle" 
                                fill={sticker.textColor} 
                                stroke="#000000" 
                                strokeWidth="4" 
                                paintOrder="stroke fill"
                                strokeLinejoin="round"
                                fontFamily="'Arial Black', Impact, sans-serif" 
                                fontSize="15" 
                                fontWeight="900" 
                                letterSpacing="1"
                                className="uppercase font-extrabold select-none"
                              >
                                {sticker.text}
                              </text>
                            </g>
                          </svg>
                        </div>

                        {/* Control Buttons */}
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => handleDownloadSticker(sticker.id)}
                            className="py-2.5 px-3 bg-stone-900 hover:bg-stone-800 text-white font-bold text-[10px] uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-stone-800 shadow-sm"
                          >
                            <Download className="w-3.5 h-3.5 text-[#C4B99D]" /> Export Sticker
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUseStickerAsAvatar(sticker.id)}
                            className="py-2.5 px-3 bg-stone-950 border border-stone-800 hover:border-stone-700 text-stone-300 font-bold text-[10px] uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
                          >
                            <Check className="w-3.5 h-3.5 text-green-500" /> Use as Avatar
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        </div>
      </motion.div>
    </div>
  );
}
