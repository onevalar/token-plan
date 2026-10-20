import {test} from 'node:test';import assert from 'node:assert/strict';import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import path from 'node:path';import {createFeed} from './update-feed.mjs';
test('feed requires signed artifacts for every platform and both Mac architectures share the universal bundle',()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'tokenplan-feed-'));
 try {
  assert.throws(()=>createFeed(dir,'1.0.99','notes'));
  for(const file of ['TokenPlan.app.tar.gz','TokenPlan_1.0.99_x64-setup.exe','TokenPlan_1.0.99_amd64.AppImage']){writeFileSync(path.join(dir,file),'fixture');writeFileSync(path.join(dir,file+'.sig'),'fixture signature');}
  const feed=createFeed(dir,'1.0.99','notes');assert.equal(Object.keys(feed.platforms).length,4);assert.deepEqual(feed.platforms['darwin-aarch64'],feed.platforms['darwin-x86_64']);assert.ok(feed.platforms['linux-x86_64'].url.startsWith('https://github.com/onevalar/token-plan/releases/download/v1.0.99/'));
  assert.throws(()=>createFeed(dir,'main','notes'));
 } finally {rmSync(dir,{recursive:true,force:true});}
});
