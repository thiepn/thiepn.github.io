const {mkdtempSync,rmSync}=require('node:fs');
const {tmpdir}=require('node:os');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const out=mkdtempSync(path.join(tmpdir(),'keep-b3-model-'));
try {
 execFileSync(process.execPath,[path.join(path.dirname(require.resolve('typescript/package.json')),'bin','tsc'),'--target','ES2022','--module','commonjs','--moduleResolution','node','--lib','ES2022,DOM','--outDir',out,'--skipLibCheck','--esModuleInterop',
 'src/pkm/integration/keepProjectContext.ts','src/pkm/integration/keepDiscoveryModel.ts','src/pkm/personalization/configExportImport.ts','src/pkm/planning/planningService.ts','src/pkm/vaultIndex.ts'],{cwd:root,stdio:'inherit'});
 execFileSync(process.execPath,['tests/keepB3ProjectDesk.cjs'],{cwd:root,stdio:'inherit',env:{...process.env,KEEP_COMPILED_DIR:out}});
}finally{rmSync(out,{recursive:true,force:true});}
