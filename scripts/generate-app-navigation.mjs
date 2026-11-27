import fs from 'node:fs/promises';
import { HUB_VISIBLE_APP_IDS } from '../src/lib/workspace/visible-apps.ts';
const read = async path => JSON.parse(await fs.readFile(new URL(path, import.meta.url), 'utf8'));
const manifest = await read('../src/generated/launch-manifest.json');
const providers = (await read('../src/data/hub-providers.json')).providers;
const appRows = HUB_VISIBLE_APP_IDS.map(id => {
  const entry = manifest.entries.find(entry => entry.id === id);
  if (!entry) throw Error('Missing visible app: ' + id);
  return { id, title: entry.title, url: entry.url, category: entry.category };
});
const approved = (provider, key) => providers.find(item => item.id === provider).actions[key];
const actionRows = [
  { id: 'notes-text', appId: 'notes', label: 'New text note', url: approved('notes', 'capture-text') },
  { id: 'notes-checklist', appId: 'notes', label: 'New checklist', url: approved('notes', 'capture-checklist') },
  { id: 'library-saved', appId: 'thiepn-library', label: 'Continue reading', url: approved('library', 'continue-in-app') },
  { id: 'tms60-study', appId: 'tms60', label: 'Study verses', url: approved('tms60', 'open') },
];
const quote = value => "'" + value.replaceAll('\\', '\\\\').replaceAll("'", "\\'") + "'";
const render = rows => rows.map(row => '  Object.freeze({\n' + Object.entries(row).map(([key, value]) => '    ' + key + ': ' + quote(value) + ',').join('\n') + '\n  }),').join('\n');
const source = "/* Generated from Hub launch manifest and visibility policy. Do not edit. */\nexport const NAVIGATION_VERSION = 1;\nexport const HUB_URL = 'https://thiepn.dev/';\nexport const APPS = Object.freeze([\n" + render(appRows) + "\n]);\nexport const ACTIONS = Object.freeze([\n" + render(actionRows) + "\n]);\n";
const target = new URL('../src/lib/app-navigation/catalogue.mjs', import.meta.url);
if (process.argv.includes('--check')) {
  if (await fs.readFile(target, 'utf8') !== source) throw Error('Stale app-navigation catalogue');
} else await fs.writeFile(target, source);
