import {describe,it,expect} from 'vitest';
import {connectionAction,connectionSummary} from './connection';
import type {Account} from './desktop';
const account=(error='',connection='available',fetchedAt='')=>({error,connection,fetchedAt} as Account);
describe('account connection diagnosis',()=>{
 it('never treats transport, rate limits or read failures as revoked authorization',()=>{
  for(const e of ['The connection timed out. Try again later.','Network authentication proxy failed','Anthropic temporarily limited updates.','TLS connection failed'])expect(connectionAction(account(e))).toBe('retry');
  for(const e of ['Usage or login data could not be read. Check credential file permissions and format, then retry.','Keychain credential unavailable'])expect(connectionAction(account(e))).toBe('inspect');
 });
 it('distinguishes identity, authorized login and usage success',()=>{
  expect(connectionAction(account('Your session has expired. Sign in with the CLI again.'))).toBe('login');
  expect(connectionAction(account('','unverified'))).toBe('inspect');
  expect(connectionSummary(account('','different_account'))).toBe('Another account is connected.');
  expect(connectionSummary(account())).toBe('Account identified. Enable it and refresh to load usage.');
  expect(connectionSummary({...account('','available','2026-10-21'),warning:'Local token history is still updating.'})).toBe('Usage loaded.');
  expect(connectionSummary(account('Server rejected request'))).toContain('could not be read');
 });
});
