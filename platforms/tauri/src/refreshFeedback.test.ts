import {describe,it,expect} from 'vitest';
import {largeDesktop} from '../tests/fixtures/largeDesktop';
import {refreshResult} from './refreshFeedback';

describe('manual refresh feedback',()=>{
 it('distinguishes updated data from a cached response',()=>{
  const before=largeDesktop(),after=structuredClone(before);
  expect(refreshResult(before,after).message).toBe('Checked. No new usage data.');
  after.accounts[0].fetchedAt='2030-01-01T12:00:00Z';
  expect(refreshResult(before,after).message).toBe('Usage updated.');
 });
 it('does not announce success when some or all target accounts fail',()=>{
  const before=largeDesktop(),after=structuredClone(before);
  after.accounts[0].error='Too many requests';
  expect(refreshResult(before,after).tone).toBe('warning');
  expect(refreshResult(before,after,after.accounts[0].id).tone).toBe('error');
  after.accounts[0].error='';after.accounts[0].connection='unverified';
  expect(refreshResult(before,after,after.accounts[0].id).tone).toBe('error');
 });
 it('scopes errors to the refreshed account, excludes disabled accounts, and keeps warnings nonfatal',()=>{
  const before=largeDesktop(),after=structuredClone(before);
  after.accounts[0].error='Network timeout';after.accounts[0].enabled=false;
  after.accounts[1].warning='Local token history is still updating.';
  expect(refreshResult(before,after).message).toBe('Refresh completed with notices. Check account details.');
  expect(refreshResult(before,after,after.accounts[1].id).tone).toBe('warning');
  after.accounts[1].warning='Usage queries are temporarily rate limited.';
  expect(refreshResult(before,after,after.accounts[1].id).tone).toBe('warning');
  after.accounts.forEach(a=>a.enabled=false);
  expect(refreshResult(before,after).message).toBe('No enabled accounts to refresh.');
 });
});
