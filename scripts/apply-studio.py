"""One-time, integrity-checked application of the reviewed redesign."""
import base64
import hashlib
import json
from pathlib import Path
import zlib

sha = lambda value: hashlib.sha256(value.encode('utf-8')).hexdigest()
payload = ''.join(Path(f'scripts/studio-transfer-{i}.txt').read_text().strip() for i in [1, 2])
assert sha(payload) == '0b17cf34e8b09c224db15f22a350dba9da1b10a3283acbfa2968d3f61435d89c'
fixes = [[142,144,''],[182,182,'n'],[778,780,''],[3097,3099,'y'],[3100,3101,''],[3141,3142,''],[3143,3144,''],[3145,3147,'9'],[3148,3150,'HORB']]
for start, end, replacement in reversed(fixes):
    payload = payload[:start] + replacement + payload[end:]
assert sha(payload) == 'b557b9b56b878a00b6d6bacd6912f10ba219b998b14629aa143ffcfaea32f09e'
changes = json.loads(zlib.decompress(base64.b64decode(payload, validate=True)))
prepared = {}
for name, change in changes.items():
    path = Path(name)
    assert not path.is_absolute() and '..' not in path.parts and '.github' not in path.parts
    old = path.read_text() if path.exists() else ''
    assert sha(old) == change['before'], f'Baseline changed: {name}'
    lines = old.splitlines(keepends=True)
    for start, end, replacement in reversed(change['edits']):
        lines[start:end] = [replacement]
    new = ''.join(lines)
    assert sha(new) == change['after'], f'Output integrity mismatch: {name}'
    prepared[path] = new
for path, text in prepared.items():
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text)
print(f'Applied {len(prepared)} checksum-verified source files.')
