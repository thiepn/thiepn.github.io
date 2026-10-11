"""M5 offline acceptance tests: no network, no account credentials, no production."""
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest import mock
import zipfile

SOURCE = Path(__file__).resolve().parents[1] / "scripts" / "accept-generated-review.py"
spec = importlib.util.spec_from_file_location("m5_accept_generated_review", SOURCE)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
RUN_ID = 424242
ARTIFACT_ID = 939393


def git(cwd, *args):
    return subprocess.run(["git", *args], cwd=cwd, check=True, capture_output=True).stdout


class ReviewFixture(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix="thiepn-m5-")
        self.root = Path(self.tmp.name)
        self.cwd = self.root / "repository"
        self.cwd.mkdir()
        git(self.cwd, "init", "-q")
        git(self.cwd, "config", "user.name", "M5 Fixture")
        git(self.cwd, "config", "user.email", "fixture@example.invalid")
        (self.cwd / "public").mkdir()
        (self.cwd / "public" / "icon-192.png").write_bytes(b"OLD\x00\xff\xfe")
        (self.cwd / "public" / "icon-512.png").write_bytes(b"DELETE\x80\x00")
        (self.cwd / "source-code.txt").write_bytes(b"ORIGINAL")
        git(self.cwd, "add", "-A")
        git(self.cwd, "commit", "-qm", "base")
        self.base = git(self.cwd, "rev-parse", "HEAD").decode().strip()
        git(self.cwd, "switch", "-q", "-c", "review/generated-icons")
        (self.cwd / "public" / "icon-192.png").write_bytes(b"NEW\xff\x00\x81")
        (self.cwd / "public" / "icon-512.png").unlink()
        (self.cwd / "public" / "icon-32x32.png").write_bytes(b"NEW\x00\x10")  # not a profile file
        (self.cwd / "public" / "favicon-32x32.png").write_bytes(b"\x89PNG\r\n\x1a\n")
        git(self.cwd, "add", "-A", "--", "public/icon-192.png", "public/icon-512.png", "public/favicon-32x32.png")
        self.patch = git(self.cwd, "diff", "--cached", "--no-renames", "--binary", "--full-index",
                         "--no-ext-diff", "--", "public/icon-192.png", "public/icon-512.png", "public/favicon-32x32.png")
        self.files = [{"path": "public/favicon-32x32.png", "status": "A"},
                      {"path": "public/icon-192.png", "status": "M"},
                      {"path": "public/icon-512.png", "status": "D"}]
        self.manifest = {
            "schema": "thiepn-hub-generated-review-v1", "profile": "brand-icons",
            "baseSha": self.base, "changed": True, "files": self.files,
            "sha256": hashlib.sha256(self.patch).hexdigest(), "patchBytes": len(self.patch),
            "replay": "Fixture generated patch"
        }
        git(self.cwd, "reset", "--hard", "HEAD")
        (self.cwd / "public" / "icon-32x32.png").unlink()
        self.zip_path = self.root / "original.zip"
        self.make_zip()
        self.run = {"id": RUN_ID, "head_sha": self.base, "head_branch": "main",
                    "status": "completed", "conclusion": "success", "event": "push",
                    "path": ".github/workflows/brand-icons.yml"}
        self.artifact = {"id": ARTIFACT_ID, "name": "generated-review-brand-icons",
                         "expired": False,
                         "workflow_run": {"id": RUN_ID, "head_sha": self.base},
                         "size_in_bytes": self.zip_path.stat().st_size,
                         "digest": "sha256:" + hashlib.sha256(self.zip_path.read_bytes()).hexdigest()}

    def tearDown(self):
        self.tmp.cleanup()

    def make_zip(self, patch=None, manifest=None, extras=None):
        with zipfile.ZipFile(self.zip_path, "w", compression=zipfile.ZIP_DEFLATED) as z:
            z.writestr("manifest.json", json.dumps(self.manifest if manifest is None else manifest))
            z.writestr("review.patch", self.patch if patch is None else patch)
            for name, contents in extras or []:
                z.writestr(name, contents)

    def api(self, url):
        return self.run if url == "actions/runs/" + str(RUN_ID) else self.artifact

    def reattest(self):
        self.artifact["size_in_bytes"] = self.zip_path.stat().st_size
        self.artifact["digest"] = "sha256:" + hashlib.sha256(self.zip_path.read_bytes()).hexdigest()

    def accept(self, apply=False, confirmation=None):
        return mod.accept(self.zip_path, self.cwd, self.base, RUN_ID, ARTIFACT_ID,
                          apply=apply, confirmation=confirmation, read_json=self.api)


