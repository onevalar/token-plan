import {execFileSync} from 'node:child_process';
import {mkdirSync,cpSync,copyFileSync,writeFileSync,chmodSync,rmSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {join} from 'node:path';
import {homedir} from 'node:os';
import {build} from 'esbuild';

if(process.platform!=='darwin')throw new Error('This design preview is macOS-only.');
const project=fileURLToPath(new URL('..',import.meta.url));
const scratch=join(homedir(),'Library/Caches/TokenPlan/NavigationPreview.noindex');
const source=join(project,'src-tauri/target/debug/bundle/macos/TokenPlan Preview.app');
const app=join(scratch,'TokenPlan Design Preview.app');
mkdirSync(scratch,{recursive:true});
// Build with a separate identifier; release/default builds do not enable this interface.
execFileSync('npm',['run','tauri','build','--','--debug','--bundles','app'],{cwd:project,stdio:'inherit',env:{...process.env,VITE_MAC_NAVIGATION_PREVIEW:'1'}});
await build({entryPoints:[join(project,'tests/fixtures/designPreview.ts')],bundle:true,format:'esm',platform:'node',outfile:join(scratch,'fixture.mjs')});
const {designPreview}=await import(pathToFileURL(join(scratch,'fixture.mjs')));
if(execFileSync('/bin/ps',['-axo','command='],{encoding:'utf8'}).split('\n').some(line=>line.startsWith(join(app,'Contents/MacOS/'))))throw new Error('Close TokenPlan Design Preview before rebuilding it.');
rmSync(app,{recursive:true,force:true});
cpSync(source,app,{recursive:true,verbatimSymlinks:true});
const macos=join(app,'Contents/MacOS');
copyFileSync(join(project,'scripts/preview-fixture.py'),join(macos,'tokenplan-bridge'));
chmodSync(join(macos,'tokenplan-bridge'),0o755);
writeFileSync(join(macos,'preview-state.json'),JSON.stringify(designPreview()));
// Never let this preview discover a real packaged helper instead of the fixture.
rmSync(join(app,'Contents/Helpers'),{recursive:true,force:true});
// Swift/Sparkle support belongs to the real helper; the isolated Python fixture needs neither.
rmSync(join(app,'Contents/Frameworks'),{recursive:true,force:true});
execFileSync('/usr/libexec/PlistBuddy',['-c','Set :CFBundleDisplayName TokenPlan Design Preview',join(app,'Contents/Info.plist')]);
execFileSync('/usr/bin/codesign',['--force','--deep','--sign','-',app],{stdio:'inherit'});
// Leave just the review bundle in the noindex directory, avoiding duplicate app search results.
rmSync(source,{recursive:true});
console.log(`\nDesign preview (synthetic data): ${app}`);
