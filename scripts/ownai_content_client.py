#!/usr/bin/env python3
"""Small dependency-free client for OwnAI's unified content API."""

from __future__ import annotations

import argparse
import json
import mimetypes
import os
import sys
import uuid
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


def api_base() -> str:
    raw = os.environ.get("OWNAI_BASE_URL", "").strip().rstrip("/")
    if not raw:
        raise ValueError("缺少环境变量 OWNAI_BASE_URL")
    return raw if raw.endswith("/content/v1") else raw + "/content/v1"


def api_key() -> str:
    value = os.environ.get("OWNAI_CONTENT_API_KEY", "").strip()
    if not value:
        raise ValueError("缺少环境变量 OWNAI_CONTENT_API_KEY")
    return value


def read_json(path: str) -> dict[str, Any]:
    value = json.loads(Path(path).read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError("JSON 文件顶层必须是对象")
    return value


def request(method: str, path: str, body: bytes | None = None,
            content_type: str | None = None, extra_headers: dict[str, str] | None = None) -> Any:
    headers = {"X-Content-Asset-Key": api_key(), "Accept": "application/json"}
    if content_type:
        headers["Content-Type"] = content_type
    if extra_headers:
        headers.update(extra_headers)
    req = Request(api_base() + path, data=body, headers=headers, method=method)
    try:
        with urlopen(req, timeout=120) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except HTTPError as error:
        raw = error.read().decode("utf-8", errors="replace")
        try:
            detail = json.loads(raw)
        except json.JSONDecodeError:
            detail = {"code": error.code, "message": raw or error.reason}
        raise RuntimeError(json.dumps(detail, ensure_ascii=False)) from error
    except URLError as error:
        raise RuntimeError(f"无法连接 OwnAI API: {error.reason}") from error
    if not isinstance(payload, dict) or payload.get("code") != 0:
        raise RuntimeError(json.dumps(payload, ensure_ascii=False))
    return payload


def json_request(method: str, path: str, data: dict[str, Any] | None = None,
                 headers: dict[str, str] | None = None) -> Any:
    body = None if data is None else json.dumps(data, ensure_ascii=False).encode("utf-8")
    return request(method, path, body, "application/json" if body is not None else None, headers)


def upload(path: str, biz: str) -> Any:
    source = Path(path)
    if not source.is_file():
        raise ValueError(f"文件不存在: {source}")
    boundary = "----OwnAI" + uuid.uuid4().hex
    mime = mimetypes.guess_type(source.name)[0] or "application/octet-stream"
    prefix = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="file"; filename="{source.name}"\r\n'
        f"Content-Type: {mime}\r\n\r\n"
    ).encode("utf-8")
    body = prefix + source.read_bytes() + f"\r\n--{boundary}--\r\n".encode("ascii")
    return request(
        "POST",
        "/uploads?" + urlencode({"biz": biz}),
        body,
        f"multipart/form-data; boundary={boundary}",
    )


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="OwnAI 统一内容 API 客户端")
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("capabilities", help="查看密钥能力")
    commands.add_parser("taxonomy", help="查询分类和标签")

    list_parser = commands.add_parser("list", help="分页查询资源")
    list_parser.add_argument("type")
    list_parser.add_argument("--json", dest="json_file", help="查询 JSON 文件")

    get_parser = commands.add_parser("get", help="查询资源详情和版本")
    get_parser.add_argument("type")
    get_parser.add_argument("id")

    add_parser = commands.add_parser("add", help="从 JSON 文件新增草稿")
    add_parser.add_argument("type")
    add_parser.add_argument("json_file")

    update_parser = commands.add_parser("update", help="从 JSON 文件局部更新草稿")
    update_parser.add_argument("type")
    update_parser.add_argument("id")
    update_parser.add_argument("json_file")
    update_parser.add_argument("--version", required=True, help="详情响应中的 version")

    upload_parser = commands.add_parser("upload", help="上传内容素材")
    upload_parser.add_argument("biz")
    upload_parser.add_argument("file")
    return parser


def main() -> int:
    args = build_parser().parse_args()
    if args.command == "capabilities":
        result = json_request("GET", "/capabilities")
    elif args.command == "taxonomy":
        result = json_request("GET", "/taxonomy")
    elif args.command == "list":
        query = read_json(args.json_file) if args.json_file else {"current": 1, "pageSize": 20}
        result = json_request("POST", f"/resources/{args.type}/list", query)
    elif args.command == "get":
        result = json_request("GET", f"/resources/{args.type}/{args.id}")
    elif args.command == "add":
        result = json_request("POST", f"/resources/{args.type}", read_json(args.json_file))
    elif args.command == "update":
        result = json_request(
            "PATCH",
            f"/resources/{args.type}/{args.id}",
            read_json(args.json_file),
            {"If-Match": args.version},
        )
    elif args.command == "upload":
        result = upload(args.file, args.biz)
    else:
        raise AssertionError(args.command)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (ValueError, RuntimeError) as error:
        print(str(error), file=sys.stderr)
        raise SystemExit(1)
