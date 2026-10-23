import {test,expect,type Page} from '@playwright/test';
import {mockDesktop} from './mock';
import {largeDesktop} from './fixtures/largeDesktop';

const visible=(page:Page)=>page.locator('.preview-page:not([hidden])');
async function history(page:Page){
 await page.getByRole('button',{name:'更多',exact:true}).click();
 await page.getByRole('menuitem',{name:'用量历史',exact:true}).click();
}
for(const theme of ['light','dark'] as const){
 test(`daily records keep currency precision and inset content in ${theme}`,async({page},info)=>{
  await page.setViewportSize({width:390,height:780});
  await page.emulateMedia({colorScheme:theme,reducedMotion:'reduce'});
  const data=largeDesktop(),a=data.accounts[0],b=data.accounts[2];
  data.accounts=[a,b];data.settings.appearance='system';
  a.history=a.history.slice(0,2);b.history=b.history.slice(0,1);
  a.history[0]={...a.history[0],tokens:30441392,cost:44.77280452,models:[
   {model:'gpt-6-astra',tokens:29285522,cost:44.693739999999984,variants:[{model:'Input',tokens:29285522,cost:44.693739999999984}]},
   {model:'codex-auto-review',tokens:1155870,cost:.07906451999999997,variants:[]},
  ]};
  a.history[1]={...a.history[1],tokens:0,models:[{model:'Zero',tokens:0,cost:.07906451999999997,variants:[]}]};
  await mockDesktop(page,'zh-Hans',false,data);await page.goto('/');await history(page);
  const days=visible(page).locator('.day-record');
  await days.first().locator('.day-trigger').click();
  const entries=days.first().locator('.history-entry');await expect(entries).toHaveCount(2);
  await expect(async()=>{
   const spacing=await days.first().evaluate(day=>{
    const header=day.querySelector('.day-trigger')!.getBoundingClientRect();
    const cards=[...day.querySelectorAll('.history-entry')];
    const first=cards[0].getBoundingClientRect(),second=cards[1].getBoundingClientRect();
    const label=cards[0].querySelector('.record-label')!.getBoundingClientRect();
    const arrow=cards[0].querySelector('.entry-trigger svg')!.getBoundingClientRect();
    const headerLabel=day.querySelector('.day-trigger .record-label')!.getBoundingClientRect();
    return [first.top-header.bottom,second.top-first.bottom,label.left-first.left,first.right-arrow.right,headerLabel.left-header.left];
   });
   spacing.forEach(gap=>expect(gap).toBeGreaterThanOrEqual(8));
  }).toPass();
  await page.screenshot({path:info.outputPath(`daily-records-${theme}.png`),animations:'disabled'});
  await entries.first().locator('.entry-trigger').click();
  const costs=entries.first().locator('.history-model-legend-values > span:last-child');
  await expect(costs).toHaveText(['$44.69','$0.08']);
  await entries.first().locator('.history-model-variants summary').click();
  await expect(entries.first().locator('.history-model-variants > div > span:last-child')).toHaveText('29,285,522 token · $44.69');
  await page.screenshot({path:info.outputPath(`model-costs-${theme}.png`),animations:'disabled'});
  await days.nth(1).locator('.day-trigger').click();
  await days.nth(1).locator('.entry-trigger').click();
  await days.nth(1).locator('.history-model-exact summary').click();
  await expect(days.nth(1).locator('.history-model-exact-row > span:nth-child(2)')).toHaveText('0 token · $0.08');
  expect(await visible(page).evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);
 });
 test(`account removal stays full width and requires confirmation in ${theme}`,async({page},info)=>{
  await page.setViewportSize({width:390,height:780});
  await page.emulateMedia({colorScheme:theme,reducedMotion:'reduce'});
  await mockDesktop(page,'zh-Hans',false,largeDesktop());await page.goto('/');
  await page.getByRole('button',{name:'Claude first@example.com',exact:true}).click();
  await page.getByRole('button',{name:'账号设置',exact:true}).click();
  const zone=visible(page).locator('.danger-zone'),control=zone.locator('[data-mode]');
  const remove=zone.getByRole('button',{name:'移除账号',exact:true});
  await remove.scrollIntoViewIfNeeded();
  const zoneBox=(await zone.boundingBox())!,buttonBox=(await remove.boundingBox())!;
  expect(Math.abs(buttonBox.width-zoneBox.width)).toBeLessThan(2);
  expect(buttonBox.height).toBeGreaterThanOrEqual(44);
  await page.screenshot({path:info.outputPath(`remove-account-${theme}.png`),animations:'disabled'});
  await remove.click();await expect(control).toHaveAttribute('data-state','confirming');
  expect(await page.evaluate(()=>(window as any).__requests.some((r:any)=>r.method==='remove'))).toBe(false);
  await zone.getByRole('button',{name:'取消',exact:true}).click();
  await expect(control).toHaveAttribute('data-state','idle');
  await expect(control.locator('[data-face="confirming"]')).toHaveCount(0);
  await remove.click();await page.waitForTimeout(300);
  await control.getByRole('group').getByRole('button',{name:'移除账号',exact:true}).click();
  expect(await page.evaluate(()=>(window as any).__requests.some((r:any)=>r.method==='remove'&&r.accountId==='claude'))).toBe(true);
  await expect(visible(page).locator('.account-block').filter({hasText:'first@example.com'})).toHaveCount(0);
 });
}
