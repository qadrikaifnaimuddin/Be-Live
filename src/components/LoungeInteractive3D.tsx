/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function LoungeInteractive3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.z = window.innerWidth < 768 ? 26 : 18;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // 2. Interactive Objects (Pulsing Icosahedron points & wireframes)
    const pointsGeometry = new THREE.IcosahedronGeometry(5.2, 3);
    const wireframeGeometry = new THREE.IcosahedronGeometry(5.0, 2);
    const origPoints = pointsGeometry.attributes.position.clone();
    const origWire = wireframeGeometry.attributes.position.clone();

    // Gold/Amber points material
    const pointsMaterial = new THREE.PointsMaterial({
      color: 0xC4B99D,
      size: 0.08,
      transparent: true,
      opacity: 0.85,
    });

    const particles = new THREE.Points(pointsGeometry, pointsMaterial);
    scene.add(particles);

    // Rose/Crimson wireframe mesh material
    const wireframeMaterial = new THREE.MeshBasicMaterial({
      color: 0xE11D48,
      wireframe: true,
      transparent: true,
      opacity: 0.18,
    });

    const wireframeMesh = new THREE.Mesh(wireframeGeometry, wireframeMaterial);
    scene.add(wireframeMesh);

    // Inner core glowing sphere
    const coreGeometry = new THREE.IcosahedronGeometry(2.0, 1);
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: 0x8B5CF6,
      wireframe: true,
      transparent: true,
      opacity: 0.25,
    });
    const coreMesh = new THREE.Mesh(coreGeometry, coreMaterial);
    scene.add(coreMesh);

    // 3. Ambient Lights
    const pointLight = new THREE.PointLight(0xC4B99D, 1.5, 50);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);

    const secondaryLight = new THREE.PointLight(0xE11D48, 1, 50);
    secondaryLight.position.set(-5, -5, -5);
    scene.add(secondaryLight);

    // 4. Mouse & Touch Interaction Tracking
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const handleMouseMove = (event: MouseEvent) => {
      // Calculate normalized mouse positions (-0.5 to 0.5)
      const rect = container.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      targetX = (x / rect.width - 0.5) * 2;
      targetY = (y / rect.height - 0.5) * 2;
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (event.touches.length > 0) {
        const touch = event.touches[0];
        const rect = container.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        // Increase sensitivity on touch drag for easier interaction
        targetX = Math.max(-1.5, Math.min(1.5, (x / rect.width - 0.5) * 3));
        targetY = Math.max(-1.5, Math.min(1.5, (y / rect.height - 0.5) * 3));
      }
    };

    const handleTouchEnd = () => {
      // Return smoothly to center when released
      targetX = 0;
      targetY = 0;
    };

    window.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('touchmove', handleTouchMove, { passive: true });
    container.addEventListener('touchend', handleTouchEnd);
    container.addEventListener('touchcancel', handleTouchEnd);

    // 5. Animation Loop
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      const time = clock.getElapsedTime();

      // Smooth mouse easing (Lerp)
      mouseX += (targetX - mouseX) * 0.05;
      mouseY += (targetY - mouseY) * 0.05;

      // Calculate speed of interaction for elastic distortion
      const diffX = targetX - mouseX;
      const diffY = targetY - mouseY;
      const moveSpeed = Math.sqrt(diffX * diffX + diffY * diffY);

      // 1. Organic Undulating Wave distortion on particles
      const pointsPos = pointsGeometry.attributes.position;
      const pTemp = new THREE.Vector3();
      for (let i = 0; i < pointsPos.count; i++) {
        pTemp.fromBufferAttribute(origPoints, i);
        // Create an organic breathing wave based on coordinates, time, and interaction velocity
        const wave = Math.sin(pTemp.x * 1.5 + time * 2.2) * Math.cos(pTemp.y * 1.5 + time * 2.2) * (0.2 + moveSpeed * 0.5);
        pTemp.normalize().multiplyScalar(5.2 + wave);
        pointsPos.setXYZ(i, pTemp.x, pTemp.y, pTemp.z);
      }
      pointsPos.needsUpdate = true;

      // 2. Wireframe displacement counter-wave
      const wirePos = wireframeGeometry.attributes.position;
      const wTemp = new THREE.Vector3();
      for (let i = 0; i < wirePos.count; i++) {
        wTemp.fromBufferAttribute(origWire, i);
        const wave = Math.cos(wTemp.z * 1.8 - time * 1.8) * (0.15 + moveSpeed * 0.4);
        wTemp.normalize().multiplyScalar(5.0 + wave);
        wirePos.setXYZ(i, wTemp.x, wTemp.y, wTemp.z);
      }
      wirePos.needsUpdate = true;

      // Rotate particles & meshes
      particles.rotation.y = time * 0.08;
      particles.rotation.x = time * 0.05;
      
      wireframeMesh.rotation.y = -time * 0.12;
      wireframeMesh.rotation.x = -time * 0.06;
      
      // Rotate and pulse the beating core
      coreMesh.rotation.z = time * 0.25;
      const coreScale = 1.0 + Math.sin(time * 3.5) * 0.15;
      coreMesh.scale.set(coreScale, coreScale, coreScale);
      coreMaterial.opacity = 0.25 + Math.sin(time * 2.5) * 0.1;

      // Apply interactive displacement (tilt)
      particles.rotation.y += mouseX * 0.6;
      particles.rotation.x -= mouseY * 0.6;

      wireframeMesh.rotation.y -= mouseX * 0.4;
      wireframeMesh.rotation.x += mouseY * 0.4;

      // Pulsing scale effect based on clock sine wave
      const pulse = 1.0 + Math.sin(time * 2) * 0.06;
      particles.scale.set(pulse, pulse, pulse);
      wireframeMesh.scale.set(pulse, pulse, pulse);

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    // 6. Resize Observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: newW, height: newH } = entry.contentRect;
        if (newW > 0 && newH > 0) {
          camera.aspect = newW / newH;
          camera.updateProjectionMatrix();
          renderer.setSize(newW, newH);
        }
      }
    });
    resizeObserver.observe(container);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchEnd);
      resizeObserver.disconnect();
      
      // Dispose geometry/materials to prevent memory leaks
      pointsGeometry.dispose();
      wireframeGeometry.dispose();
      coreGeometry.dispose();
      pointsMaterial.dispose();
      wireframeMaterial.dispose();
      coreMaterial.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full min-h-[300px] flex items-center justify-center relative overflow-hidden"
    >
      <canvas ref={canvasRef} className="w-full h-full block animate-fadeIn" />
    </div>
  );
}
