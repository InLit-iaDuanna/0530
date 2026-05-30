# Agent Notes

This repository is shared by multiple people and multiple coding agents. Treat the repo as collaborative by default.

## Required Workflow

1. Start every task from the latest `main`.
2. Create a separate branch for each task.
3. Keep changes focused on the requested task.
4. Push the branch and open a pull request.
5. Do not push directly to `main`.

Example:

```bash
git checkout main
git pull origin main
git checkout -b feature/short-task-name
```

## Collaboration Rules

- Do not overwrite, revert, or delete work you did not create unless the user explicitly asks for it.
- Before editing a file with existing changes, inspect it and preserve unrelated work.
- Avoid broad refactors unless they are necessary for the task.
- Keep commits small and understandable.
- Use clear commit messages that describe the actual change.

## Safety Rules

- Never commit secrets, tokens, passwords, API keys, private keys, or `.env` files.
- If a secret is found in the repo, stop and tell the user.
- Do not add generated folders such as `node_modules`, build output, caches, or large binary files unless the user specifically asks.
- Prefer configuration examples like `.env.example` instead of real credentials.

## Pull Requests

Each pull request should include:

- What changed
- How it was tested
- Any risks or follow-up work

If tests cannot be run, say why in the pull request.

## Conflict Handling

If there is a merge conflict or unexpected remote change:

1. Fetch the latest remote state.
2. Inspect the conflicting files.
3. Preserve both people's intended work when possible.
4. Ask the user before discarding any change.

## Project Status

The protected branch is `main`. Changes should go through pull requests with review before merge.
