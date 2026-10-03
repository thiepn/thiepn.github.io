import { it, expect } from 'vitest';
import { selectProviders } from '../../src/lib/provider-selection';
import { matchesPinTitle } from '../../src/lib/pin-filter';
import { findHubApps } from '../../src/lib/hub-search';
import type { SearchableProject } from '../../src/lib/search-core';
import { parseHubPreferences } from '../../src/lib/hub-preferences';
for(const count of [100,250])it(`H7 ${count} public apps remain searchable, pinnable and bounded`,()=>{
 const apps: SearchableProject[]=Array.from({length:count},(_,i)=>({kind:'project',code:`P-${i}`,slug:`app-${i}`,title:`App ${i}`,subtitle:'Scale fixture',summary:'',aliases:[],category:'tools',status:'live',tags:[],collections:[],accentLight:'#000000',accentDark:'#ffffff',liveUrl:'https://example.test/'}));
 expect(findHubApps(apps,`App ${count-1}`)[0]!.slug).toBe(`app-${count-1}`);expect(findHubApps(apps,'')).toHaveLength(count);
 const slugs=apps.map(a=>a.slug),pins=slugs.slice(-12);expect(parseHubPreferences(JSON.stringify({version:1,pins,density:'compact'}),slugs).preferences.pins).toEqual(pins);
 const selection=selectProviders(slugs.map(id=>({id,enabled:true,operations:['search']})),slugs,'search');expect(selection.selected).toEqual(slugs.slice(0,6));expect(selection.skipped).toHaveLength(count-6);expect(selection.complete).toBe(false);
});
it('H7 selection records disabled/unknown/unsupported/budget coverage without executing reads',()=>{
 expect(selectProviders([{id:'one',enabled:false,operations:['search']},{id:'two',enabled:true,operations:[]},{id:'three',enabled:true,operations:['search']}],['one','missing','two','three','three'],'search')).toEqual({selected:['three'],skipped:[{id:'one',reason:'disabled'},{id:'missing',reason:'unknown'},{id:'two',reason:'unsupported'}],complete:false});
 expect(()=>selectProviders([{id:'same',enabled:true,operations:[]},{id:'same',enabled:true,operations:[]}],[],'search')).toThrow();expect(()=>selectProviders([],[],'search',7)).toThrow();
});
it('H7 international names remain searchable and filtering never rewrites pin choices',()=>{
 expect(matchesPinTitle('성경 공부','성경')).toBe(true);expect(matchesPinTitle('Français','francais')).toBe(true);expect(matchesPinTitle('Notes','unmatched')).toBe(false);
 const app:SearchableProject={kind:'project',code:'I-1',slug:'study',title:'성경 공부',subtitle:'Japanese 日本語',summary:'',aliases:[],category:'learn',status:'live',tags:[],collections:[],accentLight:'#000000',accentDark:'#ffffff'};
 expect(findHubApps([app],'성경')[0]!.slug).toBe('study');expect(findHubApps([app],'日本語')[0]!.slug).toBe('study');
});
