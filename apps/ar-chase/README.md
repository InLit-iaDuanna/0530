# Web AR Chase Demo

First-person 3D room chase prototype for browser play on desktop and mobile.

This is not WebXR, SLAM, image tracking, marker tracking, GPS AR, or camera-backed AR. The demo renders a large enclosed room in Three.js and lets you run from a chaser with simple first-person controls.

## Run Locally

```bash
cd apps/ar-chase
npm install
npm run dev
```

The dev server uses local HTTPS and binds to `0.0.0.0`, so other devices on the same Wi-Fi can open the `Network` URL printed by Vite, for example `https://192.168.x.x:5173/`.

Desktop browsers can use the controls immediately:

- Hold `W` or `ArrowUp` to run in the current facing direction.
- Drag the right side of the screen to turn.
- The on-screen forward button and joystick are visible during play.
- The top-right direction marker always points toward the chaser.

## Local HTTPS

The dev server runs with local HTTPS.

```bash
cd apps/ar-chase
npm run dev
```

Open the `https://localhost:<port>/` URL on the same machine, or the `Network` HTTPS URL printed by Vite on a phone.

Safari will warn about the self-signed certificate. Continue past the warning to reach the game.

## Browser Support

- Desktop Chrome: full play with keyboard, drag, and on-screen controls.
- iPhone Safari: full play after the local certificate warning. If orientation permission is denied, drag the right side of the screen to turn.
- Android Chrome: full play. If orientation events are unavailable, drag the right side of the screen to turn.

## Known Limits

- The chaser does not know the real room layout and can visually pass through walls if pushed too hard.
- Long sessions can heat the phone because WebGL runs continuously. Keep test runs short.

## Validation

```bash
npm run typecheck
npm run test
npm run build
npm run preview
```

Manual checks:

- Permission denial does not crash or show a blank screen.
- Desktop fallback can complete a full round.
- On mobile HTTPS, the room loads after one user tap.
- The direction marker always indicates where the chaser is, and turning around clearly reveals the beaconed chaser approaching.
- `CAUGHT` can restart without refreshing the page.
