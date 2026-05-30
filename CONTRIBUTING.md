# Contributing

## Daily Flow

```bash
git checkout main
git pull origin main
git checkout -b feature/your-change
```

After making changes:

```bash
git add .
git commit -m "describe your change"
git push origin feature/your-change
```

Then open a pull request on GitHub.

## Rules

- Do not commit secrets, passwords, API keys, or `.env` files.
- Do not push directly to `main`.
- Keep pull requests focused and small enough to review.
- Make sure the project still builds before asking for review.
