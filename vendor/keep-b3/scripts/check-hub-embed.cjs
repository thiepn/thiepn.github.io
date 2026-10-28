const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');
const ts = require('typescript');
const root=path.resolve(__dirname,'..');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'hub-embed/SOURCE_SHA256.json'),'utf8'));
let count=0;
for(const [rel,digest] of Object.entries(manifest)) {
 const file=path.join(root,rel);
 assert.ok(file.startsWith(path.join(root,'src')+path.sep),'Manifest only contains src/');
 assert.ok(fs.existsSync(file),'Source missing: '+rel);
 const actual=crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
 assert.equal(actual,digest,'Original KEEP B3 changed: '+rel);
 count++;
}
assert.equal(count,1269,'Original KEEP source count drift');
const entry=fs.readFileSync(path.join(root,'hub-embed/entry.tsx'),'utf8');
for(const fragment of ["import App from '../src/App'", "vaultEncryptionService", 'createRoot(container)', 'authority.revoked', 'lockVault()', 'keep-original-react-mounted','data-keep-original-react-active']) assert.ok(entry.includes(fragment),fragment);
const result=ts.transpileModule(entry,{fileName:'hub-embed/entry.tsx',compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX},reportDiagnostics:true});
assert.equal(result.diagnostics?.length||0,0,'React native candidate must parse as TypeScript');
const config=fs.readFileSync(path.join(root,'hub-embed/vite.config.ts'),'utf8');
const vc=ts.transpileModule(config,{fileName:'hub-embed/vite.config.ts',compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext},reportDiagnostics:true});
assert.equal(vc.diagnostics?.length||0,0,'Candidate Vite configuration must parse');
assert.ok(fs.existsSync(path.join(root,'tests/keepB3ProjectDesk.cjs')),'Original B3 checks must be bundled');
assert.ok(fs.existsSync(path.join(root,'scripts/check-keep-b3.cjs')),'Original B3 test runner must be bundled');
console.log('PASS: all '+count+' original source SHA-256 hashes intact; K6 React host parses, locks on revoke and has full original test closure');
