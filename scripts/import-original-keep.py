#!/usr/bin/env python3
"""Import the *complete* original KEEP B3/K6 source from the supplied ZIP.

Usage (on a checkout of PR #168):
    python3 scripts/import-original-keep.py /path/to/KEEP_B3_native_hub_react_K6_candidate.zip
Only verified, original files are staged under vendor/keep-b3/. Never fetches
network resources, installs dependencies or modifies source data.
"""
from __future__ import annotations
import hashlib
import json
from pathlib import Path, PurePosixPath
import shutil
import sys
import tempfile
from zipfile import ZipFile

ARCHIVE_SHA256 = "702f59e6fc8a51c3094e0b051287cd986932c698ac53a3782a9ba6c0da04ed3d"
MANIFEST_SHA256 = "415ae18e0c1ca2ca4ac8e424a2f13fa7ff2717edcebdfc8e02c933a54ee4ee58"
ROOT = "keep_b3_native_hub_candidate/"
REQUIRED_HASHES = {
    "hub-embed/entry.tsx": "f4148f9940a892295d64fe993344eaa173ba6ddbc6f19d05c46cd0d269988fe8",
    "hub-embed/vite.config.ts": "084560c67eb08f0413c97edafc04f16b4f1e15bb7e9c9ceea5aad8eb375581c7",
    "package.json": "653e357793d1361de10003e1ac819f74b791b780ea3e7a3b821c54082356a7e5",
    "bun.lock": "b62a4df384d47672d03dfe00527bce8e6415b05db129f97967d6e82044d043ba",
}
DEST = Path(__file__).resolve().parents[1] / "vendor" / "keep-b3"

def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("Pass the exact KEEP_B3_native_hub_react_K6_candidate.zip path.")
    supplied = Path(sys.argv[1]).expanduser().resolve(strict=True)
    if not supplied.is_file() or sha(supplied.read_bytes()) != ARCHIVE_SHA256:
        raise SystemExit("REFUSED: K6 ZIP digest mismatch.")
    if DEST.exists() or DEST.is_symlink():
        raise SystemExit(f"REFUSED: destination already exists: {DEST}")
    entries: dict[str, bytes] = {}
    with ZipFile(supplied) as archive:
        for item in archive.infolist():
            if item.is_dir():
                continue
            name = item.filename
            if not name.startswith(ROOT):
                raise SystemExit(f"REFUSED: foreign ZIP entry {name}")
            relative = name.removeprefix(ROOT)
            parts = PurePosixPath(relative).parts
            if not relative or any(p in ("", ".", "..") for p in parts) or relative.startswith("/"):
                raise SystemExit(f"REFUSED: unsafe ZIP entry {name}")
            if (item.external_attr >> 16) & 0o170000 == 0o120000:
                raise SystemExit(f"REFUSED: ZIP symlink {name}")
            if relative in entries:
                raise SystemExit(f"REFUSED: duplicated ZIP entry {relative}")
            if item.file_size > 8_000_000:
                raise SystemExit(f"REFUSED: unreasonably large source entry {relative}")
            entries[relative] = archive.read(item)
    manifest_bytes = entries.get("hub-embed/SOURCE_SHA256.json")
    if manifest_bytes is None or sha(manifest_bytes) != MANIFEST_SHA256:
        raise SystemExit("REFUSED: source manifest digest mismatch.")
    manifest = json.loads(manifest_bytes)
    if not isinstance(manifest, dict) or len(manifest) != 1269:
        raise SystemExit("REFUSED: source manifest is not the complete original B3 set.")
    expected = set(manifest) | set(REQUIRED_HASHES)
    for name, digest in {**manifest, **REQUIRED_HASHES}.items():
        if not isinstance(name, str) or not isinstance(digest, str) or sha(entries.get(name, b"")) != digest:
            raise SystemExit(f"REFUSED: original KEEP file digest mismatch: {name}")
    actual_sources = {k for k in entries if k.startswith("src/")}
    if actual_sources != set(manifest):
        raise SystemExit("REFUSED: original source additions, deletions or substitutions found.")
    if len(entries) != 1288:
        raise SystemExit(f"REFUSED: expected 1,288 archive files, found {len(entries)}")
    DEST.parent.mkdir(parents=True, exist_ok=True)
    stage = Path(tempfile.mkdtemp(prefix=".keep-b3-import-", dir=DEST.parent))
    try:
        for name, data in entries.items():
            target = stage.joinpath(*PurePosixPath(name).parts)
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(data)
        # Check again before atomic promotion. Keep source IDs and bytes unchanged.
        if any(sha((stage / name).read_bytes()) != digest for name,digest in manifest.items()):
            raise RuntimeError("Stage integrity mismatch.")
        stage.rename(DEST)
    finally:
        if stage.exists():
            shutil.rmtree(stage)
    print(f"PASS: imported {len(entries)} files ({len(manifest)} exact original sources) to {DEST}")
    print("Source tree, React mount entry, lockfile and Argon2id/AES-GCM modules preserved.")
    print("No git commit, dependency install, database migration, or deployment performed.")

if __name__ == "__main__":
    main()
