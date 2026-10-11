#!/usr/bin/env python3
"""Owner-run, read-only-by-default acceptance of original Actions generated-review ZIPs.

No workflow dispatch, pull-request mutation, git commit/push or deployment. Only an
explicit --apply on a clean local review/generated-* branch may stage files.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import subprocess
import sys
import urllib.request
import zipfile

REPO = "thiepn/thiepn.github.io"
API = "https://api.github.com/repos/" + REPO + "/"
HEX = re.compile(r"^[0-9a-f]{40}$")
DIGEST = re.compile(r"^sha256:([0-9a-f]{64})$")
SAFE_PATH = re.compile(r"^[A-Za-z0-9._/-]+$")
MAX_ZIP = 100 * 1024 * 1024
MAX_PATCH = 64 * 1024 * 1024
MAX_MANIFEST = 256 * 1024
PROFILES = {
    "brand-icons": ("public/favicon-32x32.png", "public/apple-touch-icon.png", "public/icon-192.png", "public/icon-512.png"),
    "capture-hub-media": ("src/assets/hub", "src/generated/hub-media.json"),
    "capture-previews": ("public/projects",),
    "capture-project-media": ("public/projects/the-bible-challenge", "public/projects/pdf-studio", "public/projects/wordstrike", "public/projects/micro-arcade", "public/projects/voidcut", "src/generated"),
    "og-assets": ("public/og", "src/generated/og-raster-manifest.json"),
    "refresh-generated": ("src/generated", "public/og"),
}
ERROR = "Generated artifact acceptance rejected: "


def require(condition, message):
    if not condition:
        raise ValueError(message)


def sha256(raw):
    return hashlib.sha256(raw).hexdigest()


def pairs_no_duplicates(pairs):
    out = {}
    for key, value in pairs:
        require(key not in out, "Duplicate JSON field: " + key)
        out[key] = value
    return out


def canonical_path(name, profile):
    require(isinstance(name, str) and bool(SAFE_PATH.fullmatch(name)), "Invalid path syntax")
    require(not name.startswith("/") and not name.endswith("/"), "Absolute/empty path")
    parts = name.split("/")
    require(all(p not in ("", ".", "..", ".git") for p in parts), "Unsafe path segment")
    require(any(name == parent or name.startswith(parent + "/") for parent in PROFILES[profile]),
            "Path outside the approved generator output profile: " + name)
    return name


def read_zip(zip_path):
    require(zip_path.is_file(), "ZIP file not found")
    require(zip_path.stat().st_size <= MAX_ZIP, "ZIP exceeds byte limit")
    raw = zip_path.read_bytes()
    with zipfile.ZipFile(zip_path) as archive:
        entries = archive.infolist()
        require(len(entries) == 2 and {x.filename for x in entries} == {"manifest.json", "review.patch"},
                "Unexpected archive entries; expected exactly manifest.json and review.patch")
        for entry in entries:
            kind = (entry.external_attr >> 16) & 0o170000
            require(kind in (0, stat.S_IFREG) and not entry.is_dir(), "Unsafe ZIP file type")
            require(entry.file_size <= (MAX_MANIFEST if entry.filename == "manifest.json" else MAX_PATCH),
                    "Uncompressed file exceeds limit")
            require(entry.compress_type in (zipfile.ZIP_STORED, zipfile.ZIP_DEFLATED), "Unsupported ZIP compression")
        # ZipFile.read verifies CRC-32. SHA-256 is separately verified against GitHub.
        manifest_raw = archive.read("manifest.json")
        patch = archive.read("review.patch")
    manifest = json.loads(manifest_raw.decode("utf-8"), object_pairs_hook=pairs_no_duplicates)
    require(isinstance(manifest, dict), "Manifest must be an object")
    return raw, manifest, patch


def git(cwd, *args, input_bytes=None):
    p = subprocess.run(["git", *args], cwd=cwd, input=input_bytes, capture_output=True)
    if p.returncode != 0:
        raise ValueError("git " + args[0] + " rejected operation: " +
                         p.stderr.decode("utf-8", errors="replace")[:450])
    return p.stdout


def check_patch(manifest, patch):
    require(manifest.get("schema") == "thiepn-hub-generated-review-v1", "Unknown manifest schema")
    profile = manifest.get("profile")
    require(profile in PROFILES, "Unrecognized profile")
    base = manifest.get("baseSha")
    require(isinstance(base, str) and bool(HEX.fullmatch(base)), "Invalid manifest base SHA")
    require(type(manifest.get("patchBytes")) is int and manifest["patchBytes"] == len(patch),
            "Patch byte count mismatch")
    require(manifest.get("sha256") == sha256(patch), "Patch SHA-256 mismatch")
    files = manifest.get("files")
    require(isinstance(files, list), "Invalid files array")
    require(type(manifest.get("changed")) is bool and manifest["changed"] == bool(files),
            "Changed flag mismatch")
    require(bool(patch) == bool(files), "Patch/manifest emptiness mismatch")
    require(len(files) <= 2000, "Too many generated output paths")
    validated = []
    for f in files:
        require(isinstance(f, dict) and set(f) == {"path", "status"}, "Invalid file record")
        require(f["status"] in ("A", "M", "D"), "Unsupported change kind")
        validated.append((canonical_path(f["path"], profile), f["status"]))
    require(len({p for p, _ in validated}) == len(validated), "Duplicate file")
    # M4 uses --no-renames and --binary. Reject all other git patch forms.
    headers = []
    for line in patch.splitlines():
        if line.startswith(b"diff --git "):
            match = re.fullmatch(rb"diff --git a/([A-Za-z0-9._/-]+) b/\1", line)
            require(match is not None, "Malformed/escaped/unsafe diff path")
            p = match.group(1).decode("ascii")
            canonical_path(p, profile)
            headers.append((p, "M"))
        elif line.startswith((b"rename ", b"copy ", b"old mode ", b"new mode ",
                               b"similarity index ", b"dissimilarity index ")):
            raise ValueError("Unsupported mode/rename/copy operation")
        elif line.startswith((b"new file mode ", b"deleted file mode ")):
            require(bool(headers), "Mode record outside diff")
            require(line.endswith(b"100644"), "Only regular non-executable file modes are supported")
            p, _ = headers[-1]
            headers[-1] = (p, "A" if line.startswith(b"new file") else "D")
    require(sorted(headers) == sorted(validated), "Patch paths/statuses do not match manifest")
    require(bool(headers) == bool(patch), "Unexpected non-diff bytes")
    return profile, base, validated


def gh_read(endpoint):
    require(endpoint.startswith(("actions/runs/", "actions/artifacts/")), "Unexpected API endpoint")
    token = os.environ.get("GH_TOKEN") or os.environ.get("GITHUB_TOKEN")
    headers = {"Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28",
               "User-Agent": "THIEPN-local-generated-asset-review"}
    if token:
        headers["Authorization"] = "Bearer " + token
    req = urllib.request.Request(API + endpoint, headers=headers)
    with urllib.request.urlopen(req, timeout=15) as response:
        require(response.geturl().startswith(API), "Unexpected API redirect")
        require(response.status == 200, "GitHub metadata read failed")
        raw = response.read(512 * 1024 + 1)
        require(len(raw) <= 512 * 1024, "Oversized GitHub API response")
    return json.loads(raw)


def verify_provenance(zip_raw, manifest, run_id, artifact_id, read_json):
    require(type(run_id) is int and run_id > 0 and type(artifact_id) is int and artifact_id > 0,
            "Valid run and artifact IDs are mandatory")
    run = read_json("actions/runs/" + str(run_id))
    require(run.get("id") == run_id, "Workflow run ID mismatch")
    require(run.get("head_sha") == manifest["baseSha"], "Workflow source SHA mismatch")
    require(run.get("head_branch") == "main" and run.get("event") in ("push", "workflow_dispatch"),
            "Artifact must come from canonical main generation")
    require(run.get("status") == "completed" and run.get("conclusion") == "success",
            "Artifact source workflow was not successful")
    require(run.get("path") == ".github/workflows/" + manifest["profile"] + ".yml",
            "Unexpected generating workflow")
    artifact = read_json("actions/artifacts/" + str(artifact_id))
    require(artifact.get("id") == artifact_id and artifact.get("name") ==
            "generated-review-" + manifest["profile"], "Wrong GitHub artifact identity")
    require(artifact.get("expired") is False, "Artifact is expired or expiry is unknown")
    require(artifact.get("workflow_run", {}).get("id") == run_id, "Artifact belongs to another run")
    require(artifact.get("workflow_run", {}).get("head_sha") == manifest["baseSha"],
            "Artifact provenance SHA differs")
    require(artifact.get("size_in_bytes") == len(zip_raw), "Original archive size mismatch")
    digest = artifact.get("digest")
    require(isinstance(digest, str) and bool(DIGEST.fullmatch(digest)), "Missing GitHub artifact SHA-256 digest")
    require(digest == "sha256:" + sha256(zip_raw), "Original ZIP differs from GitHub-attested digest")
    return {"runId": run_id, "artifactId": artifact_id, "zipSha256": sha256(zip_raw)}


def verify_local(cwd, expected_sha, manifest, files, patch, apply=False, confirmation=None):
    require(isinstance(expected_sha, str) and bool(HEX.fullmatch(expected_sha)), "Explicit 40-char expected SHA required")
    require(expected_sha == manifest["baseSha"], "Expected SHA differs from artifact source")
    require(git(cwd, "rev-parse", "HEAD").decode().strip() == expected_sha, "Local checkout is not the source SHA")
    branch = git(cwd, "symbolic-ref", "--quiet", "--short", "HEAD").decode().strip()
    require(branch.startswith("review/generated-") and branch not in ("main", "master"),
            "Must use a dedicated review/generated-* branch, never main")
    require(git(cwd, "status", "--porcelain", "-z") == b"", "Review worktree/index must be clean")
    for filename, _ in files:
        current = cwd
        for part in filename.split("/"):
            current = current / part
            require(not current.is_symlink(), "Output destination traverses a symlink")
    if patch:
        git(cwd, "apply", "--check", "--index", "--binary", "--whitespace=nowarn", "-", input_bytes=patch)
    if apply:
        require(confirmation == expected_sha, "Applying requires --confirm-sha matching the source SHA")
        require(os.environ.get("CI") != "true" and os.environ.get("GITHUB_ACTIONS") != "true",
                "Application is disabled in CI/Actions; use a local owner-controlled branch")
        if patch:
            git(cwd, "apply", "--index", "--binary", "--whitespace=nowarn", "-", input_bytes=patch)
            status = git(cwd, "diff", "--cached", "--no-renames", "--name-status", "-z").decode().split("\0")
            status = [x for x in status if x]
            require(sorted((status[i + 1], status[i]) for i in range(0, len(status), 2)) ==
                    sorted(files), "Applied changes differ from validated manifest")
    return {"reviewBranch": branch, "staged": bool(apply and patch), "fileCount": len(files)}


def accept(zip_path, cwd, expected_sha, run_id, artifact_id, apply=False, confirmation=None, read_json=gh_read):
    zip_raw, manifest, patch = read_zip(Path(zip_path))
    profile, base, files = check_patch(manifest, patch)
    require(base == expected_sha, "Expected SHA is not manifest source")
    provenance = verify_provenance(zip_raw, manifest, run_id, artifact_id, read_json)
    result = verify_local(Path(cwd).resolve(), expected_sha, manifest, files, patch, apply, confirmation)
    return {"schema": "thiepn-hub-asset-acceptance-v1", "profile": profile, "baseSha": base,
            "patchSha256": manifest["sha256"], "files": manifest["files"],
            **provenance, **result}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--zip", required=True, help="Original ZIP from a specific GitHub Actions run")
    parser.add_argument("--expected-base", required=True, help="Exact 40-character source SHA")
    parser.add_argument("--run-id", required=True, type=int)
    parser.add_argument("--artifact-id", required=True, type=int)
    parser.add_argument("--repo-path", default=".")
    parser.add_argument("--apply", action="store_true", help="Stage approved patch on clean local review branch")
    parser.add_argument("--confirm-sha", help="Repeat exact source SHA to authorize --apply")
    args = parser.parse_args()
    try:
        result = accept(args.zip, args.repo_path, args.expected_base, args.run_id,
                        args.artifact_id, args.apply, args.confirm_sha)
        print(json.dumps(result, indent=2))
        print("Review only: no commit, push, PR, release, or production mutation.", file=sys.stderr)
    except (ValueError, OSError, KeyError, zipfile.BadZipFile, UnicodeError,
            subprocess.SubprocessError) as exc:
        print(ERROR + str(exc), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
