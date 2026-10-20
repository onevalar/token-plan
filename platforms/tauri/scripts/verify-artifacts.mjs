import {readdirSync} from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';
const files=[];const walk=dir=>{for(const e of readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory()){if(!['deps','build','incremental','debug','.fingerprint'].includes(e.name)&&!e.name.endsWith('.app')&&!e.name.endsWith('.AppDir'))walk(p);}else if(p.includes(`${path.sep}bundle${path.sep}`)&&(/\.app\.tar\.gz$|-setup\.exe$|\.AppImage$/).test(p))files.push(p);}};
walk('src-tauri/target');
if(files.length!==1)throw Error(`Expected exactly one updater artifact, found ${files.length}`);
for(const file of files)execFileSync('cargo',['test','--locked','--manifest-path','src-tauri/Cargo.toml','verify_packaged_update','--','--ignored'],{stdio:'inherit',env:{...process.env,TOKENPLAN_VERIFY_ARTIFACT:path.resolve(file)}});
