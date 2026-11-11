# INKVECTOR — 3D VISUALIZATION SPECIFICATION

## 1. Overview & Purpose

INKVECTOR utilizes Three.js (v0.187.0) to deliver purposeful, hardware-accelerated 3D telemetry experiences. 3D elements are deployed strictly where spatial depth enhances institutional understanding:

1. **Global Financial Market Hub Globe (`GlobalMarketGlobe3D.tsx`)**:
   - Represents the physical distribution of global financial centers (New York, London, Tokyo, Zurich, Singapore, Frankfurt).
   - Displays real-time trading session status (`OPEN` vs `CLOSED`) and latitude/longitude geographic markers.
   - Connected via illuminated bezier connection arcs representing transatlantic and transpacific financial conduits.
   - Accessible on the Overview Dashboard and Markets Discovery workspace.

2. **AI Reasoning Neural Node Mesh (`AiNetwork3D.tsx`)**:
   - Deployed at the top of the AI Financial Assistant workspace.
   - Features 38 spatial vertices interconnected with dynamic line segments.
   - Reacts to real-time AI processing states:
     - `idle`: Gentle rotational speed (0.25 rad/s) with emerald illumination.
     - `processing`: Heightened rotational speed (0.9 rad/s), pulsing vertex sizes, and amber active execution indicator.
     - `done`: Smooth decelerating transition back to resting state.

3. **Institutional Security Core (`AuthVisual3D.tsx`)**:
   - Deployed within the Authentication modal and Onboarding wizard.
   - Composed of a central wireframe Icosahedron enclosed by an outer Octahedron and floating particle cloud.
   - Symbolizes institutional audit logging and end-to-end cryptographic data integrity.

---

## 2. Performance & Low-Power Engineering

All 3D components adhere to strict performance safeguards:
- **Renderer Settings**: Initialized with `alpha: true, antialias: true, powerPreference: 'low-power'`.
- **Pixel Ratio Clamping**: Clamped to `Math.min(window.devicePixelRatio, 1.5)` to protect high-DPI screens from unnecessary GPU load.
- **Resize Observers**: Window resize listeners dynamically update camera aspect ratios (`camera.aspect`) and projection matrices (`updateProjectionMatrix()`).
- **Memory Disposal**: On component unmount, all geometry, materials, and renderer DOM elements are explicitly traversed and disposed (`renderer.dispose()`, `cancelAnimationFrame`).
- **WebGL Fallback**: If WebGL context creation fails or if the user enables `prefers-reduced-motion`, all 3D components automatically render a high-contrast 2D fallback telemetry widget.
