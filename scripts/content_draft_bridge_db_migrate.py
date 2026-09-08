#!/usr/bin/env python3
"""Inspect, apply, and verify the additive content draft bridge migration."""

import argparse
import json
import os
from pathlib import Path
import subprocess
from urllib.parse import urlsplit


TABLE = "content_module_draft_bridge"
EXPECTED_COLUMNS = {
    "id",
    "resourceType",
    "targetId",
    "draftId",
    "baseVersion",
    "originalUniqueValue",
    "createUserId",
    "createTime",
    "updateTime",
}


def read_env(path):
    values = {}
    for raw_line in Path(path).read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, value = line.split("=", 1)
            values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def connection_args(env):
    url = env.get("DB_URL", "")
    if not url.startswith("jdbc:mysql://"):
        raise RuntimeError("DB_URL must start with jdbc:mysql://")
    parsed = urlsplit(url[len("jdbc:"):])
    database = parsed.path.lstrip("/")
    if not parsed.hostname or not database:
        raise RuntimeError("DB_URL does not contain a MySQL host and database")
    return [
        "-h", parsed.hostname,
        "-P", str(parsed.port or 3306),
        "-u", env["DB_USERNAME"],
        database,
    ]


def mysql(args, password, sql):
    process_env = os.environ.copy()
    process_env["MYSQL_PWD"] = password
    result = subprocess.run(
        ["mysql", "--default-character-set=utf8mb4", "-N", "-B"] + args,
        input=sql.encode("utf-8"),
        env=process_env,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    if result.returncode:
        message = result.stderr.decode("utf-8", errors="replace")[:1000]
        raise RuntimeError("MySQL operation failed: " + message)
    return result.stdout.decode("utf-8").strip()


def inspect(args, password):
    table_count = int(mysql(
        args,
        password,
        "SELECT COUNT(*) FROM information_schema.tables "
        "WHERE table_schema=DATABASE() AND table_name='%s'" % TABLE,
    ))
    columns = []
    row_count = 0
    if table_count:
        columns = mysql(
            args,
            password,
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_schema=DATABASE() AND table_name='%s' ORDER BY ordinal_position" % TABLE,
        ).splitlines()
        row_count = int(mysql(args, password, "SELECT COUNT(*) FROM `%s`" % TABLE))
    return {"tableCount": table_count, "columns": columns, "rowCount": row_count}


def verify(state):
    if state["tableCount"] != 1 or set(state["columns"]) != EXPECTED_COLUMNS:
        raise RuntimeError("Content draft bridge schema is incomplete")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", choices=["inspect", "migrate", "verify"])
    parser.add_argument("--env-file", default="/etc/springboot-init/springboot-init.env")
    parser.add_argument("--sql", default=str(Path(__file__).with_name("content_module_draft_bridge.sql")))
    options = parser.parse_args()

    env = read_env(options.env_file)
    args = connection_args(env)
    password = env["DB_PASSWORD"]
    before = inspect(args, password)
    if options.mode == "inspect":
        print(json.dumps(before, ensure_ascii=False))
        return
    if options.mode == "migrate":
        if before["tableCount"] == 0:
            mysql(args, password, Path(options.sql).read_text(encoding="utf-8"))
        else:
            verify(before)
    after = inspect(args, password)
    verify(after)
    print(json.dumps(after, ensure_ascii=False))


if __name__ == "__main__":
    main()
