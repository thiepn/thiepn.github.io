"""Apply the reviewed suite-positioning changes; not a runtime dependency."""
from pathlib import Path
import json
import re

def change(name, old, new):
    p=Path(name); s=p.read_text()
    assert old in s, f'Unexpected baseline: {name}'
    p.write_text(s.replace(old,new))

families=[
('PDFs & documents','M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8M14 2v6h6M8 13h8M8 17h5',[('merge-pdf','Merge PDF'),('document-converter','Document & eBook Converter')]),
('Images & design','M4 3h16a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1M3 16l6-6 5 5 3-3 4 4M16 7h.01',[('image-converter','Image Converter'),('color-palette-generator','Palette Generator')]),
('Audio & video','M9 18V5l12-2v13M9 18a3 3 0 1 1-3-3h3M21 16a3 3 0 1 1-3-3h3',[('audio-converter','Audio Converter'),('subtitle-converter','Subtitle Converter')]),
('Files & data','M3 7V5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7M3 10h18',[('data-converter','Data Converter'),('archive-converter','Archive Converter')]),
('Text & developer','M8 5l-6 7 6 7M16 5l6 7-6 7M14 3l-4 18',[('word-counter','Word Counter'),('regex-tester','Regex Tester')]),
('Math & calculators','M4 3h16v18H4zM7 7h10M7 12h2M15 12h2M7 17h2M15 17h2',[('statistics-calculator','Statistics'),('unit-converter','Unit Converter')]),
('Devices & diagnostics','M3 3h18v13H3zM8 21h8M12 16v5M7 8h2l2 4 3-6 2 4h2',[('keyboard-test','Keyboard Test'),('browser-capability-inspector','Browser Capabilities')]),
('Time & everyday','M12 3a9 9 0 1 0 9 9 9 9 0 0 0-9-9M12 7v5l3 2',[('time-zone-converter','Time Zone'),('qr-studio','QR Studio')])]
p=Path('src/data/showcase.json');j=json.loads(p.read_text());j.pop('toolShortcuts');j['toolFamilies']=[{'label':label,'icon':icon,'tools':[{'label':name,'href':'/tools/#/tool/'+id} for id,name in tools]} for label,icon,tools in families]
j['projects']['tiny-tools'].update(line='Hundreds of tools. One place.',summary='Hundreds of browser tools for documents, images, audio, video, data, code, calculators and everyday tasks.',media='/projects/tiny-tools/showcase-suite.webp',caption='The Tiny Tools collection, with its full-toolbox search, categories and utility directory.',action='Explore Tiny Tools')
p.write_text(json.dumps(j,ensure_ascii=False,indent=2)+'\n')
change('src/pages/project/[slug].astro',"import BuildNotes from '../../components/studio/BuildNotes.astro';","import BuildNotes from '../../components/studio/BuildNotes.astro';\nimport ToolboxOverview from '../../components/studio/ToolboxOverview.astro';")
change('src/pages/project/[slug].astro','{p.slug===\'tiny-tools\'&&<nav class="project-starts" aria-label="Try a Tiny Tools task"><strong>Start with a task</strong>{showcase.toolShortcuts.map(task=><a class="action-link" href={task.href}>{task.label} <span aria-hidden="true">↗</span></a>)}</nav>}','{p.slug===\'tiny-tools\'&&<section class="studio-section" aria-labelledby="toolbox-heading"><header class="section-head"><div><h2 id="toolbox-heading">Across the toolbox</h2><p class="meta">Examples from the wider collection.</p></div><a class="action-link" href="/tools/">Explore all tools →</a></header><ToolboxOverview/></section>}')
p=Path('src/data/build-notes.json');j=json.loads(p.read_text());j['tiny-tools']['sections'][-1]={'title':'A collection built for discovery.','text':'The toolbox brings hundreds of tasks together through search, categories and directly addressable tool routes. The examples on this page span different kinds of work; the full collection remains the main destination. Office conversions and media formats have documented fidelity and browser limits.'};p.write_text(json.dumps(j,ensure_ascii=False,indent=2)+'\n')
p=Path('src/content/projects/tiny-tools.md');s=p.read_text().replace('Small tools for everyday work','Hundreds of tools in one browser toolbox').replace('Focused browser utilities for text, images, files, data and everyday tasks, without an account.','Hundreds of browser tools spanning documents, images, audio, video, files, data, code, calculators, diagnostics and everyday tasks.').replace('poster: /projects/tiny-tools/showcase.webp','poster: /projects/tiny-tools/showcase-suite.webp').replace('Start with the Text Cleaner, JSON Formatter, Image Converter or QR Studio, then use the wider collection when another task comes up.','Explore the full collection through search and categories, from PDF operations and file converters to image, audio, video, text, developer, calculator, diagnostic and everyday tools.').replace('gallery:\n','gallery:\n- label: The complete toolbox\n  caption: The real Tiny Tools collection, with search, categories and the utility directory.\n  variant: suite\n  source: /projects/tiny-tools/showcase-suite.webp\n');p.write_text(s)
for name in ['src/lib/text-preview.ts','src/scripts/text-preview.ts','tests/unit/text-preview.test.ts','tests/studio/preview-readability.spec.ts']:Path(name).unlink()
p=Path('src/styles/showcase.css');lines=[]
for line in p.read_text().splitlines():
    if re.match(r'\s*\.(tools-spotlight|tool-shortcuts|text-preview|preview-glyph)',line):continue
    lines.append(line.replace(', .text-preview *','').replace(',.tools-spotlight,.text-preview',''))
