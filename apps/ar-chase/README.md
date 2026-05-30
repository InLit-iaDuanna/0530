# Web AR Chase Demo

Camera-first Web AR chase prototype for iPhone Safari, Android Chrome, and desktop Chrome fallback mode.

This is not WebXR, SLAM, image tracking, marker tracking, GPS AR, or true physical-space anchoring. The demo uses the live camera as a full-screen background, renders a simple Three.js chaser over it, and approximates running away with device orientation plus step-like motion events.

## Run Locally

```bash
cd apps/ar-chase
npm install
npm run dev
```

The dev server binds to `0.0.0.0`, so other devices on the same Wi-Fi can open the `Network` URL printed by Vite, for example `http://192.168.x.x:5173/`.

Desktop browsers can use the fallback controls immediately:

- `WASD` or arrow keys move.
- Drag the right side of the screen to turn.
- The on-screen joystick appears when motion input is unavailable.

## Mobile HTTPS Preview

Camera and motion permissions require a secure context on mobile. A LAN URL from `vite --host` is enough for same-network fallback play, but it is usually not enough for iPhone Safari camera/motion permissions.

Use one of these for true-device testing:

- Cloudflare Tunnel pointed at the Vite dev server.
- ngrok pointed at the Vite dev server.
- A Vercel, Netlify, or GitHub Pages HTTPS preview.

Then open the HTTPS URL on iPhone Safari or Android Chrome and tap `开始体验`.

## Browser Support

- iPhone Safari: camera permission, iOS motion permission prompt, device orientation, fallback joystick.
- Android Chrome: camera permission, device orientation, devicemotion, fallback joystick.
- Desktop Chrome: no real camera/motion requirement; the fallback mode is playable.

Other mobile browsers are not a support target for this demo.

## Known Limits

- Walking is approximated from motion events and step-like acceleration spikes. It is not real displacement.
- The chaser does not know the real room layout and can visually pass through walls or furniture.
- Low Power Mode on iOS can reduce motion event frequency. The app falls back to joystick controls.
- Long sessions can heat the phone because the camera and WebGL run continuously. Keep test runs short.

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
- On mobile HTTPS, camera starts after one user tap.
- Turning around can reveal the chaser approaching.
- `CAUGHT` can restart without refreshing the page.
