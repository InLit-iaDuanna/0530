# 0530

This repository is set up for team collaboration.

## Mobile Ghost Chase Demo

This repo includes a static mobile Web demo where a first-person player escapes from a ghost. Phone orientation controls the camera, and real-world stepping cadence controls player speed. The demo is designed for LAN HTTPS deployment, with each phone running an independent local game.

### Quick Start

Create a local HTTPS certificate first; see [docs/SETUP.md](docs/SETUP.md).

```bash
node scripts/serve-https.mjs
```

Open the printed LAN URL on a phone, tap the start button, grant motion/orientation permissions, and hold the phone upright while stepping in place.

Desktop development fallback:

```text
Open https://localhost:8443/?debug=1, choose desktop test mode, drag to look around, and press W/S to simulate cadence.
```

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