class AcceptanceTests(ReviewFixture):
    def test_verify_only_preserves_worktree_and_index(self):
        out = self.accept()
        self.assertEqual(out["baseSha"], self.base)
        self.assertEqual(out["fileCount"], 3)
        self.assertFalse(out["staged"])
        self.assertEqual(git(self.cwd, "status", "--porcelain", "-z"), b"")
        self.assertEqual((self.cwd / "public" / "icon-192.png").read_bytes(), b"OLD\x00\xff\xfe")

    def test_explicit_sha_confirmation_stages_only_three_generated_paths(self):
        with mock.patch.dict(os.environ, {"CI": "false", "GITHUB_ACTIONS": "false"}):
            out = self.accept(apply=True, confirmation=self.base)
        self.assertTrue(out["staged"])
        self.assertEqual((self.cwd / "public" / "icon-192.png").read_bytes(), b"NEW\xff\x00\x81")
        self.assertFalse((self.cwd / "public" / "icon-512.png").exists())
        self.assertEqual((self.cwd / "public" / "favicon-32x32.png").read_bytes(), b"\x89PNG\r\n\x1a\n")
        self.assertEqual((self.cwd / "source-code.txt").read_bytes(), b"ORIGINAL")
        self.assertEqual(git(self.cwd, "diff", "--cached", "--name-only").decode().splitlines(),
                         sorted(f["path"] for f in self.files))
        self.assertEqual(git(self.cwd, "log", "-1", "--format=%H").decode().strip(), self.base)

    def test_no_apply_without_exact_confirm_and_in_ci(self):
        with self.assertRaisesRegex(ValueError, "confirm-sha"):
            self.accept(apply=True)
        old = os.environ.get("CI")
        try:
            os.environ["CI"] = "true"
            with self.assertRaisesRegex(ValueError, "disabled in CI"):
                self.accept(apply=True, confirmation=self.base)
        finally:
            if old is None:
                os.environ.pop("CI", None)
            else:
                os.environ["CI"] = old

    def test_untrusted_patch_hash_and_archive_hash_are_rejected(self):
        self.make_zip(patch=self.patch + b"\nattacker tamper\n")
        self.reattest()
        with self.assertRaisesRegex(ValueError, "Patch byte count mismatch"):
            self.accept()
        self.make_zip()
        self.reattest()
        self.artifact["digest"] = "sha256:" + "0" * 64
        with self.assertRaisesRegex(ValueError, "ZIP differs"):
            self.accept()

    def test_profile_scope_and_manifests_are_binding(self):
        bad = dict(self.manifest, files=[{"status": "A", "path": "secrets.txt"}])
        self.make_zip(manifest=bad)
        self.reattest()
        with self.assertRaisesRegex(ValueError, "outside"):
            self.accept()
        bad = dict(self.manifest, files=[{"status": "A", "path": "public/../secrets.txt"}])
        self.make_zip(manifest=bad)
        with self.assertRaisesRegex(ValueError, "Unsafe path segment"):
            self.accept()

    def test_github_run_provenance_and_expiration_are_binding(self):
        self.run["head_sha"] = "0" * 40
        with self.assertRaisesRegex(ValueError, "source SHA mismatch"):
            self.accept()
        self.run["head_sha"] = self.base
        self.run["conclusion"] = "failure"
        with self.assertRaisesRegex(ValueError, "not successful"):
            self.accept()
        self.run["conclusion"] = "success"
        self.artifact["expired"] = True
        with self.assertRaisesRegex(ValueError, "expired"):
            self.accept()

    def test_rejects_wrong_local_commit_and_main_branch(self):
        with self.assertRaisesRegex(ValueError, "Expected SHA is not manifest source"):
            mod.accept(self.zip_path, self.cwd, "0" * 40, RUN_ID, ARTIFACT_ID, read_json=self.api)
        git(self.cwd, "switch", "-q", "-c", "main")
        with self.assertRaisesRegex(ValueError, "dedicated"):
            self.accept()

    def test_refuses_dirty_tree_and_unsupported_zip_entry(self):
        (self.cwd / "local-change.txt").write_text("dirty")
        with self.assertRaisesRegex(ValueError, "clean"):
            self.accept()
        (self.cwd / "local-change.txt").unlink()
        self.make_zip(extras=[("../evil.txt", b"evildoer")])
        with self.assertRaisesRegex(ValueError, "Unexpected archive entries"):
            self.accept()

    def test_symlink_path_refused(self):
        # Symlink creating an allowed child path, on platforms supporting symlinks.
        target = self.cwd / "src" / "generated"
        target.parent.mkdir(exist_ok=True)
        (self.cwd / ".git" / "info" / "exclude").write_text("src/generated\n")
        target.symlink_to(self.root, target_is_directory=True)
        manifest = dict(self.manifest, profile="refresh-generated",
                        files=[{"path": "src/generated/new.json", "status": "A"}])
        with self.assertRaisesRegex(ValueError, "symlink"):
            mod.verify_local(self.cwd, self.base, manifest,
                             [("src/generated/new.json", "A")], b"")
