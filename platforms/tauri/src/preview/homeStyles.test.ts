import {describe,it,expect} from 'vitest';
import {homeStyleKey,readHomeStyles,homeStyleMode,homeStyleFor} from './useHomeUsageStyle';
import {sameLoginDirectory} from './AccountOnboarding';
describe('account style preferences',()=>{
 it('migrates the legacy global choice and preserves per-account choices through uniform mode',()=>{
  const getItem=(key:string)=>key==='tokenplan.homeUsageStyle'?'rings':null;
  const original=readHomeStyles({getItem});expect(original.mode).toBe('uniform');
  let p=homeStyleMode(original,'custom');p.accounts['claude:one']='numbers';
  expect(homeStyleFor(p,'claude:one')).toBe('numbers');expect(homeStyleFor(p,'claude:two')).toBe('rings');
  p={...homeStyleMode(p,'uniform'),style:'bars'};expect(homeStyleFor(p,'claude:one')).toBe('bars');
  p=homeStyleMode(p,'custom');expect(homeStyleFor(p,'claude:one')).toBe('numbers');expect(homeStyleFor(p,'claude:two')).toBe('rings');
  expect(readHomeStyles({getItem:key=>key===homeStyleKey?JSON.stringify(p):null})).toEqual(p);
 });
 it('rejects corrupt persisted choices',()=>{expect(()=>readHomeStyles({getItem:()=>'{broken'})).toThrow();});
 it('compares Windows canonical paths without weakening Unix identity',()=>{
  expect(sameLoginDirectory('\\\\?\\C:\\Users\\Me\\.claude-account1','c:/users/me/.claude-account1')).toBe(true);
  expect(sameLoginDirectory('/home/me/.claude-account1','/home/me/.claude-account2')).toBe(false);
  expect(sameLoginDirectory('/home/Me/.claude-account1','/home/me/.claude-account1')).toBe(false);
 });
});
