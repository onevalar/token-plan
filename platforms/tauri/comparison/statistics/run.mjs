import {createServer} from 'vite';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';

const here=dirname(fileURLToPath(import.meta.url)),root=resolve(here,'../..');
const source=process.env.TOKENPLAN_STATISTICS_SOURCE??resolve(root,'../../.amp/in/react-baseline/platforms/tauri');
function pages(side){return {name:`statistics-${side}`,configureServer(server){server.middlewares.use(async(req,res,next)=>{
 if(req.url?.startsWith('/statistics-comparison')){res.setHeader('Content-Type','text/html');res.end(readFileSync(resolve(here,'index.html'),'utf8'));return;}
 if(!req.url?.startsWith('/statistics-pane'))return next();
 try{const html=`<!doctype html><html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body><main id="root" class="preview-page"></main><script type="module" src="/@fs/${resolve(here,side==='source'?'source.tsx':'target.ts')}"></script></body></html>`;
 res.setHeader('Content-Type','text/html');res.end(await server.transformIndexHtml(req.url,html));}catch(error){next(error);}
 });}};}
export async function startStatisticsComparison(){
 if(!existsSync(resolve(source,'src/preview/HistoryPage.tsx'))||!existsSync(resolve(source,'node_modules/react/package.json')))throw new Error('Original pane blocked: set TOKENPLAN_STATISTICS_SOURCE to the pinned original platforms/tauri directory after npm ci. See docs/svelte-statistics.md.');
 const target=await createServer({root,cacheDir:resolve(root,'../../.amp/in/statistics-vite-target'),configFile:resolve(root,'vite.config.ts'),plugins:[pages('target')],optimizeDeps:{entries:[resolve(here,'target.ts')]},server:{host:'127.0.0.1',port:1442,strictPort:true,fs:{allow:[root,here]}}});
 const original=await createServer({root:source,cacheDir:resolve(root,'../../.amp/in/statistics-vite-source'),configFile:false,plugins:[pages('source')],resolve:{alias:[
 {find:'@statistics-original',replacement:resolve(source,'src/preview/HistoryPage.tsx')},
 {find:'@statistics-original-foundation',replacement:resolve(source,'src/components/arc/foundation.css')},
 {find:'@statistics-original-style',replacement:resolve(source,'src/style.css')},
 {find:/^react$/,replacement:resolve(source,'node_modules/react/index.js')},
 {find:/^react\//,replacement:resolve(source,'node_modules/react')+'/'},
 {find:/^react-dom\//,replacement:resolve(source,'node_modules/react-dom')+'/'}
 ]},esbuild:{jsx:'automatic'},optimizeDeps:{entries:[resolve(here,'source.tsx')]},server:{host:'127.0.0.1',port:1443,strictPort:true,fs:{allow:[source,root,here]}}});
 try{await target.listen();await original.listen();}catch(error){await Promise.all([target.close(),original.close()]);throw error;}
 return {url:'http://127.0.0.1:1442/statistics-comparison',close:()=>Promise.all([target.close(),original.close()])};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const running=await startStatisticsComparison();
 console.log(`Statistics comparison: ${running.url} (Ctrl-C closes both servers)`);
 for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{await running.close();process.exit(0);});
}