p.write_text('\n'.join(lines)+'\n')
change('scripts/validate-studio.mjs',"for(const task of config.toolShortcuts)assert(/^\\/tools\\/#\\/tool\\/[a-z0-9-]+$/.test(task.href),'Unexpected Tiny Tools shortcut');","assert(config.toolFamilies.length>=8,'Tiny Tools needs a cross-suite overview');\nfor(const family of config.toolFamilies){assert(family.tools.length>=2);for(const task of family.tools)assert(/^\\/tools\\/#\\/tool\\/[a-z0-9-]+$/.test(task.href),'Unexpected Tiny Tools shortcut');}")
change('scripts/capture-showcase-qa.mjs',"await page.locator('[data-preview-input]').fill('  Less   friction.   More   focus.  ');\nawait page.locator('#tiny-tools').screenshot({ path: `${out}/tiny-tools-live-preview.png` });\nawait page.locator('[data-preview-reset]').click();\n",'')
p=Path('tests/studio/studio.spec.ts');s=p.read_text().replace("await expect(page.locator('[data-preview-input]')).toBeDisabled();await expect(page.locator('[data-preview-output]')).toHaveValue(/A little less friction/);await expect(page.getByRole('link',{name:'Open Tiny Tools',exact:false}).first()).toBeVisible();","await expect(page.locator('#tiny-tools [data-toolbox-family]')).toHaveCount(8);await expect(page.locator('#tiny-tools textarea')).toHaveCount(0);await expect(page.getByRole('link',{name:'Explore all tools',exact:false}).first()).toBeVisible();")
a=s.index("test('Tiny Tools preview is useful,");b=s.index("for(const slug of ['tiny-tools'",a)
s=s[:a]+'''test('Tiny Tools is a suite on home, work and project',async({page})=>{
 for(const route of ['/','/project/tiny-tools/']){
  await page.goto(route);await expect(page.locator('[data-toolbox-family]')).toHaveCount(8);
  await expect(page.getByRole('link',{name:'Explore all tools',exact:false}).first()).toHaveAttribute('href','/tools/');
  for(const task of ['merge-pdf','image-converter','audio-converter','data-converter','regex-tester','statistics-calculator','keyboard-test','qr-studio'])expect(await page.locator(`a[href="/tools/#/tool/${task}"]`).count()).toBeGreaterThan(0);
 }
 await page.goto('/');await expect(page.locator('#tiny-tools')).toContainText('Hundreds of tools.');await expect(page.locator('[data-text-preview]')).toHaveCount(0);
 await page.goto('/work/');await expect(page.locator('[data-project="tiny-tools"]')).toContainText('Hundreds of browser tools');
});
'''+s[b:];p.write_text(s)
p=Path('docs/showcase/README.md');s=p.read_text().replace('four direct Tiny Tools task links','cross-suite tool-family examples');a=s.index('The text-cleaner miniature');b=s.index('\n\n',a);s=s[:a]+'Tiny Tools is presented as the complete suite, not as one utility. `toolFamilies` supplies a static cross-section of the collection on the homepage and project page; “Explore all tools” leads to the full application. The former text-cleaner miniature and its JavaScript have been removed. Do not reinstate a dominant single-tool demo as the identity of this project. The overview is intentionally an edited sample rather than a duplicate catalogue.\n\nThe collection was checked at tools commit `a35498aef714f5a9d320c15fdcd3abf995e6a088`: 351 tool routes across 13 categories. Public copy uses “hundreds” rather than a brittle exact count.'+s[b:];p.write_text(s)
print('Reframed Tiny Tools as the complete suite, removed the miniature, and replaced its tests.')
