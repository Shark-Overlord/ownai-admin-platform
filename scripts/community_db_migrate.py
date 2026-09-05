#!/usr/bin/env python3
"""Run on the deployment host; credentials stay in its existing service environment."""
import argparse
import json
import os
from pathlib import Path
import subprocess
from urllib.parse import urlsplit

parser = argparse.ArgumentParser()
parser.add_argument('mode', choices=['inspect', 'migrate', 'verify'])
parser.add_argument('--release', required=True)
args = parser.parse_args()
env = {}
for line in Path('/etc/springboot-init/springboot-init.env').read_text().splitlines():
    if line.strip() and not line.lstrip().startswith('#') and '=' in line:
        key, value = line.split('=', 1)
        env[key.strip()] = value.strip().strip('"').strip("'")
db = urlsplit(env['DB_URL'][5:])
proc_env = dict(os.environ, MYSQL_PWD=env['DB_PASSWORD'])
connection = ['-h', db.hostname, '-P', str(db.port or 3306), '-u', env['DB_USERNAME'], db.path.lstrip('/')]

def query(sql):
    result = subprocess.run(['mysql', '--default-character-set=utf8mb4', '-N', '-B'] + connection,
                            input=sql.encode('utf-8'), env=proc_env, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if result.returncode:
        raise RuntimeError('MySQL operation failed: ' + result.stderr.decode('utf-8', errors='replace')[:1000])
    return result.stdout.decode('utf-8').strip()

table_names = ['community_category', 'community_tag', 'community_post', 'community_revision',
               'community_revision_tag', 'community_comment', 'community_like', 'community_report', 'community_rate_limit']
tables = int(query("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name IN ("
                   + ','.join("'%s'" % name for name in table_names) + ')'))
columns = int(query("SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() "
                    "AND table_name='announcement' AND column_name IN ('targetType','targetId')"))
if args.mode == 'inspect':
    print(json.dumps({'communityTables': tables, 'associationColumns': columns, 'mysqlVersion': query('SELECT VERSION()')}))
elif args.mode == 'migrate':
    if tables != 0 or columns != 0:
        raise RuntimeError('Expected unmigrated community schema; inspect partial or previous migration before continuing')
    release = Path(args.release)
    backup = release / 'announcement.before.sql'
    with backup.open('xb') as output:
        os.chmod(str(backup), 0o600)
        result = subprocess.run(['mysqldump', '--single-transaction', '--skip-lock-tables', '--no-tablespaces']
                                + connection + ['announcement', 'announcement_read', 'announcement_popup_dismissal'],
                                env=proc_env, stdout=output, stderr=subprocess.PIPE)
        if result.returncode:
            raise RuntimeError('Database backup failed; migration not started')
    query((release / 'community.sql').read_text(encoding='utf-8'))
    print('Incremental community migration complete; existing announcements were not updated')
else:
    if tables != 9 or columns != 2:
        raise RuntimeError('Incomplete community schema')
    counts = {name: int(query('SELECT COUNT(*) FROM ' + name)) for name in table_names}
    print(json.dumps({'communityTables': tables, 'associationColumns': columns, 'rows': counts,
                      'publicAnnouncements': int(query('SELECT COUNT(*) FROM announcement WHERE publicVisible=1')),
                      'popupAnnouncements': int(query('SELECT COUNT(*) FROM announcement WHERE popupEnabled=1'))}))
