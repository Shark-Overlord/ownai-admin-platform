#!/usr/bin/env bash
set -euo pipefail
release=${1:?Usage: deploy_community.sh /opt/springboot-init/releases/community-TIMESTAMP}
case "$release" in /opt/springboot-init/releases/community-*) ;; *) echo 'Invalid release directory'; exit 1;; esac
cd "$release"
admin=/www/wwwroot/springboot-init-admin
sha256sum -c checksums.txt
test ! -e app.jar.before
test ! -e admin.before.tar.gz
cp -p /opt/springboot-init/app.jar app.jar.before
tar -czf admin.before.tar.gz -C "$admin" .
sha256sum /www/wwwroot/ownai/index.html > frontend-untouched.sha256
cat > rollback.sh <<'ROLLBACK'
#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
cp -p app.jar.before /opt/springboot-init/app.jar.rollback
mv /opt/springboot-init/app.jar.rollback /opt/springboot-init/app.jar
tar -xzf admin.before.tar.gz -C /www/wwwroot/springboot-init-admin
systemctl restart springboot-init
echo 'Restored backend/admin; additive database tables and fields retained.'
ROLLBACK
chmod 700 rollback.sh
python3 community_db_migrate.py inspect --release "$release"
python3 community_db_migrate.py migrate --release "$release"
python3 community_db_migrate.py verify --release "$release" > database-verification.json
mkdir admin
tar -xzf admin.tar.gz -C admin
trap 'echo "Deployment failed; restoring backend/admin"; bash "$release/rollback.sh"' ERR
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
for sort in latest popular; do
  curl --max-time 15 -fsS -H 'Content-Type: application/json' -d "{\"current\":1,\"pageSize\":10,\"sort\":\"$sort\"}" \
    http://127.0.0.1:8011/api/community/post/list/page > "posts-$sort.json"
  python3 -c 'import json,sys; r=json.load(open(sys.argv[1])); assert r["code"]==0; print("Public post query OK:",sys.argv[1])' "posts-$sort.json"
done
for kind in category tag; do
  curl --max-time 15 -fsS "http://127.0.0.1:8011/api/community/taxonomy/$kind" > "taxonomy-$kind.json"
  python3 -c 'import json,sys; r=json.load(open(sys.argv[1])); assert r["code"]==0; print("Taxonomy query OK:",sys.argv[1])' "taxonomy-$kind.json"
done
curl --max-time 15 -fsS -H 'Content-Type: application/json' -d '{}' \
  http://127.0.0.1:8011/api/community/admin/post/list/page > admin-auth.json
python3 -c 'import json; assert json.load(open("admin-auth.json"))["code"]==40100; print("Admin authorization OK")'
curl --max-time 15 -fsS -H 'Content-Type: application/json' -d '{"ids":[]}' \
  http://127.0.0.1:8011/api/news/popup/candidate > announcement-compatibility.json
python3 -c 'import json; assert json.load(open("announcement-compatibility.json"))["code"]==0; print("Existing announcement endpoint OK")'
rsync -r --no-times --no-perms --no-owner --no-group admin/assets/ "$admin/assets/"
cp admin/favicon.svg admin/icons.svg "$admin/"
cp admin/index.html "$admin/index.html.next"
chown deploy:deploy "$admin/index.html.next"
chmod 644 "$admin/index.html.next"
mv "$admin/index.html.next" "$admin/index.html"
curl --max-time 20 -fsS https://admin.ownai.icu/ > served-admin.html
cmp admin/index.html served-admin.html
sha256sum -c frontend-untouched.sha256
systemctl is-active springboot-init
sha256sum /opt/springboot-init/app.jar
trap - ERR
echo "Completed; rollback: bash $release/rollback.sh"
