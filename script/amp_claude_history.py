#!/usr/bin/env python3
"""Transfer measured Claude usage from an Amp executor without conversation content.

Export on the executor, download the JSONL privately, then import on the machine
running TokenPlan. This is an explicit transfer, not an automatic cloud sync.
"""
import argparse
import datetime as dt
import json
import os
from pathlib import Path
import re
import tempfile
import uuid


def usage_fields(value):
    result = {}
    for key in ("input_tokens", "output_tokens", "cache_read_input_tokens", "cache_creation_input_tokens"):
        number = value.get(key)
        if number is not None:
            if type(number) is not int or number < 0:
                raise ValueError("Invalid token count")
            result[key] = number
    if not {"input_tokens", "output_tokens"} <= result.keys():
        raise ValueError("Missing input/output token counts")
    cache = value.get("cache_creation")
    if isinstance(cache, dict):
        result["cache_creation"] = {}
        for key in ("ephemeral_5m_input_tokens", "ephemeral_1h_input_tokens"):
            if key in cache:
                if type(cache[key]) is not int or cache[key] < 0:
                    raise ValueError("Invalid cache token count")
                result["cache_creation"][key] = cache[key]
    if value.get("speed") in ("fast", "standard"):
        result["speed"] = value["speed"]
    advisors = []
    for item in value.get("iterations") or []:
        if item.get("type") == "advisor_message" and isinstance(item.get("model"), str):
            advisors.append(dict(usage_fields(item), type="advisor_message", model=item["model"]))
    if advisors:
        result["iterations"] = advisors
    return result


def sanitize(record):
    message = record.get("message")
    if not isinstance(message, dict) or not message.get("usage"):
        return None
    timestamp = record.get("timestamp")
    parsed = dt.datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        raise ValueError("Timestamp must include its timezone")
    if not isinstance(message.get("id"), str) or not message["id"]:
        raise ValueError("Missing message ID; cannot deduplicate")
    if not isinstance(message.get("model"), str) or not message["model"]:
        raise ValueError("Missing model")
    output = {"timestamp": timestamp, "message": {
        "id": message["id"], "model": message["model"], "usage": usage_fields(message["usage"])
    }}
    for key in ("requestId", "sessionId", "version"):
        if isinstance(record.get(key), str) and record[key]:
            output[key] = record[key]
    if type(record.get("isSidechain")) is bool:
        output["isSidechain"] = record["isSidechain"]
    return output


def read_records(paths):
    rows = []
    for path in sorted(paths):
        for index, line in enumerate(path.read_text().splitlines(), 1):
            if not line.strip():
                continue
            try:
                row = sanitize(json.loads(line))
                if row:
                    rows.append(row)
            except (ValueError, TypeError, AttributeError) as error:
                raise ValueError(f"Invalid record at {path.name}:{index}: {error}") from error
    return rows


def atomic_write(path, rows):
    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary = tempfile.mkstemp(dir=path.parent, prefix=".tokenplan-")
    try:
        with os.fdopen(descriptor, "w") as stream:
            for row in rows:
                stream.write(json.dumps(row, separators=(",", ":")) + "\n")
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def import_records(source, thread, claude_home, account, organization):
    if not re.fullmatch(r"T-[0-9a-fA-F-]{36}", thread):
        raise ValueError("Expected an Amp thread ID")
    uuid.UUID(thread[2:])
    account, organization = str(uuid.UUID(account)), str(uuid.UUID(organization))
    destination = claude_home / "projects" / "tokenplan-amp" / f"{thread}.jsonl"
    header = {"type": "tokenplan-amp-import", "threadID": thread,
              "ownerAccountUuid": account, "ownerOrganizationUuid": organization}
    # Never reassign an existing import to a different subscription account.
    previous = []
    if destination.exists():
        with destination.open() as stream:
            existing = json.loads(stream.readline())
        if existing != header:
            raise ValueError("Existing import has a different account or source")
        previous = read_records([destination])
    incoming = read_records([source])
    if not incoming:
        raise ValueError("No measured usage records; existing history was not changed")
    # Preserve distinct streaming versions for the app's maximum-token dedup rule.
    unique = {json.dumps(row, sort_keys=True): row for row in previous + incoming}
    rows = sorted(unique.values(), key=lambda row: row["timestamp"])
    atomic_write(destination, [header] + rows)
    return destination, len(rows)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    export = commands.add_parser("export", help="Run inside the Amp executor")
    export.add_argument("output", type=Path)
    export.add_argument("--claude-home", type=Path, default=Path.home() / ".claude")
    load = commands.add_parser("import", help="Run on the TokenPlan machine")
    load.add_argument("source", type=Path)
    load.add_argument("--thread", required=True)
    load.add_argument("--account", required=True, help="Claude account UUID")
    load.add_argument("--organization", required=True, help="Claude organization UUID")
    load.add_argument("--claude-home", type=Path, default=Path.home() / ".claude")
    args = parser.parse_args()
    try:
        if args.command == "export":
            rows = read_records((args.claude_home / "projects").rglob("*.jsonl"))
            if not rows:
                raise ValueError("No measured usage records found")
            atomic_write(args.output, rows)
            print(f"Exported {len(rows)} usage records; no conversation text or credentials.")
        else:
            destination, count = import_records(args.source, args.thread, args.claude_home,
                                                args.account, args.organization)
            print(f"Stored {count} usage records in {destination}. Refresh Claude in TokenPlan.")
    except (ValueError, OSError) as error:
        parser.exit(1, f"{error}\n")


if __name__ == "__main__":
    main()
