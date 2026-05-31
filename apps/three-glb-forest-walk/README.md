# Three GLB Forest Walk

A Three.js first-person forest prototype that loads the provided tree and lavender GLB assets, scatters them along a walkable trail, and lets the viewer move with pointer-lock controls.

## Run

```bash
npm install
npm run dev
```

Open the Vite URL, press `进入森林`, then use `WASD` to walk, the mouse to look around, and `Shift` to move faster.

## Assets

- `public/models/tree.glb` from `树木3d模型.glb`
- `public/models/lavender.glb` from `薰衣草植物3d模型.glb`

Both source assets are large, so the scene keeps clone counts modest and uses fog to make the forest feel deeper without loading hundreds of model copies.
