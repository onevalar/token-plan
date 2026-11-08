import {execFileSync} from 'node:child_process';
import {createServer as createHttpServer} from 'node:http';
import {existsSync,mkdirSync,readFileSync,appendFileSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve,join} from 'node:path';
import {build} from 'esbuild';
import {createServer} from 'vite';

const project=fileURLToPath(new URL('..',import.meta.url)),root=resolve(project,'../..');
const scratch=join(root,'.amp/in/react-baseline'),baseline=join(scratch,'platforms/tauri');
const revision='c588b28cc1a19a1bdd5964db5c791e2ec66d5ec4';
const exclude=execFileSync('git',['rev-parse','--git-path','info/exclude'],{cwd:root,encoding:'utf8'}).trim();
const excludePath=resolve(root,exclude);
if(!readFileSync(excludePath,'utf8').split('\n').includes('/.amp/in/'))appendFileSync(excludePath,'\n/.amp/in/\n');
if(!existsSync(join(baseline,'package.json'))){
 mkdirSync(scratch,{recursive:true});
 const archive=execFileSync('git',['archive',revision,'platforms/tauri'],{cwd:root,maxBuffer:32*1024*1024});
 execFileSync('tar',['-x','-C',scratch],{input:archive});
}
if(!existsSync(join(baseline,'node_modules/vite')))execFileSync('npm',['ci'],{cwd:baseline,stdio:'inherit'});
const fixture=await build({entryPoints:[join(project,'comparison/fixture.ts')],bundle:true,format:'esm',write:false,platform:'browser'});
const plugin={name:'comparison-native-fixture',transformIndexHtml(){return [{tag:'script',attrs:{type:'module'},children:fixture.outputFiles[0].text,injectTo:'head-prepend'}];}};
const {createServer:createOriginal}=await import(pathToFileURL(join(baseline,'node_modules/vite/dist/node/index.js')));
const original=await createOriginal({root:baseline,configFile:join(baseline,'vite.config.ts'),cacheDir:join(root,'.amp/in/comparison-original-cache'),plugins:[plugin],optimizeDeps:{entries:[join(baseline,'index.html')]},server:{host:'127.0.0.1',port:1451,strictPort:true}});
// Local Valar tarballs retain their package version/path across rebuilds. Never
// hand off a comparison pane using a previous package's optimized components.
const target=await createServer({root:project,configFile:join(project,'vite.config.ts'),cacheDir:join(root,'.amp/in/comparison-target-cache'),plugins:[plugin],optimizeDeps:{force:true,entries:[join(project,'index.html')]},server:{host:'127.0.0.1',port:1452,strictPort:true}});
await original.listen();await target.listen();
const shell=createHttpServer((request,response)=>{if(request.url!=='/'){response.writeHead(404).end();return;}response.setHeader('Content-Type','text/html; charset=utf-8');response.end(readFileSync(join(project,'comparison/index.html')));});
await new Promise((resolve,reject)=>{shell.once('error',reject);shell.listen(1453,'127.0.0.1',resolve);});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{await Promise.all([original.close(),target.close()]);shell.close(()=>process.exit());});
console.log('Real React/Svelte comparison ready on runner port 1453; original 1451, target 1452. Synthetic data only.');
