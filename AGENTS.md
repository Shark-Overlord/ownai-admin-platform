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
- Keep `main` for an explicitly requested production release.
- Inspect the worktree before editing and stage only files belonging to the
  current task. Never use an unscoped `git add .` in a dirty worktree.
- Define backend contracts first, then update `web-admin/` and
  `web-frontend/` as needed and test both against the local backend.
- Do not reset or delete existing database data. Use compatible incremental
  migrations.
- Never force-push `main`.

### Branch naming

| Prefix | When to use |
| --- | --- |
| `feat/xxx` | New feature, branched from `develop`, merged back to `develop` |
| `fix/xxx` | Bug fix, branched from `develop`, merged back to `develop` |
| `hotfix/xxx` | Urgent production fix, branched from `main`, merged to `main` then synced back to `develop` |
| `codex/*` | Auto-created by AI coding tools (Codex etc.), treated same as `feat/*` |

### Commit message format

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: 添加积分充值配置页
fix: 修复订单回调状态不更新
hotfix: 修复生产环境支付回调 500
chore: 更新依赖版本
docs: 补充支付回调说明
refactor: 重构用户权限校验逻辑
```

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
- Only deploy when the user explicitly requests it, and only the modules the user specifies (backend / web-admin / web-frontend).
- Before deploying, ensure the relevant module builds successfully locally.
- Deploy directly via SSH using the alias `ownai` (`deploy@101.200.91.81`, key `~/.ssh/springboot_init_github_actions`).

### Deployment steps per module

Use `deploy.ps1` at the repo root. It handles backup → build → upload → verify → rollback output automatically.

```powershell
# 仅部署后端
.\deploy.ps1 -Backend

# 仅部署管理后台
.\deploy.ps1 -Admin

# 仅部署用户前台
.\deploy.ps1 -Frontend

# 组合部署
.\deploy.ps1 -Backend -Admin
.\deploy.ps1 -Backend -Admin -Frontend
```

- Record the development commit, release commit, backup directory, validation results, hashes, and an executable rollback command for every release.
- Never sync Windows-generated static files with a bare `rsync -a`; preserve server-readable directory and file permissions as described in the runbook.
