import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync,mkdtempSync,mkdirSync,rmSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {linuxDebConfig,linuxIcons} from './linux-deb-config.mjs';

test('production DEB replaces the legacy package and retains its launch paths',()=>{
  const config=linuxDebConfig('2.0.5');
  assert.deepEqual(config.conflicts,['tokenplan']);
  assert.deepEqual(config.replaces,['tokenplan']);
  assert.deepEqual(config.provides,['tokenplan (= 2.0.5)']);
  assert.equal(config.postInstallScript,'linux/refresh-desktop-cache.sh');
  assert.equal(config.postRemoveScript,config.postInstallScript);
  assert.equal(config.files['/usr/bin/tokenplan'],config.files['/opt/tokenplan/TokenPlan.Desktop']);
  const launcher=new URL('../src-tauri/linux/tokenplan',import.meta.url);
  assert.match(readFileSync(launcher,'utf8'),/exec \/usr\/bin\/tokenplan-shell "\$@"/);
  if(process.platform!=='win32')assert.ok(statSync(launcher).mode&0o111,'compatibility entry must be executable');
  const desktop=readFileSync(new URL('../src-tauri/linux/tokenplan.desktop',import.meta.url),'utf8');
  assert.match(desktop,/^NoDisplay=true$/m);
  assert.match(desktop,/^Exec=\/usr\/bin\/tokenplan-shell$/m);
});

test('production packaging applies Linux replacement metadata to the shipping config',()=>{
  const root=mkdtempSync(path.join(tmpdir(),'tokenplan-deb-config-'));
  try {
    mkdirSync(path.join(root,'src-tauri'));
    const script=new URL('./package-config.mjs',import.meta.url).href;
    execFileSync(process.execPath,['--input-type=module','-e',
      `Object.defineProperty(process,'platform',{value:'linux'});await import(${JSON.stringify(script)});`],
      {cwd:root,env:{...process.env,TOKENPLAN_VERSION:'2.9.99',TOKENPLAN_PRODUCTION:'true'}});
    const config=JSON.parse(readFileSync(path.join(root,'src-tauri/tauri.package.json'),'utf8'));
    assert.equal(config.version,'2.9.99');
    assert.equal(config.productName,'TokenPlan');
    assert.deepEqual(config.bundle.linux.deb,linuxDebConfig('2.9.99'));
    assert.deepEqual(config.bundle.icon,linuxIcons);
  } finally {rmSync(root,{recursive:true,force:true});}
});

test('Linux bundles include standard-size PNGs that desktop icon themes can resolve',()=>{
  const dimensions=linuxIcons.map(file=>{
    const png=readFileSync(new URL(`../src-tauri/${file}`,import.meta.url));
    assert.equal(png.subarray(1,4).toString(),'PNG');
    assert.equal(png.readUInt32BE(16),png.readUInt32BE(20));
    return png.readUInt32BE(16);
  });
  assert.deepEqual(dimensions,[32,48,128,256,512]);
});

test('desktop caches refresh on install/removal, and optional helper failures do not block installation',
  {skip:process.platform==='win32'},()=>{
  const root=mkdtempSync(path.join(tmpdir(),'tokenplan-cache-test-'));
  const script=fileURLToPath(new URL('../src-tauri/linux/refresh-desktop-cache.sh',import.meta.url));
  try {
    const log=path.join(root,'calls');
    for(const helper of ['update-desktop-database','gtk-update-icon-cache'])
      writeFileSync(path.join(root,helper),`#!/bin/sh\nprintf '%s\\n' "${helper} $*" >> "$TEST_CACHE_LOG"\nexit 1\n`,{mode:0o755});
    execFileSync('/bin/sh',[script],{env:{PATH:root,TEST_CACHE_LOG:log}});
    assert.equal(readFileSync(log,'utf8'),
      'update-desktop-database -q /usr/share/applications\ngtk-update-icon-cache -q -t -f /usr/share/icons/hicolor\n');
    execFileSync('/bin/sh',[script],{env:{PATH:path.join(root,'absent')}});
  } finally {rmSync(root,{recursive:true,force:true});}
});

test('Linux packages explicitly declare the Ubuntu 22.04 glibc and helper prerequisites',()=>{
 const dependencies=linuxDebConfig('2.3.5').depends;
 for(const expected of ['glib-networking','libc6 (>= 2.35)','libwebkit2gtk-4.1-0','libayatana-appindicator3-1','libssl3','libicu70 | libicu74'])assert.ok(dependencies.includes(expected));
});
