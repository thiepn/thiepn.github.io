import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const source=path.resolve(process.argv.includes('--baseline')?'tests/visual/baselines':'artifacts/visual/current');
const outDir=path.resolve('artifacts/visual');
await fs.mkdir(outDir,{recursive:true});
let files=[]; try{files=(await fs.readdir(source)).filter(f=>f.endsWith('.png')).sort();}catch{}
if(!files.length){console.error(`No PNG captures found in ${source}`);process.exit(1)}
const output=path.join(outDir,process.argv.includes('--baseline')?'contact-sheet-baseline.png':'contact-sheet-current.png');
const magick=spawnSync('magick',['montage',...files.map(f=>path.join(source,f)),'-thumbnail','420x','-tile','4x','-geometry','+14+20','-background','#101111',output],{encoding:'utf8'});
if(magick.status===0){console.log(`Contact sheet: ${output}`);process.exit(0)}
const html=`<!doctype html><meta charset="utf-8"><title>THE INDEX / Visual Contact Sheet</title><style>body{margin:0;background:#101111;color:#eee;font:12px monospace}.g{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;padding:16px}figure{margin:0}img{width:100%;display:block}figcaption{padding:6px 0}</style><div class="g">${files.map(f=>`<figure><img src="current/${f}"><figcaption>${f}</figcaption></figure>`).join('')}</div>`;
await fs.writeFile(path.join(outDir,'contact-sheet.html'),html);
console.log('ImageMagick unavailable; wrote artifacts/visual/contact-sheet.html instead.');
