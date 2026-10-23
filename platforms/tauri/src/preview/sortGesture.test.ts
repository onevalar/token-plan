import {describe,it,expect} from 'vitest';
import {sortPosition} from './sortGesture';
describe('dragging variable-height rows',()=>{
 it('moves neighbours out of the reserved slot in either direction',()=>{
  const boxes=[{top:20,height:60},{top:80,height:80},{top:160,height:40}];
  expect(sortPosition(boxes,0,140)).toMatchObject({to:2,y:120,landing:120,offsets:[0,-60,-60]});
  expect(sortPosition(boxes,2,-180)).toMatchObject({to:0,y:-140,landing:-140,offsets:[40,40,0]});
 });
 it('can move a taller row to the end without overflowing the list',()=>{
  expect(sortPosition([{top:0,height:100},{top:100,height:40}],0,80)).toMatchObject({to:1,y:40,landing:40,offsets:[0,-100]});
 });
 it('keeps small movements in the same slot and handles a one-row list',()=>{
  expect(sortPosition([{top:0,height:60},{top:60,height:60}],0,15)).toMatchObject({to:0,y:15,landing:0,offsets:[0,0]});
  expect(sortPosition([{top:30,height:60}],0,100)).toMatchObject({to:0,y:0,landing:0,offsets:[0]});
 });
});
