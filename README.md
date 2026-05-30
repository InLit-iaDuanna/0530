# 0530

This repository is set up for team collaboration and currently contains a local
3D maze proof-of-concept demo.

## 3D Maze Demo

Run the local demo:

```bash
npm ci
npm run dev
```

Open the Vite URL shown in the terminal. The first screen is a full-window,
first-person maze:

- Desktop: click **点击开始**, then use WASD or arrow keys to move and the mouse
  to look around.
- Mobile or coarse-pointer devices: tap **启用体感控制**, grant motion/orientation
  permission, turn the phone to face a direction, and walk in place to move
  forward. Faster cadence maps to faster movement.
- Reach the gold wireframe exit marker to finish, then use **再来一次** or
  **重开** to reset.

## Mobile Sensor Testing

Mobile motion and orientation APIs require a secure context. The dev server uses
`@vitejs/plugin-basic-ssl`, so use the HTTPS network URL printed by Vite for
same-Wi-Fi testing.

On iOS, the self-signed certificate may need to be trusted manually in Settings
before Safari allows camera, motion, or orientation permission prompts. If that
path is unreliable, use a Cloudflare Tunnel or ngrok HTTPS URL pointed at the
Vite dev server.

Build and type-check:

```bash
npm run typecheck
npm run build
```

The demo uses `@react-three/rapier`, which loads Rapier WebAssembly at runtime.
That keeps collision behavior reliable for the proof of concept, but the wasm
payload should be treated as a known size risk if this becomes product code.

## Workflow

1. Create a branch from `main`.
2. Commit changes to your branch.
3. Push the branch to GitHub.
4. Open a pull request.
5. Merge only after review.

## Branch Names

- `feature/name` for new features
- `fix/name` for bug fixes
- `chore/name` for maintenance

## Local Setup

```bash
git clone https://github.com/InLit-iaDuanna/0530.git
cd 0530
```