# OwnAI repository rules

Before changing this repository, read
[`docs/OWNAI_DEVELOPMENT_AND_DEPLOYMENT.md`](docs/OWNAI_DEVELOPMENT_AND_DEPLOYMENT.md).

## Project layout

- `web-frontend/`: public React + Vite site, local port `5187`.
- `src/`: Spring Boot API, local port `8011`.
- `web-admin/`: admin React + Vite site, local port `5173`.
- Rules inside a nested `AGENTS.md` also apply to files in that directory.

## Development workflow

- Use `develop` for local development and integration.
- Use a `codex/*` feature branch from `develop` when work needs isolation.
- Keep `main` for an explicitly requested production release.
- Inspect the worktree before editing and stage only files belonging to the
  current task. Never use an unscoped `git add .` in a dirty worktree.
- Define backend contracts first, then update `web-admin/` and
  `web-frontend/` as needed and test both against the local backend.
- Do not reset or delete existing database data. Use compatible incremental
  migrations.

## Local verification

Run the checks relevant to the change:

```powershell
.\mvnw.cmd test

Set-Location web-admin
npm run build

Set-Location ..\web-frontend
npm run build
```

The manual COS upload test `CosManagerTest` additionally requires a root-level
`test.json` and valid local COS credentials. A missing fixture is an environment
failure and must be reported separately from product test failures.

For public UI changes, inspect desktop and 390 px mobile layouts in both themes.
For payment, points, membership, and orders, verify failure, retry, callback,
authorization, and persisted-order behavior.

## Release

- Do not deploy ordinary `develop` work.
- After explicit release authorization, merge the reviewed `develop` commit
  into `main`; the GitHub Actions workflow deploys all three modules to
  `101.200.91.81`.
- Record the development commit, release commit, backup directory, validation
  results, hashes, and an executable rollback command for every release.
- Never sync Windows-generated static files with a bare `rsync -a`; preserve
  server-readable directory and file permissions as described in the runbook.
