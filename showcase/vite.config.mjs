import {defineConfig} from '../platforms/tauri/node_modules/vite/dist/node/index.js';
import path from 'node:path';
import fs from 'node:fs';
const portfolio=process.env.PORTFOLIO_DIR;
if(!portfolio||!fs.existsSync(path.join(portfolio,'src/v3/personal-projects/covers/token-plan.tsx')))throw new Error('Set PORTFOLIO_DIR to the portfolio source checkout.');
const deps=path.resolve('platforms/tauri/node_modules');
export default defineConfig({
 root:path.resolve('showcase'),base:'./',
 resolve:{alias:{'@portfolio':path.join(portfolio,'src'),react:path.join(deps,'react'),'react-dom':path.join(deps,'react-dom'),motion:path.join(deps,'motion'),'lucide-react':path.join(deps,'lucide-react')}},
 esbuild:{jsx:'automatic'},
 build:{outDir:path.resolve('docs/demo'),emptyOutDir:true,sourcemap:false},
 server:{host:'127.0.0.1',port:1432,strictPort:true,fs:{allow:[path.resolve('.'),portfolio]}}
});
