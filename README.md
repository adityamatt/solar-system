# Solar System Relativity

A Three.js + Vite visualization of the solar system with an interactive 3D lattice that approximates how mass changes the shape of nearby space. The simulation starts from real astronomical state data and renders planets, moons, orbits, illumination, and a navigable camera around the Sun.

[Try it live](https://adityamatt.github.io/solar-system/)

## Features

- Real-time 3D solar system rendered with Three.js.
- Sun, planets, Saturn rings, and moons modeled as reusable celestial-body classes.
- Ephemeris-based body positions initialized from the current simulation date.
- Elliptical orbit/path rendering with optional visibility controls.
- Relativity-inspired lattice compression tied to gravitational influence.
- Virtualized grid rendering for smoother zooming across large scales.
- Distance-based illumination controls, including non-linear brightness scaling.
- Collapsible HUD with editable simulation, lighting, orbit, and grid settings.
- Movable camera and visible 3D coordinate system.

## Development

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
```

Deploys are handled by GitHub Actions on every push to `main`.
