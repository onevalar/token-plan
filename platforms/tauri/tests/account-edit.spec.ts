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
 const actions=visible(page).locator('.account-action-row');
 await expect(actions.getByRole('button')).toHaveCount(2);
 const tops=await actions.getByRole('button').evaluateAll(buttons=>buttons.map(button=>button.getBoundingClientRect().top));
 expect(Math.max(...tops)-Math.min(...tops)).toBeLessThan(1);
 await page.screenshot({path:info.outputPath(`detail-${theme}.png`)});
 await edit(page);
 await expect(visible(page).locator('.history-overview,.account-configuration,.detail-group')).toHaveCount(0);
 await expect(page.getByRole('button',{name:'刷新',exact:true})).toHaveCount(0);
 await expect(editor(page)).toBeFocused();
 expect(await visible(page).evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);
 await page.screenshot({path:info.outputPath(`editor-${theme}.png`)});
});
test('placement and order save at once, and header Done leaves without another write',async({page})=>{
 await edit(page);await placeFirst(page,'隐藏');
 await expect.poll(async()=>(await requests(page)).length).toBe(1);
 const first=await requests(page);expect(first[0]).toMatchObject({method:'metricLayout',accountId:'claude'});
 expect(first[0].value[0]).toMatchObject({id:'session',placement:'hidden'});
 await editor(page).getByRole('button',{name:/^拖动排序/}).first().press('ArrowDown');
 await expect.poll(async()=>(await requests(page)).length).toBe(2);
 const order=await editor(page).locator('.placement-row > span').allTextContents();
 await page.locator('header').getByRole('button',{name:'完成',exact:true}).click();
 await expect(editor(page)).toHaveCount(0);expect(await requests(page)).toHaveLength(2);
 await expect(page.getByRole('button',{name:'编辑首页显示',exact:true})).toBeFocused();
 await edit(page);await expect(editor(page).locator('.placement-row > span')).toHaveText(order);
 await expect(editor(page).getByRole('combobox').nth(1)).toContainText('隐藏');
 await page.keyboard.press('Escape');await expect(editor(page)).toHaveCount(0);
 await page.getByRole('button',{name:'返回',exact:true}).click();
 await expect(visible(page).locator('.account-block').first().locator('.metric')).toHaveCount(1);
 await expect(visible(page).locator('.account-block').nth(1).locator('.metric')).toHaveCount(2);
});
test('a rejected layout restores the last accepted one and stays ready to retry',async({page})=>{
 await edit(page);
 await page.evaluate(()=>{const api=(window as any).__TAURI_INTERNALS__,invoke=api.invoke;api.invoke=async(command:string,args:any)=>{if(args?.request?.method==='metricLayout')await new Promise(r=>setTimeout(r,700));return invoke(command,args);};(window as any).__failNextRequest=true;});
 await placeFirst(page,'隐藏');
 await expect(editor(page).getByRole('alert')).toBeVisible();
 await expect(editor(page).getByRole('combobox').first()).toContainText('首页显示');
 expect(await requests(page)).toHaveLength(1);
 await placeFirst(page,'隐藏');
 await expect(editor(page).getByRole('alert')).toHaveCount(0);
 await expect(editor(page).getByRole('combobox').first()).toContainText('隐藏');
 await expect.poll(async()=>(await requests(page)).length).toBe(2);
});
test('dragging a metric commits its order on drop and survives reopening',async({page})=>{
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
 await expect(rows.first()).toHaveAttribute('data-sort-id',second!);
 await expect.poll(async()=>(await requests(page)).length).toBe(1);
 expect((await requests(page))[0].value[1].id).toBe(first);
 await page.locator('header').getByRole('button',{name:'完成',exact:true}).click();
 await edit(page);await expect(editor(page).locator('[data-sort-id]').first()).toHaveAttribute('data-sort-id',second!);
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
