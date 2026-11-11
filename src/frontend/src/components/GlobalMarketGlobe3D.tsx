import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Globe, Activity, Eye, Zap } from 'lucide-react';
import { useTheme } from '../context/ThemeContext.tsx';

interface Hub {
  name: string;
  mic: string;
  lat: number;
  lon: number;
  status: 'OPEN' | 'CLOSED';
}

const HUBS: Hub[] = [
  { name: 'New York (XNYS/XNGS)', mic: 'NYC', lat: 40.7128, lon: -74.006, status: 'OPEN' },
  { name: 'London (XLON)', mic: 'LSE', lat: 51.5074, lon: -0.1278, status: 'OPEN' },
  { name: 'Tokyo (XJPX)', mic: 'TSE', lat: 35.6762, lon: 139.6503, status: 'CLOSED' },
  { name: 'Zurich (XSWX)', mic: 'SIX', lat: 47.3769, lon: 8.5417, status: 'OPEN' },
  { name: 'Singapore (XSES)', mic: 'SGX', lat: 1.3521, lon: 103.8198, status: 'CLOSED' },
  { name: 'Frankfurt (XFRA)', mic: 'FWB', lat: 50.1109, lon: 8.6821, status: 'OPEN' }
];

function latLonToVector3(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

export const GlobalMarketGlobe3D: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [webGLSupported, setWebGLSupported] = useState(true);
  const [activeHub, setActiveHub] = useState<Hub>(HUBS[0]);
  const { theme } = useTheme();

  useEffect(() => {
    // Check reduced motion
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

    const width = container.clientWidth || 320;
    const height = container.clientHeight || 260;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 210;

    let renderer: THREE.WebGLRenderer | null = null;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      container.appendChild(renderer.domElement);
    } catch (e) {
      console.warn('WebGL init failed:', e);
      setWebGLSupported(false);
      return;
    }

    // Globe group for rotation
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    // 1. Dotted Globe Sphere
    const globeRadius = 70;
    const sphereGeo = new THREE.SphereGeometry(globeRadius, 24, 24);
    const sphereMat = new THREE.PointsMaterial({
      color: theme === 'dark' ? 0x10b981 : 0x078c69,
      size: 1.5,
      transparent: true,
      opacity: theme === 'dark' ? 0.5 : 0.65,
    });
    const globePoints = new THREE.Points(sphereGeo, sphereMat);
    globeGroup.add(globePoints);

    // 2. Subtle wireframe inner sphere
    const wireGeo = new THREE.WireframeGeometry(new THREE.SphereGeometry(globeRadius - 0.5, 12, 12));
    const wireMat = new THREE.LineBasicMaterial({
      color: theme === 'dark' ? 0x064e3b : 0xa7f3d0,
      transparent: true,
      opacity: 0.25,
    });
    const wireframe = new THREE.LineSegments(wireGeo, wireMat);
    globeGroup.add(wireframe);

    // 3. Financial Hub Markers
    const hubMarkers: THREE.Mesh[] = [];
    HUBS.forEach((hub) => {
      const pos = latLonToVector3(hub.lat, hub.lon, globeRadius + 1.5);
      const markerGeo = new THREE.SphereGeometry(2.2, 8, 8);
      const markerMat = new THREE.MeshBasicMaterial({
        color: hub.status === 'OPEN' ? 0x10b981 : 0xf59e0b,
      });
      const marker = new THREE.Mesh(markerGeo, markerMat);
      marker.position.copy(pos);
      globeGroup.add(marker);
      hubMarkers.push(marker);
    });

    // 4. Connecting Arcs between major financial hubs
    const nycPos = latLonToVector3(40.7128, -74.006, globeRadius);
    const lonPos = latLonToVector3(51.5074, -0.1278, globeRadius);
    const tyoPos = latLonToVector3(35.6762, 139.6503, globeRadius);
    const zurPos = latLonToVector3(47.3769, 8.5417, globeRadius);

    const makeArc = (p1: THREE.Vector3, p2: THREE.Vector3, col: number) => {
      const mid = p1.clone().add(p2).multiplyScalar(0.5);
      const midLen = mid.length();
      mid.normalize().multiplyScalar(midLen + 20); // Lift above sphere
      const curve = new THREE.QuadraticBezierCurve3(p1, mid, p2);
      const points = curve.getPoints(24);
      const geo = new THREE.BufferGeometry().setFromPoints(points);
      const mat = new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.45 });
      return new THREE.Line(geo, mat);
    };

    globeGroup.add(makeArc(nycPos, lonPos, 0x38bdf8));
    globeGroup.add(makeArc(lonPos, tyoPos, 0x10b981));
    globeGroup.add(makeArc(lonPos, zurPos, 0xa855f7));

    // Interaction & Animation
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let animId = 0;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - prevMouseX;
      const deltaY = e.clientY - prevMouseY;
      globeGroup.rotation.y += deltaX * 0.005;
      globeGroup.rotation.x += deltaY * 0.005;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    // Animation Loop
    let ticker = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      if (!isDragging) {
        globeGroup.rotation.y += 0.0035;
      }
      ticker++;
      if (ticker % 180 === 0) {
        // Cycle active hub for tooltip display
        const nextIdx = (HUBS.indexOf(activeHub) + 1) % HUBS.length;
        setActiveHub(HUBS[nextIdx]);
      }
      renderer?.render(scene, camera);
    };
    animate();

    // Resize handling
    const onResize = () => {
      if (!container || !renderer) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // Cleanup
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      if (renderer) {
        renderer.dispose();
        if (renderer.domElement && container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
      }
      sphereGeo.dispose();
      sphereMat.dispose();
      wireGeo.dispose();
      wireMat.dispose();
    };
  }, [theme]);

  if (!webGLSupported) {
    return (
      <div className="flex flex-col items-center justify-center h-56 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)] p-6 text-center space-y-2">
        <Globe className="w-8 h-8 text-emerald-400" />
        <div className="text-xs font-bold text-[var(--text-primary)]">Global Financial Hub Network</div>
        <div className="flex flex-wrap justify-center gap-1.5 pt-2">
          {HUBS.map((h) => (
            <span
              key={h.mic}
              className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                h.status === 'OPEN'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] border border-[var(--border-subtle)]'
              }`}
            >
              {h.mic}: {h.status}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 shadow-xl overflow-hidden flex flex-col md:flex-row items-center justify-between gap-4">
      {/* Left Info Text */}
      <div className="space-y-2 max-w-sm z-10">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
            Real-Time 3D Exchange Telemetry
          </span>
        </div>
        <h3 className="text-lg font-extrabold text-[var(--text-primary)]">Global Market Synchronizer</h3>
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          Autonomous multi-exchange financial data routing across primary global settlement centers.
          Drag the 3D globe to inspect active capital liquidity channels.
        </p>

        {/* Active Hub Pill */}
        <div className="pt-1 flex items-center gap-2">
          <div className="px-2.5 py-1 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[11px] font-mono flex items-center gap-2">
            <span className="text-[var(--text-muted)]">Center:</span>
            <span className="font-bold text-[var(--text-primary)]">{activeHub.name}</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${activeHub.status === 'OPEN' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'}`}>
              {activeHub.status}
            </span>
          </div>
        </div>
      </div>

      {/* 3D Canvas Container */}
      <div
        ref={containerRef}
        className="w-full md:w-80 h-56 cursor-grab active:cursor-grabbing flex items-center justify-center relative select-none"
      >
        <div className="absolute bottom-1 right-2 text-[9px] text-[var(--text-muted)] font-mono pointer-events-none">
          Three.js WebGL · 3D Market Mesh
        </div>
      </div>
    </div>
  );
};
