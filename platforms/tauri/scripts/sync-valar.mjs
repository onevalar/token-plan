import {execFileSync} from 'node:child_process';
import {mkdirSync,copyFileSync,readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,join} from 'node:path';

// Valar is private and unpublished. Consume actual package tarballs, not aliases
// into the documentation site or another framework's registry sources.
const source=resolve(process.argv[2]??fileURLToPath(new URL('../../../../valar-svelte/',import.meta.url)));
const destination=fileURLToPath(new URL('../vendor/',import.meta.url));
const pkg=JSON.parse(readFileSync(join(source,'package.json'),'utf8'));
if(pkg.name!=='valar-svelte'||pkg.packageManager!=='pnpm@12.14.0')throw new Error('Expected the Valar Svelte repository with pnpm 12.14.0.');
const pnpm=(args,cwd=source)=>execFileSync('npx',['--yes','pnpm@12.14.0',...args],{cwd,stdio:'inherit'});
mkdirSync(destination,{recursive:true});
pnpm(['--filter','@valar/svelte-ui','build']);
pnpm(['--filter','@valar/svelte-ui','check']);
for(const name of ['primitives','ui'])pnpm(['pack','--out',join(destination,`valar-svelte-${name}.tgz`)],join(source,'packages',name));
copyFileSync(join(source,'LICENSE.md'),join(destination,'Valar-LICENSE.md'));
const registry=join(source,'docs/src/lib/registry/ui');
const notices=readdirSync(registry).flatMap(name=>readdirSync(join(registry,name))
 .filter(file=>/^(LICENSE|PROVENANCE)/.test(file))
 .map(file=>`## ${name} / ${file}\n\n${readFileSync(join(registry,name,file),'utf8')}`));
writeFileSync(join(destination,'Valar-NOTICE.md'),`# Valar UI Sources\n\nLocal packages from ${pkg.repository?.url??'onevalar/valar-svelte'}.\n\n${notices.join('\n\n')}`);
console.log('Valar packages built, type-checked and packed. Refresh same-path tarballs with: npm install --force @valar/svelte-ui@file:vendor/valar-svelte-ui.tgz @valar/svelte-primitives@file:vendor/valar-svelte-primitives.tgz. No package was published.');
