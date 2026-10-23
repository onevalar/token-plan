import {test,expect,type Page} from '@playwright/test';
import {mockDesktop} from './mock';
import {largeDesktop} from './fixtures/largeDesktop';
const visible=(page:Page)=>page.locator('.preview-page:not([hidden])');
const editor=(page:Page)=>visible(page).locator('.home-metric-editor');
const requests=(page:Page)=>page.evaluate(()=>(window as any).__requests.filter((r:any)=>['metric','metricLayout'].includes(r.method)));
test.beforeEach(async({page},info)=>{
 await page.addInitScript(platform=>(window as any).__panelFrame={platform,rounded:platform==='macos'},String(info.project.metadata.platform??'macos'));
 await mockDesktop(page,'zh-Hans',false,largeDesktop());await page.goto('/');
 await page.getByRole('button',{name:'Claude first@example.com',exact:true}).click();
});
async function edit(page:Page){await page.getByRole('button',{name:'编辑首页显示',exact:true}).click();}
async function placeFirst(page:Page,value:string){await editor(page).getByRole('combobox').first().click();await page.getByRole('option',{name:value,exact:true}).click();}
for(const theme of ['light','dark'] as const)test(`view and editor are separate and fit the panel in ${theme}`,async({page},info)=>{
 await page.emulateMedia({colorScheme:theme});
 await expect(visible(page).locator('.detail-tabs,.linked-setting')).toHaveCount(0);
 await expect(visible(page).locator('.history-overview,.account-configuration')).toHaveCount(2);
 const button=page.getByRole('button',{name:'编辑首页显示',exact:true});
 const width=await button.evaluate(e=>e.getBoundingClientRect().width);expect(width).toBeGreaterThan(300);
 await page.screenshot({path:info.outputPath(`detail-${theme}.png`)});
 await edit(page);
 await expect(visible(page).locator('.history-overview,.account-configuration,.detail-group')).toHaveCount(0);
 await expect(page.getByRole('button',{name:'刷新',exact:true})).toHaveCount(0);
 await expect(editor(page)).toBeFocused();
 expect(await visible(page).evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);
 await page.screenshot({path:info.outputPath(`editor-${theme}.png`)});
});
test('cancel, header cancel and Escape discard placement and order drafts without writing',async({page})=>{
 for(const exit of ['footer','header','escape']){
  await edit(page);const original=await editor(page).locator('.placement-row > span').allTextContents();
  await placeFirst(page,'隐藏');await editor(page).getByRole('button',{name:/^拖动排序/}).first().press('ArrowDown');
  if(exit==='footer')await editor(page).getByRole('button',{name:'取消',exact:true}).click();
  else if(exit==='header')await page.locator('header').getByRole('button',{name:'取消',exact:true}).click();
  else await page.keyboard.press('Escape');
  await expect(editor(page)).toHaveCount(0);expect(await requests(page)).toHaveLength(0);
  await edit(page);await expect(editor(page).locator('.placement-row > span')).toHaveText(original);
  await expect(editor(page).getByRole('combobox').first()).toContainText('首页显示');
  await editor(page).getByRole('button',{name:'取消',exact:true}).click();
 }
 expect(await page.evaluate(()=>(window as any).__panelHides??0)).toBe(0);
});
test('Confirm saves one complete draft and updates Home without changing the other account',async({page})=>{
 await edit(page);await placeFirst(page,'仅详情');await editor(page).getByRole('button',{name:/^拖动排序/}).first().press('ArrowDown');
 const order=await editor(page).locator('.placement-row > span').allTextContents();
 expect(await requests(page)).toHaveLength(0);
 await editor(page).getByRole('button',{name:'确定',exact:true}).click();
 await expect(editor(page)).toHaveCount(0);
 const writes=await requests(page);expect(writes).toHaveLength(1);expect(writes[0]).toMatchObject({method:'metricLayout',accountId:'claude'});
 await edit(page);await expect(editor(page).locator('.placement-row > span')).toHaveText(order);
 await expect(editor(page).getByRole('combobox').nth(1)).toContainText('仅详情');
 await editor(page).getByRole('button',{name:'取消',exact:true}).click();await page.getByRole('button',{name:'返回',exact:true}).click();
 await expect(visible(page).locator('.account-block').first().locator('.metric')).toHaveCount(1);
 await expect(visible(page).locator('.account-block').nth(1).locator('.metric')).toHaveCount(2);
});
test('failed save retains the draft and saving blocks duplicate submissions and cancellation',async({page})=>{
 await edit(page);await placeFirst(page,'隐藏');
 await page.evaluate(()=>{const api=(window as any).__TAURI_INTERNALS__,invoke=api.invoke;api.invoke=async(command:string,args:any)=>{if(args?.request?.method==='metricLayout')await new Promise(r=>setTimeout(r,700));return invoke(command,args);};(window as any).__failNextRequest=true;});
 await editor(page).getByRole('button',{name:'确定',exact:true}).click();
 await expect(editor(page).getByRole('button',{name:'取消',exact:true})).toBeDisabled();
 await page.keyboard.press('Escape');
 await expect(editor(page).getByRole('alert')).toBeVisible();
 await expect(editor(page).getByRole('combobox').first()).toContainText('隐藏');
 await editor(page).getByRole('button',{name:'确定',exact:true}).click();
 await expect(editor(page)).toHaveCount(0);expect(await requests(page)).toHaveLength(2);
});

