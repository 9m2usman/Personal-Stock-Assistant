import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useTheme } from '../context/ThemeContext.tsx';
import { Cpu, CheckCircle2, Sparkles } from 'lucide-react';

interface AiNetwork3DProps {
  status?: 'idle' | 'processing' | 'done';
  height?: number;
}

export const AiNetwork3D: React.FC<AiNetwork3DProps> = ({ status = 'idle', height = 240 }) => {
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

    const width = container.clientWidth || 360;
    const sceneHeight = height;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, width / sceneHeight, 0.1, 1000);
    camera.position.z = 150;

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

    const group = new THREE.Group();
    scene.add(group);

    // Node network vertices
    const nodeCount = 38;
    const nodes: THREE.Vector3[] = [];
    const radius = 60;

    for (let i = 0; i < nodeCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = Math.cbrt(Math.random()) * radius;
      const sinPhi = Math.sin(phi);
      nodes.push(
        new THREE.Vector3(
          r * sinPhi * Math.cos(theta),
          r * sinPhi * Math.sin(theta),
          r * Math.cos(phi)
        )
      );
    }

    // Node spheres
    const nodeGeometry = new THREE.BufferGeometry().setFromPoints(nodes);
    const nodeColor = theme === 'dark' ? 0x20c997 : 0x078c69;
    const nodeMaterial = new THREE.PointsMaterial({
      color: nodeColor,
      size: status === 'processing' ? 4.5 : 3.2,
      transparent: true,
      opacity: 0.85,
    });
    const pointCloud = new THREE.Points(nodeGeometry, nodeMaterial);
    group.add(pointCloud);

    // Interconnecting lines between close nodes
    const linePositions: number[] = [];
    for (let i = 0; i < nodeCount; i++) {
      for (let j = i + 1; j < nodeCount; j++) {
        const dist = nodes[i].distanceTo(nodes[j]);
        if (dist < 32) {
          linePositions.push(nodes[i].x, nodes[i].y, nodes[i].z);
          linePositions.push(nodes[j].x, nodes[j].y, nodes[j].z);
        }
      }
    }

    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
    const lineColor = theme === 'dark' ? 0x22c98a : 0x078c69;
    const lineMaterial = new THREE.LineBasicMaterial({
      color: lineColor,
      transparent: true,
      opacity: theme === 'dark' ? 0.35 : 0.25,
    });
    const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
    group.add(lines);

    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const speed = status === 'processing' ? 0.9 : 0.25;

      group.rotation.y += delta * speed;
      group.rotation.x += delta * speed * 0.4;

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
  }, [status, theme, height]);

  if (!webGLSupported) {
    return (
      <div
        style={{ height }}
        className="flex flex-col items-center justify-center p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] text-center space-y-2"
      >
        <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
          <Cpu className="w-5 h-5" />
        </div>
        <div className="text-xs font-semibold text-[var(--text-primary)]">
          {status === 'processing' ? 'Synthesizing Institutional Intelligence...' : 'INKVECTOR Neural Analytics Mesh'}
        </div>
        <div className="text-[11px] text-[var(--text-muted)]">
          2D Telemetry Active • Low-Power Execution Safe
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)]">
      <div ref={containerRef} style={{ height }} className="w-full flex items-center justify-center" />
      <div className="absolute bottom-2 left-3 flex items-center gap-2 pointer-events-none">
        <span className="flex h-2 w-2 relative">
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              status === 'processing' ? 'bg-amber-400' : 'bg-emerald-400'
            }`}
          />
          <span
            className={`relative inline-flex rounded-full h-2 w-2 ${
              status === 'processing' ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
          />
        </span>
        <span className="text-[10px] font-mono uppercase tracking-wider font-semibold text-[var(--text-secondary)]">
          {status === 'processing' ? 'AI Inference & Tool Pipeline Active' : 'AI Reasoning Mesh Ready'}
        </span>
      </div>
      <div className="absolute top-2 right-3 pointer-events-none flex items-center gap-1.5 text-[10px] text-[var(--text-muted)]">
        <Sparkles className="w-3 h-3 text-emerald-400" />
        <span>Three.js 3D Engine</span>
      </div>
    </div>
  );
};
