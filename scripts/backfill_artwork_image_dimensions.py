#!/usr/bin/env python3
"""Backfill original cover-image dimensions for artwork records."""

import argparse
import concurrent.futures
import json
import sys

from backfill_prompt_asset_image_dimensions import fetch_dimensions, mysql_connection, read_env_file, run_mysql


def load_missing_artwork(connection, limit):
    limit_sql = " LIMIT %d" % limit if limit else ""
    sql = """
SELECT id, coverUrl
FROM artwork
WHERE isDelete = 0
  AND coverUrl IS NOT NULL
  AND coverUrl <> ''
  AND (imageWidth IS NULL OR imageHeight IS NULL OR imageWidth <= 0 OR imageHeight <= 0)
ORDER BY id%s
""" % limit_sql
    rows = []
    for line in run_mysql(connection, sql).splitlines():
        artwork_id, image_url = line.split("\t", 1)
        rows.append((int(artwork_id), image_url))
    return rows


def update_dimensions(connection, results, batch_size):
    updated = 0
    for start in range(0, len(results), batch_size):
        batch = results[start:start + batch_size]
        statements = [
            "UPDATE artwork SET imageWidth=%d, imageHeight=%d WHERE id=%d "
            "AND (imageWidth IS NULL OR imageHeight IS NULL OR imageWidth<=0 OR imageHeight<=0)"
            % (width, height, artwork_id)
            for artwork_id, width, height, _ in batch
        ]
        if statements:
            run_mysql(connection, ";".join(statements) + ";")
            updated += len(statements)
    return updated


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--env-file", default="/etc/springboot-init/springboot-init.env")
    parser.add_argument("--workers", type=int, default=4)
    parser.add_argument("--batch-size", type=int, default=100)
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    connection = mysql_connection(read_env_file(args.env_file))
    items = load_missing_artwork(connection, max(args.limit, 0))
    successes = []
    failures = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=max(1, min(args.workers, 16))) as executor:
        for result in executor.map(fetch_dimensions, items):
            if result[1] and result[2]:
                successes.append(result)
            else:
                failures.append(result)

    updated = 0 if args.dry_run else update_dimensions(connection, successes, max(args.batch_size, 1))
    print(json.dumps({
        "scanned": len(items),
        "resolved": len(successes),
        "updated": updated,
        "failed": len(failures),
        "failureSamples": [{"artworkId": item[0], "error": item[3]} for item in failures[:20]],
    }, ensure_ascii=False))
    return 0 if not failures else 2


if __name__ == "__main__":
    sys.exit(main())
