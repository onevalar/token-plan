import hashlib
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch
import automation
from package_artifacts import verify_checksums


class Artifacts(unittest.TestCase):
    def test_verified_exact_set(self):
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            (folder / 'app.exe').write_bytes(b'installer')
            sha = hashlib.sha256(b'installer').hexdigest()
            (folder / 'SHA256SUMS.txt').write_text(sha + '  app.exe\n')
            self.assertEqual(verify_checksums(folder, {'app.exe'}), {'app.exe': sha})
            with self.assertRaises(ValueError): verify_checksums(folder, {'other.exe'})
            (folder / 'app.exe').write_bytes(b'corrupt')
            with self.assertRaises(ValueError): verify_checksums(folder, {'app.exe'})

    def test_traversal_and_duplicate_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            for names in [['../outside'], ['app.exe', 'app.exe']]:
                (folder / 'SHA256SUMS.txt').write_text(''.join('0'*64 + '  ' + name + '\n' for name in names))
                with self.assertRaises(ValueError): verify_checksums(folder, set(names))

    def test_snapshot_preserves_index_and_tracks_uncommitted_code(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            def git(*args): return subprocess.check_output(['git', *args], cwd=root, text=True).strip()
            git('init', '-q'); git('config', 'user.name', 'Test'); git('config', 'user.email', 'test@example.invalid')
            (root / '.gitignore').write_text('dist/\n.env\n')
            (root / 'code.txt').write_text('original')
            git('add', '.'); git('commit', '-qm', 'initial')
            before = git('write-tree')
            (root / 'code.txt').write_text('modified')
            (root / 'new.txt').write_text('new')
            (root / '.env').write_text('must-not-upload')
            (root / 'dist').mkdir(); (root / 'dist/app').write_text('artifact')
            real_run = automation.run
            with patch.object(automation, 'ROOT', root), patch.object(automation, 'run', side_effect=lambda *a, **kw: real_run(*a, cwd=root, **kw)):
                tree = automation.snapshot()
            self.assertEqual(git('write-tree'), before)
            self.assertNotEqual(tree, before)
            self.assertEqual(git('show', tree + ':code.txt'), 'modified')
            self.assertIn('new.txt', git('ls-tree', '--name-only', tree))
            self.assertNotIn('.env', git('ls-tree', '--name-only', tree))
            self.assertNotIn('dist', git('ls-tree', '--name-only', tree))

    def test_changed_source_cannot_package(self):
        with tempfile.TemporaryDirectory() as directory:
            state = Path(directory)
            (state / 'tested.json').write_text(json.dumps({'tree': 'tested'}))
            with patch.object(automation, 'STATE', state), patch.object(automation, 'snapshot', return_value='changed'), patch.object(automation, 'prerequisites') as prerequisites:
                with self.assertRaisesRegex(ValueError, '不一致'): automation.package('1.0.0')
                prerequisites.assert_not_called()

    def test_private_package_dispatches_main_without_push(self):
        with tempfile.TemporaryDirectory() as directory:
            statefile = Path(directory) / 'state.json'
            statefile.write_text(json.dumps({'folder': '/tmp/package-unique'}))
            calls = []
            def fake_run(*args, **kwargs):
                calls.append(args)
                if args[:2] == ('git', 'rev-parse'):
                    return 'tree\n' if args[2].endswith('^{tree}') else 'a' * 40 + '\n'
            with patch.object(automation, 'run', side_effect=fake_run):
                result = automation.submit_snapshot('1.0.2', 'tree', statefile)
            self.assertEqual(result['branch'], 'main')
            self.assertEqual(result['requestID'], 'package-unique')
            self.assertTrue(any(c[:3] == ('gh', 'workflow', 'run') for c in calls))
            self.assertFalse(any(c[:2] == ('git', 'push') for c in calls))

    def test_private_package_rejects_unpublished_changes(self):
        with tempfile.TemporaryDirectory() as directory:
            statefile = Path(directory) / 'state.json'
            statefile.write_text(json.dumps({'folder': '/tmp/package-unique'}))
            with patch.object(automation, 'run', return_value='published') as run:
                with self.assertRaisesRegex(ValueError, 'main'):
                    automation.submit_snapshot('1.0.2', 'unpublished', statefile)
            self.assertFalse(any(c.args[0] == 'gh' for c in run.call_args_list))

    def test_version_cannot_inject_paths_or_shell(self):
        for version in ['../../a', '1.0.0;id', '1.0.0\n', '', 'v1.0.0']:
            with self.assertRaises(ValueError): automation.package(version)

if __name__ == '__main__': unittest.main()
