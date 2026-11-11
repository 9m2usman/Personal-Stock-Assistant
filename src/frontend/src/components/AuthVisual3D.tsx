import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useTheme } from '../context/ThemeContext.tsx';
import { ShieldCheck, Zap } from 'lucide-react';

export const AuthVisual3D: React.FC<{ height?: number }> = ({ height = 480 }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [webGLSupported, setWebGLSupported] = useState(true);
  const { theme } = useTheme();

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setWebGLSupported(false);
      return;
    }

    if (!containerRef.current) return;
    const container = containerRef.current;

    // Check WebGL availability
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        setWebGLSupported(false);
        return;
      }
    } catch {
      setWebGLSupported(false);
      return;
    }

    const width = container.clientWidth || 400;
    const sceneHeight = height;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / sceneHeight, 0.1, 1000);
    camera.position.z = 180;

    let renderer: THREE.WebGLRenderer | null = null;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
      renderer.setSize(width, sceneHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      container.appendChild(renderer.domElement);
    } catch {
      setWebGLSupported(false);
      return;
    }

    const masterGroup = new THREE.Group();
    scene.add(masterGroup);

    // 1. Central Icosahedron Wireframe Core
    const icoGeo = new THREE.IcosahedronGeometry(42, 1);
    const icoWire = new THREE.WireframeGeometry(icoGeo);
    const icoMat = new THREE.LineBasicMaterial({
      color: theme === 'dark' ? 0x20c997 : 0x078c69,
      transparent: true,
      opacity: 0.65,
    });
    const coreMesh = new THREE.LineSegments(icoWire, icoMat);
    masterGroup.add(coreMesh);

    // 2. Outer Octahedron
    const octGeo = new THREE.OctahedronGeometry(65, 0);
    const octWire = new THREE.WireframeGeometry(octGeo);
    const octMat = new THREE.LineBasicMaterial({
      color: theme === 'dark' ? 0x69a8f5 : 0x3978c6,
      transparent: true,
      opacity: 0.35,
    });
    const outerMesh = new THREE.LineSegments(octWire, octMat);
    masterGroup.add(outerMesh);

    // 3. Floating Data Particles Ring
    const particleCount = 120;
    const particlePositions: number[] = [];
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const radius = 80 + (Math.random() - 0.5) * 20;
      const x = Math.cos(angle) * radius;
      const y = (Math.random() - 0.5) * 30;
      const z = Math.sin(angle) * radius;
      particlePositions.push(x, y, z);
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.Float32BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: theme === 'dark' ? 0x22c98a : 0x078c69,
      size: 2.2,
      transparent: true,
      opacity: 0.75,
    });
    const particleCloud = new THREE.Points(particleGeo, particleMat);
    masterGroup.add(particleCloud);

    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();

      coreMesh.rotation.x += delta * 0.3;
      coreMesh.rotation.y += delta * 0.45;

      outerMesh.rotation.x -= delta * 0.15;
      outerMesh.rotation.z += delta * 0.25;

      particleCloud.rotation.y += delta * 0.2;

      if (renderer) renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container || !renderer) return;
      const newWidth = container.clientWidth;
      camera.aspect = newWidth / sceneHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, sceneHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      if (renderer && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer?.dispose();
    };
  }, [theme, height]);

  if (!webGLSupported) {
    return (
      <div
        style={{ height }}
        className="w-full h-full flex flex-col items-center justify-center p-8 bg-[var(--bg-secondary)] text-center space-y-4"
      >
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
          <Zap className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-[var(--text-primary)]">Institutional Intelligence</h3>
          <p className="text-xs text-[var(--text-secondary)] max-w-xs">
            Secured end-to-end financial analytics with validated real-time data pipelines.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-gradient-to-b from-[var(--bg-secondary)] via-[var(--bg-main)] to-[var(--bg-card)]">
      <div ref={containerRef} style={{ height }} className="w-full flex items-center justify-center" />
      <div className="absolute top-6 left-6 flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
          <ShieldCheck className="w-4 h-4" />
        </div>
        <span className="text-xs font-mono font-bold tracking-wider text-[var(--text-primary)]">
          SEC-GRADE ENCRYPTION & AUDIT LOGS
        </span>
      </div>
      <div className="absolute bottom-6 left-6 right-6 p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)]/80 backdrop-blur-md">
        <div className="text-xs font-semibold text-[var(--text-primary)]">INKVECTOR Autonomous Core</div>
        <div className="text-[11px] text-[var(--text-secondary)]">
          Real-time cross-asset valuation, 3-statement financial accounting, and sandboxed scenario simulation.
        </div>
      </div>
    </div>
  );
};
