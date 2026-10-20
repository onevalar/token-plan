import test from 'node:test';
import assert from 'node:assert/strict';
import {packageWindows} from './window-config.mjs';
test('the shipping window keeps the compact panel configuration',()=>{
 const [panel]=packageWindows('TokenPlan');
 assert.equal(panel.label,'main');
 assert.equal(panel.title,'TokenPlan');
 assert.equal(panel.width,390);
 assert.equal(panel.decorations,false);
 assert.equal(panel.resizable,false);
 assert.equal(panel.skipTaskbar,true);
});
