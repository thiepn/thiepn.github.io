import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { HUB_CATEGORIES } from '../src/data/taxonomy.ts';
import { HUB_WORKSPACE_ROUTES } from '../src/lib/hub-release-policy.ts';

// Cache only the static, public workspace shell and build assets. Local user
// records stay in scoped IndexedDB; auth, connections and APIs are never cached.
const assets = new Set([...HUB_WORKSPACE_ROUTES, '/favicon.svg']);
for (const name of await fs.readdir('dist/_astro')) if (/\.(js|css|woff2?)$/.test(name)) assets.add('/_astro/' + name);
const digest = crypto.createHash('sha256');
for (const url of [...assets].sort()) digest.update(await fs.readFile(path.join('dist', url.endsWith('/') ? url + 'index.html' : url)));
const cache = 'thiepn-workspace-' + digest.digest('hex').slice(0, 20);
const source = `
const CACHE=${JSON.stringify(cache)};
const CORE=${JSON.stringify([...assets])};
const PAGES=new Set(${JSON.stringify(HUB_WORKSPACE_ROUTES)});
const FILTERS=new Set(${JSON.stringify(['all', ...HUB_CATEGORIES])});
const MODES=new Set(['today','focus','workspace']);
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('thiepn-workspace-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin)return;
 const catalogueFilter=url.pathname==='/apps/'&&url.searchParams.size===1&&url.searchParams.has('category')&&FILTERS.has(url.searchParams.get('category'));
 // Only public Home presentation modes may use the cached shell offline.
 // Refuse all source keys, record IDs, OAuth callbacks and arbitrary queries.
 const presentationMode=(url.pathname==='/'||url.pathname==='/home/')&&url.searchParams.size===1&&url.searchParams.has('mode')&&MODES.has(url.searchParams.get('mode'));
 if(url.search&&!catalogueFilter&&!presentationMode)return;
 if((request.mode==='navigate'||request.headers.get('X-Hub-Navigation')==='1')&&PAGES.has(url.pathname)){
  event.respondWith(fetch(request).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(url.pathname,copy)));}return response;}).catch(()=>caches.open(CACHE).then(cache=>cache.match(url.pathname)).then(hit=>hit||Response.error())));return;
 }
 if(url.pathname.startsWith('/_astro/')||url.pathname==='/favicon.svg')event.respondWith(caches.open(CACHE).then(cache=>cache.match(request)).then(hit=>hit||fetch(request).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(request,copy)));}return response;})));
});
`;
await fs.writeFile('dist/workspace-sw.js', source.trim() + '\n');
// Retain the old worker URL for browsers with a /home/ registration.
await fs.mkdir('dist/home', { recursive: true });
await fs.writeFile('dist/home/workspace-sw.js', source.trim() + '\n');
console.log(`Workspace offline shell: ${assets.size} public assets / ${cache}`);
