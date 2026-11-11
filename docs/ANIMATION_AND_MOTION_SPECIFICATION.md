# INKVECTOR — ANIMATION AND MOTION DESIGN SPECIFICATION

## 1. Principles of Motion

Motion in INKVECTOR is designed with financial restraint and purposeful feedback:
1. **Never Obstruct Financial Information**: Animations must not delay the presentation of market prices, quotes, or table rows.
2. **Predictable Durations**: Standard transitions are scoped between 180ms and 300ms using cubic-bezier easing (`cubic-bezier(0.16, 1, 0.3, 1)`).
3. **Hardware Acceleration**: Transitions animate `transform` and `opacity` properties to prevent costly layout recalculations.
4. **Accessibility Compliance**: Full honoring of `prefers-reduced-motion: reduce`. When detected, all transitions snap to 0.01ms duration.

---

## 2. Motion Presets & Timings

### 2.1 Route & View Transitions (`.animate-fade-in`)
- **Duration**: 250ms
- **Timing Function**: `cubic-bezier(0.16, 1, 0.3, 1)`
- **Behavior**: Subtle opacity fade-in with a 4px upward translation (`translateY(4px) -> translateY(0)`).
- **Usage**: Applied across view switches in `App.tsx` and modal entrances.

### 2.2 Sidebar Collapse & Expand
- **Duration**: 300ms
- **Timing Function**: `ease-in-out`
- **Behavior**: Smooth width transition between `w-64` (256px) and `w-20` (80px) with icon centering and label fade-out.

### 2.3 Command Palette & Modal Backdrops
- **Duration**: 200ms
- **Behavior**: Background backdrop blur (`backdrop-blur-sm`) with soft scale (`scale-95` to `scale-100`).

### 2.4 Three.js Mesh Rotations
- **Global Market Globe**: Smooth rotational velocity `0.002 rad/frame`.
- **AI Neural Mesh**: Idle speed `0.25 rad/s`; active processing speed `0.9 rad/s`.
- **Auth Geometric Core**: Smooth dual-axis rotation `0.3 rad/s`.

---

## 3. Reduced Motion Support

Configured globally in `src/frontend/src/index.css`:
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```
All Three.js components check `window.matchMedia('(prefers-reduced-motion: reduce)').matches` on initialization. If true, the WebGL loop is halted and an accessible, static 2D high-contrast telemetry card is rendered instead.
