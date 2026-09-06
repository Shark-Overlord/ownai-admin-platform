# OwnAI deployment

This repository contains all three production applications:

- Spring Boot API in the repository root.
- Public React frontend in `web-frontend/`.
- Admin React frontend in `web-admin/`.

Production runs on `101.200.91.81`. A push to `main` triggers
`.github/workflows/deploy.yml`, which builds and deploys all three applications.

| Application | Public address | Production path |
| --- | --- | --- |
| Public frontend | `https://ownai.icu` | `/www/wwwroot/ownai` |
| Admin frontend | `https://admin.ownai.icu` | `/www/wwwroot/springboot-init-admin` |
| API | `/api` on both sites | `/opt/springboot-init/app.jar` |

The backend listens on `127.0.0.1:8011` through `springboot-init.service`.
Runtime secrets remain in `/etc/springboot-init/springboot-init.env` and must not
be committed.

The canonical development, release, verification, and rollback process is
documented in
[`docs/OWNAI_DEVELOPMENT_AND_DEPLOYMENT.md`](docs/OWNAI_DEVELOPMENT_AND_DEPLOYMENT.md).