test('dragging a metric changes only the draft until confirmed',async({page})=>{
 await edit(page);
 const rows=editor(page).locator('[data-sort-id]');
 const first=await rows.first().getAttribute('data-sort-id'),second=await rows.nth(1).getAttribute('data-sort-id');
 const handle=await rows.first().locator('.sort-handle').boundingBox(),target=await rows.nth(1).boundingBox();
 await page.mouse.move(handle!.x+handle!.width/2,handle!.y+handle!.height/2);await page.mouse.down();
 await page.mouse.move(target!.x+target!.width/2,target!.y+target!.height/2,{steps:10});
 await expect(rows.first()).toHaveAttribute('data-sort-dragging','true');
 expect(await rows.first().evaluate(e=>getComputedStyle(e).transform)).not.toBe('none');
 expect(await rows.nth(1).evaluate(e=>getComputedStyle(e).transform)).not.toBe('none');
 expect(await requests(page)).toHaveLength(0);await page.mouse.up();
 await expect(rows.first()).toHaveAttribute('data-sort-id',second!);expect(await requests(page)).toHaveLength(0);
 await editor(page).getByRole('button',{name:'确定',exact:true}).click();
 expect((await requests(page))[0].value[1].id).toBe(first);
});

for(const theme of ['light','dark'] as const)test(`drag preview follows pointer and Escape restores rows in ${theme}`,async({page},info)=>{
 await page.emulateMedia({colorScheme:theme,reducedMotion:'no-preference'});await edit(page);
 const rows=editor(page).locator('[data-sort-id]'),before=await rows.evaluateAll(es=>es.map(e=>e.getAttribute('data-sort-id')));
 const handle=await rows.first().locator('.sort-handle').boundingBox(),target=await rows.nth(1).boundingBox();
 await page.mouse.move(handle!.x+handle!.width/2,handle!.y+handle!.height/2);await page.mouse.down();
 await page.mouse.move(target!.x+target!.width-20,target!.y+target!.height*.65,{steps:12});
 await expect(rows.first()).toHaveAttribute('data-sort-dragging','true');
 await page.waitForTimeout(200);await page.screenshot({path:info.outputPath(`lifted-row-${theme}.png`)});
 await page.keyboard.press('Escape');await page.mouse.up();
 await expect(editor(page)).toBeVisible();await expect(editor(page).locator('[data-sort-dragging]')).toHaveCount(0);
 expect(await rows.evaluateAll(es=>es.map(e=>e.getAttribute('data-sort-id')))).toEqual(before);
 expect(await requests(page)).toHaveLength(0);
});
