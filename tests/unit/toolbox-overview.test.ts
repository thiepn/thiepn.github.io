import { describe,it,expect } from 'vitest';
import fs from 'node:fs';
const config=JSON.parse(fs.readFileSync('src/data/showcase.json','utf8'));
describe('Tiny Tools represents the collection',()=>{
 it('retains equal-weight samples from eight kinds of work',()=>{
  expect(config.toolFamilies).toHaveLength(8);
  for(const family of config.toolFamilies){expect(family.label).toBeTruthy();expect(family.tools).toHaveLength(2);}
 });
 it('has unique, directly addressable tool examples',()=>{
  const links=config.toolFamilies.flatMap((f:any)=>f.tools.map((t:any)=>t.href));
  expect(new Set(links).size).toBe(16);for(const link of links)expect(link).toMatch(/^\/tools\/#\/tool\/[a-z0-9-]+$/);
 });
 it('uses suite media and suite positioning',()=>{
  const view=config.projects['tiny-tools'];expect(view.summary).toContain('Hundreds');expect(view.media).toContain('showcase-suite');
 });
 it('does not ship the retired single-tool miniature',()=>{
  const component=fs.readFileSync('src/components/studio/TinyToolsSpotlight.astro','utf8');
  expect(component).not.toContain('text-preview');expect(component).not.toContain('<script>');
  expect(fs.existsSync('src/scripts/text-preview.ts')).toBe(false);
 });
});
