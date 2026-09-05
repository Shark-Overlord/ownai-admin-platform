#!/usr/bin/env bash
set -euo pipefail
release=${1:?Release directory required}
case "$release" in /opt/springboot-init/releases/community-*) ;; *) exit 1;; esac
cd "$release"
test -f app.jar.before
test -f admin.before.tar.gz
test -f rollback.sh
sha256sum -c checksums.txt
python3 community_db_migrate.py verify --release "$release"
trap 'bash "$release/rollback.sh"' ERR
cp app.jar /opt/springboot-init/app.jar.next
chown deploy:deploy /opt/springboot-init/app.jar.next
chmod 644 /opt/springboot-init/app.jar.next
mv /opt/springboot-init/app.jar.next /opt/springboot-init/app.jar
systemctl restart springboot-init
healthy=0
for attempt in $(seq 1 45); do
  result=$(curl --max-time 3 -fsS http://127.0.0.1:8011/api/user/get/login 2>/dev/null || true)
  if [[ "$result" == *'"code":40100'* ]]; then healthy=1; break; fi
  sleep 2
done
test "$healthy" = 1
for kind in category tag; do
  curl --max-time 15 -fsS "http://127.0.0.1:8011/api/community/taxonomy/$kind" > "taxonomy-$kind.json"
  python3 -c 'import json,sys; assert json.load(open(sys.argv[1]))["code"]==0' "taxonomy-$kind.json"
done
for sort in latest popular; do
  curl --max-time 15 -fsS -H 'Content-Type: application/json' -d "{\"sort\":\"$sort\"}" \
    http://127.0.0.1:8011/api/community/post/list/page > "posts-$sort.json"
  python3 -c 'import json,sys; assert json.load(open(sys.argv[1]))["code"]==0' "posts-$sort.json"
done
tar -xzf admin.tar.gz -C admin
rsync -r --no-times --no-perms --no-owner --no-group admin/assets/ /www/wwwroot/springboot-init-admin/assets/
cp admin/index.html /www/wwwroot/springboot-init-admin/index.html.next
chown deploy:deploy /www/wwwroot/springboot-init-admin/index.html.next
chmod 644 /www/wwwroot/springboot-init-admin/index.html.next
mv /www/wwwroot/springboot-init-admin/index.html.next /www/wwwroot/springboot-init-admin/index.html
curl --max-time 20 -fsS https://admin.ownai.icu/ > served-admin.html
cmp admin/index.html served-admin.html
sha256sum -c frontend-untouched.sha256
systemctl is-active springboot-init
sha256sum /opt/springboot-init/app.jar
trap - ERR
echo "Updated backend/admin; original rollback backup preserved: $release/rollback.sh"
