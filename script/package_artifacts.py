"""Strict artifact verification shared by the one-click packager and tests."""
import hashlib
from pathlib import Path


def verify_checksums(folder: Path, required: set[str]):
    entries = {}
    for line in (folder / 'SHA256SUMS.txt').read_text().splitlines():
        digest, name = line.split(maxsplit=1)
        name = name.lstrip('*')
        if Path(name).name != name or name in entries:
            raise ValueError('Unsafe or duplicate artifact name')
        if len(digest) != 64 or any(c not in '0123456789abcdef' for c in digest):
            raise ValueError('Invalid SHA256 digest')
        entries[name] = digest
    if set(entries) != required:
        raise ValueError(f'Unexpected artifact set: {set(entries)}; expected {required}')
    for name, expected in entries.items():
        file = folder / name
        if file.is_symlink() or not file.is_file():
            raise ValueError(f'Missing artifact: {name}')
        with file.open('rb') as stream:
            actual = hashlib.file_digest(stream, 'sha256').hexdigest()
        if actual != expected:
            raise ValueError(f'Checksum mismatch: {name}')
    return entries
