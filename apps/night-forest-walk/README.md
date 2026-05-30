# Night Forest Walk Demo

A Vite and Three.js first-person night forest scene with procedural terrain, dense instanced trees, moonlight, fog, and a camera flashlight.

## Run

```bash
npm install
npm run dev
```

The dev server uses HTTPS so it can be opened from another device on the same network:

```text
https://<your-lan-ip>:5173/
```

If you pass a custom port, use that port in the URL.

Browsers will show a warning for the local self-signed certificate; continue past it for development.

Click `Enter forest`, then use `WASD` or arrow keys to walk. Move the mouse to look around; hold `Shift` to move faster.

## Scripts

- `npm run build` type-checks and builds the demo.
- `npm run typecheck` runs TypeScript without emitting files.
- `npm run preview` serves the production build locally.
