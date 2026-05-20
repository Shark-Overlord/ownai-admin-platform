# Deployment

This project deploys two parts:

- Backend: Spring Boot jar, running as `springboot-init.service`
- Admin frontend: static files from `web-admin/dist`, served by Nginx

## Server paths

- Backend app: `/opt/springboot-init/app.jar`
- Backend env: `/etc/springboot-init/springboot-init.env`
- Frontend root: `/www/wwwroot/springboot-init-admin`
- Nginx config: `/www/server/panel/vhost/nginx/springboot-init-admin.conf`
- Public port: `8080`
- Backend local port: `8011`

## GitHub secret

Create one repository secret:

- `DEPLOY_SSH_KEY`: private key content from `C:\Users\xue\.ssh\springboot_init_github_actions`

## Runtime config

Copy `deploy/springboot-init.env.example` to the server env file and fill real values:

```bash
/etc/springboot-init/springboot-init.env
```

Database SQL is not stored in this repo. Import the exported SQL separately before starting the backend.

## Deploy flow

Push to `master`, or run the `Deploy Spring Boot app` workflow manually.

The workflow builds:

```bash
./mvnw -B -DskipTests package
cd web-admin && npm ci && npm run build
```

Then it uploads the backend jar and admin frontend to the server, and restarts `springboot-init`.
