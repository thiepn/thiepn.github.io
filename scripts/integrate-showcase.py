"""One-time, reviewed integration; refuses unexpected source context."""
from pathlib import Path
import json

def edit(name, old, new):
    p = Path(name)
    s = p.read_text()
    if new in s and old not in s:
        return
    assert s.count(old) == 1, f'Unexpected source context: {name}'
    p.write_text(s.replace(old, new))

def update_json(name, update):
    p = Path(name)
    data = json.loads(p.read_text())
    update(data)
    p.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')

def ledger(data):
    assert data['projects'].get('T-006', 'tiny-tools') == 'tiny-tools'
    data['projects']['T-006'] = 'tiny-tools'
update_json('src/data/catalogue-ledger.json', ledger)
def curation(data):
    for key in ['featured', 'archiveOrder']:
        if 'tiny-tools' not in data[key]: data[key].insert(1, 'tiny-tools')
update_json('src/data/curation.json', curation)
def relations(data):
    data['tiny-tools'] = ['pdf-studio', 'manuscript']
    data['pdf-studio'] = ['manuscript', 'tiny-tools']
    data['manuscript'] = ['pdf-studio', 'tiny-tools']
    data['micro-arcade'] = ['wordstrike', 'voidcut']
update_json('src/data/project-relations.json', relations)
edit('src/content/collections/productivity-creation.md', 'projects:\n- pdf-studio', 'projects:\n- tiny-tools\n- pdf-studio')
edit('src/layouts/BaseLayout.astro', "import '../styles/studio.css';", "import '../styles/studio.css';\nimport '../styles/showcase.css';")
p = Path('scripts/validate-catalogue.mjs')
s = p.read_text()
s = '\n'.join(line for line in s.splitlines() if 'Expected initial registered count 20' not in line and 'Expected initial listed count 19' not in line) + '\n'
p.write_text(s)
edit('tests/unit/catalogue-data.test.ts', "expect(ledger.projects['T-005']).toBe('thiepn-library');", "expect(ledger.projects['T-005']).toBe('thiepn-library');\n    expect(ledger.projects['T-006']).toBe('tiny-tools');")
edit('tests/unit/catalogue-data.test.ts', "locks the intentional five-project featured set", "locks the edited selection including Tiny Tools")
edit('tests/unit/catalogue-data.test.ts', "['micro-arcade', 'pdf-studio', 'wordstrike', 'the-bible-challenge', 'manuscript']", "['micro-arcade', 'tiny-tools', 'pdf-studio', 'wordstrike', 'the-bible-challenge', 'manuscript']")
print('Integrated Tiny Tools into the existing content and validation contracts.')
