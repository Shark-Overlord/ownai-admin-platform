#!/usr/bin/env python3
"""Backfill original image dimensions for prompt_asset_media without external Python packages."""

import argparse
import concurrent.futures
import json
import os
import struct
import subprocess
import sys
import time
import urllib.parse
import urllib.request


PROBE_BYTES = 256 * 1024


def read_env_file(path):
    values = {}
    with open(path, "r", encoding="utf-8") as handle:
        for raw_line in handle:
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def mysql_connection(env):
    db_url = env.get("DB_URL", "")
    prefix = "jdbc:mysql://"
    if not db_url.startswith(prefix):
        raise RuntimeError("DB_URL must start with jdbc:mysql://")
    parsed = urllib.parse.urlsplit(db_url[len("jdbc:"):])
    database = parsed.path.lstrip("/")
    if not parsed.hostname or not database:
        raise RuntimeError("DB_URL does not contain a MySQL host and database")
    return {
        "host": parsed.hostname,
        "port": parsed.port or 3306,
        "database": database,
        "username": env.get("DB_USERNAME", ""),
        "password": env.get("DB_PASSWORD", ""),
    }


def run_mysql(connection, sql):
    process_env = os.environ.copy()
    process_env["MYSQL_PWD"] = connection["password"]
    command = [
        "mysql",
        "--default-character-set=utf8mb4",
        "-N",
        "-B",
        "-h",
        connection["host"],
        "-P",
        str(connection["port"]),
        "-u",
        connection["username"],
        connection["database"],
        "-e",
        sql,
    ]
    result = subprocess.run(
        command,
        env=process_env,
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        universal_newlines=True,
    )
    return result.stdout


def parse_png(data):
    if len(data) >= 24 and data[:8] == b"\x89PNG\r\n\x1a\n" and data[12:16] == b"IHDR":
        return struct.unpack(">II", data[16:24])
    return None


def parse_gif(data):
    if len(data) >= 10 and data[:6] in (b"GIF87a", b"GIF89a"):
        return struct.unpack("<HH", data[6:10])
    return None


def parse_jpeg(data):
    if len(data) < 4 or data[:2] != b"\xff\xd8":
        return None
    index = 2
    sof_markers = {0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF}
    while index + 4 <= len(data):
        if data[index] != 0xFF:
            index += 1
            continue
        while index < len(data) and data[index] == 0xFF:
            index += 1
        if index >= len(data):
            break
        marker = data[index]
        index += 1
        if marker in (0xD8, 0xD9) or 0xD0 <= marker <= 0xD7:
            continue
        if index + 2 > len(data):
            break
        segment_length = struct.unpack(">H", data[index:index + 2])[0]
        if segment_length < 2 or index + segment_length > len(data):
            break
        if marker in sof_markers and segment_length >= 7:
            height, width = struct.unpack(">HH", data[index + 3:index + 7])
            return width, height
        index += segment_length
    return None


def parse_webp(data):
    if len(data) < 30 or data[:4] != b"RIFF" or data[8:12] != b"WEBP":
        return None
    chunk = data[12:16]
    if chunk == b"VP8X" and len(data) >= 30:
        width = 1 + int.from_bytes(data[24:27], "little")
        height = 1 + int.from_bytes(data[27:30], "little")
        return width, height
    if chunk == b"VP8L" and len(data) >= 25 and data[20] == 0x2F:
        bits = int.from_bytes(data[21:25], "little")
        width = (bits & 0x3FFF) + 1
        height = ((bits >> 14) & 0x3FFF) + 1
        return width, height
    if chunk == b"VP8 " and len(data) >= 30 and data[23:26] == b"\x9d\x01\x2a":
        width, height = struct.unpack("<HH", data[26:30])
        return width & 0x3FFF, height & 0x3FFF
    return None


def parse_dimensions(data):
    for parser in (parse_png, parse_gif, parse_jpeg, parse_webp):
        dimensions = parser(data)
        if dimensions and dimensions[0] > 0 and dimensions[1] > 0:
            return dimensions
    return None


def fetch_dimensions(item):
    media_id, image_url = item
    parsed_url = urllib.parse.urlsplit(image_url)
    request_url = urllib.parse.urlunsplit((
        parsed_url.scheme,
        parsed_url.netloc,
        urllib.parse.quote(parsed_url.path, safe="/%"),
        parsed_url.query,
        parsed_url.fragment,
    ))
    for attempt in range(3):
        try:
            request = urllib.request.Request(
                request_url,
                headers={
                    "Range": "bytes=0-%d" % (PROBE_BYTES - 1),
                    "User-Agent": "OwnAI-PromptAsset-DimensionBackfill/1.0",
                },
            )
            with urllib.request.urlopen(request, timeout=20) as response:
                data = response.read(PROBE_BYTES)
            dimensions = parse_dimensions(data)
            if dimensions:
                return media_id, dimensions[0], dimensions[1], None
            return media_id, None, None, "unsupported or incomplete image header"
        except Exception as error:
            if attempt == 2:
                return media_id, None, None, str(error)
            time.sleep(0.5 * (attempt + 1))
    return media_id, None, None, "unknown error"


def load_missing_media(connection, limit):
    limit_sql = " LIMIT %d" % limit if limit else ""
    sql = """
SELECT pm.id, COALESCE(NULLIF(pa.previewMediaUrl, ''), pa.coverUrl)
FROM prompt_asset pa
JOIN prompt_asset_media pm ON pm.promptAssetId = pa.id AND pm.isDelete = 0
WHERE pa.isDelete = 0
  AND (pm.width IS NULL OR pm.height IS NULL OR pm.width <= 0 OR pm.height <= 0)
  AND COALESCE(NULLIF(pa.previewMediaUrl, ''), pa.coverUrl) IS NOT NULL
  AND (pm.cloudUrl = COALESCE(NULLIF(pa.previewMediaUrl, ''), pa.coverUrl)
    OR pm.localUrl = COALESCE(NULLIF(pa.previewMediaUrl, ''), pa.coverUrl)
    OR pm.originalUrl = COALESCE(NULLIF(pa.previewMediaUrl, ''), pa.coverUrl))
ORDER BY pm.id%s
""" % limit_sql
    rows = []
    for line in run_mysql(connection, sql).splitlines():
        media_id, image_url = line.split("\t", 1)
        rows.append((int(media_id), image_url))
    return rows


def update_dimensions(connection, results, batch_size):
    updated = 0
    for start in range(0, len(results), batch_size):
        batch = results[start:start + batch_size]
        statements = [
            "UPDATE prompt_asset_media SET width=%d, height=%d WHERE id=%d "
            "AND (width IS NULL OR height IS NULL OR width<=0 OR height<=0)" % (width, height, media_id)
            for media_id, width, height, _ in batch
        ]
        if statements:
            run_mysql(connection, ";".join(statements) + ";")
            updated += len(statements)
    return updated


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--env-file", default="/etc/springboot-init/springboot-init.env")
    parser.add_argument("--workers", type=int, default=8)
    parser.add_argument("--batch-size", type=int, default=100)
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    connection = mysql_connection(read_env_file(args.env_file))
    items = load_missing_media(connection, max(args.limit, 0))
    successes = []
    failures = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=max(1, min(args.workers, 32))) as executor:
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
        "failureSamples": [{"mediaId": item[0], "error": item[3]} for item in failures[:20]],
    }, ensure_ascii=False))
    return 0 if not failures else 2


if __name__ == "__main__":
    sys.exit(main())
