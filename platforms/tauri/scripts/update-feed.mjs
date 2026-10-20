import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
// Takes downloaded CI artifacts, never credentials. Refuse missing/unsigned platforms.
export function createFeed(root,version,notes) {
 if(!/^\d+\.\d+\.\d+$/.test(version))throw Error('A stable approved version is required');
 const files=[];const walk=dir=>{for(const item of readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,item.name);if(item.isDirectory())walk(p);else files.push(p);}};walk(root);
 const specs=[['darwin-aarch64','.app.tar.gz'],['windows-x86_64','-setup.exe'],['linux-x86_64','.AppImage']];
 const platforms={};
 for(const [target,suffix] of specs){
  const matches=files.filter(f=>f.endsWith(suffix));if(matches.length!==1)throw Error(`Expected one ${target} artifact`);
  const file=matches[0],signature=readFileSync(file+'.sig','utf8').trim();
  if(!signature||signature.length>8192)throw Error(`Missing signature for ${target}`);
  platforms[target]={signature,url:`https://github.com/onevalar/token-plan/releases/download/v${version}/${encodeURIComponent(path.basename(file))}`};
 }
 platforms['darwin-x86_64']={...platforms['darwin-aarch64']};
 return {version,notes,pub_date:new Date().toISOString(),platforms};
}
if(process.argv[1]===new URL(import.meta.url).pathname){
 const [root,version,notesFile,output]=process.argv.slice(2);
 writeFileSync(output,JSON.stringify(createFeed(root,version,readFileSync(notesFile,'utf8')),null,2)+'\n');
}
