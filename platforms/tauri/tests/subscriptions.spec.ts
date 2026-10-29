import {test,expect,type Page} from '@playwright/test';
import {mockDesktop} from './mock';
import {largeDesktop} from './fixtures/largeDesktop';
const visible=(page:Page)=>page.locator('.preview-page:not([hidden])');
const editor=(page:Page)=>visible(page).locator('.home-metric-editor');
const back=(page:Page)=>page.getByRole('button',{name:'返回',exact:true}).click();
async function menu(page:Page,name:string){await page.getByRole('button',{name:'更多',exact:true}).click();await page.getByRole('menuitem',{name,exact:true}).click();}
async function mode(page:Page,name:string){await page.getByRole('combobox',{name:'应用方式',exact:true}).click();await page.getByRole('option',{name,exact:true}).click();}
async function style(page:Page,name:string){const toggle=visible(page).getByRole('button',{name:/^用量样式/});if(await toggle.getAttribute('aria-expanded')==='false')await toggle.click();const [category,variant]=({'分段额度条':['分格','单行'],'紧凑环形':['环形','单环'],'醒目数字':['版式与数字','醒目数字']} as Record<string,string[]>)[name]??[name];await visible(page).getByRole('group',{name:'用量样式',exact:true}).getByRole('button',{name:category,exact:true}).click();if(variant){await visible(page).getByRole('combobox',{name:'子样式',exact:true}).click();await page.getByRole('option',{name:variant,exact:true}).click();}}
async function edit(page:Page){await page.getByRole('button',{name:'Claude first@example.com',exact:true}).click();await page.getByRole('button',{name:'编辑首页显示',exact:true}).click();}
const done=(page:Page)=>page.locator('header').getByRole('button',{name:'完成',exact:true}).click();
test.beforeEach(async({page},info)=>{
 await page.addInitScript(platform=>(window as any).__panelFrame={platform,rounded:platform==='macos'},String(info.project.metadata.platform));
 await mockDesktop(page,'zh-Hans',false,largeDesktop());await page.goto('/');
});
test('each account has its own style; changes apply at once and mode switching preserves choices',async({page})=>{
 await menu(page,'通用设置');await style(page,'分段额度条');await mode(page,'按订阅服务自定义');
 await expect(visible(page).locator('.usage-style-picker')).toHaveCount(0);
 await expect(visible(page)).toContainText('订阅服务详情');await back(page);
 await edit(page);await expect(visible(page)).not.toContainText('以下设置只影响');
 await style(page,'紧凑环形');
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('tokenplan.homeUsagePreferences')!).accounts)).toEqual({claude:'rings'});
 await done(page);
 await expect(visible(page).locator('.detail-group .home-metrics')).toHaveAttribute('data-style','rings');
 await back(page);
 await expect(page.locator('.account-block').first()).toHaveAttribute('data-usage-style','rings');
 await expect(page.locator('.account-block').nth(1)).toHaveAttribute('data-usage-style','segments');
 await menu(page,'通用设置');await mode(page,'全局统一');await style(page,'醒目数字');await back(page);
 await expect(page.locator('.account-block').first()).toHaveAttribute('data-usage-style','numbers');
 await edit(page);await expect(visible(page).locator('.usage-style-picker')).toHaveCount(0);await done(page);await back(page);
 await menu(page,'通用设置');await mode(page,'按订阅服务自定义');await back(page);await page.reload();
 await expect(page.locator('.account-block').first()).toHaveAttribute('data-usage-style','rings');
 await expect(page.locator('.account-block').nth(1)).toHaveAttribute('data-usage-style','segments');
});
test('a rejected layout keeps the immediately applied account style',async({page})=>{
 await menu(page,'通用设置');await mode(page,'按订阅服务自定义');await back(page);await edit(page);await style(page,'紧凑环形');
 await page.evaluate(()=>(window as any).__failNextRequest=true);
 await editor(page).locator('.metric-edit-row').first().getByRole('combobox').click();await page.getByRole('option',{name:'隐藏',exact:true}).click();
 await expect(visible(page).getByRole('alert')).toBeVisible();
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('tokenplan.homeUsagePreferences')!).accounts)).toEqual({claude:'rings'});
 await expect(editor(page).getByRole('combobox').first()).toContainText('单环');
 await done(page);await back(page);
 await expect(page.locator('.account-block').first()).toHaveAttribute('data-usage-style','rings');
});
for(const theme of ['light','dark'] as const)test(`subscription management has direct controls without detail links in ${theme}`,async({page},info)=>{
 await page.emulateMedia({colorScheme:theme});
 await page.getByRole('button',{name:'更多',exact:true}).click();await expect(page.getByRole('menuitem').nth(0)).toHaveText('通用设置');await expect(page.getByRole('menuitem').nth(1)).toHaveText('订阅管理');await expect(page.getByRole('menuitem').nth(2)).toHaveText('用量统计');
 await page.getByRole('menuitem',{name:'订阅管理',exact:true}).click();
 await expect(visible(page).getByRole('button',{name:'Claude first@example.com',exact:true})).toHaveCount(0);
 const first=visible(page).locator('.managed-account').first();await first.getByRole('switch').click();await expect(first.getByRole('switch')).not.toBeChecked();
 await page.getByRole('button',{name:'排序',exact:true}).click();await visible(page).getByRole('button',{name:'拖动排序 · first@example.com',exact:true}).press('ArrowDown');await page.getByRole('button',{name:'完成',exact:true}).click();
 await expect(visible(page).locator('.managed-account').nth(1)).toContainText('first@example.com');
 await page.screenshot({path:info.outputPath(`subscriptions-${theme}.png`)});
 await page.getByRole('button',{name:'账号操作 · first@example.com',exact:true}).click();await page.getByRole('menuitem',{name:'移除账号',exact:true}).click();
 await expect(visible(page).locator('.subscription-remove')).toContainText('终端登录和历史记录会保留');
 await page.waitForTimeout(300);await visible(page).locator('.subscription-remove').getByRole('button',{name:'移除账号',exact:true}).click();
 await expect(visible(page).locator('.managed-account').filter({hasText:'first@example.com'})).toHaveCount(0);
 await expect(page.getByRole('heading',{level:1})).toHaveText('订阅管理');
});
for(const family of ['Claude','Codex'])test(`${family} setup survives restart, reuses one directory, and accepts only that directory's account`,async({page},info)=>{
 await menu(page,'订阅管理');await page.getByRole('button',{name:'添加账号',exact:true}).click();await visible(page).getByRole('button',{name:family,exact:true}).click();
 await page.getByRole('textbox',{name:'账号备注（可选）',exact:true}).fill('Work');await page.getByRole('button',{name:'创建独立账号并登录',exact:true}).click();
 await expect(visible(page).locator('.login-command')).toContainText(`/${family.toLowerCase()}-account1`);
 await page.getByRole('button',{name:'重新打开终端',exact:true}).click();
 expect(await page.evaluate(()=>(window as any).__loginDirectories)).toEqual([`/isolated/${family.toLowerCase()}-account1`,`/isolated/${family.toLowerCase()}-account1`]);
 await page.reload();await menu(page,'订阅管理');await expect(visible(page).locator('.pending-account')).toContainText('Work');
 await page.getByRole('button',{name:'继续连接',exact:true}).click();await page.getByRole('button',{name:'打开终端登录',exact:true}).click();
 await page.getByRole('button',{name:'我已登录，重新检查',exact:true}).click();
 await expect(visible(page).getByRole('status')).toContainText('这个目录中还没有检测到');
 await page.screenshot({path:info.outputPath(`${family}-setup.png`)});
 await page.evaluate(family=>{(window as any).__discover=(state:any)=>{const original=state.accounts.find((a:any)=>a.family===family);state.accounts.push({...original,id:family+':new',email:'new@example.com',note:'',enabled:false,added:false,loginDirectories:[`/isolated/${family}-account1`]});};},family.toLowerCase());
 await page.getByRole('button',{name:'我已登录，重新检查',exact:true}).click();
 await expect(page.getByRole('heading',{level:1})).toHaveText('订阅管理');await expect(visible(page).locator('.pending-account')).toHaveCount(0);
 await expect(visible(page).locator('.managed-account').filter({hasText:'new@example.com'})).toContainText('Work');
 expect(await page.evaluate(()=>localStorage.getItem('fixture.setupIndex'))).toBe('1');
});

for(const theme of ['light','dark'] as const)test(`simplified settings and account actions in ${theme}`,async({page},info)=>{
 await page.emulateMedia({colorScheme:theme});
 await page.getByRole('button',{name:'Claude first@example.com',exact:true}).click();
 await expect(visible(page).locator('.last-updated')).toHaveCount(0);
 await expect(visible(page).getByRole('heading',{name:'账号管理',exact:true})).toHaveCount(0);
 const editButton=page.getByRole('button',{name:'编辑首页显示',exact:true});await editButton.scrollIntoViewIfNeeded();
 await page.screenshot({path:info.outputPath(`actions-${theme}.png`)});
 await back(page);await menu(page,'通用设置');
 await expect(page.getByRole('switch',{name:'即将用完',exact:true})).toHaveCount(0);
 await page.getByRole('switch',{name:'开启通知',exact:true}).click();
 await expect(page.getByRole('switch',{name:'即将用完',exact:true})).toBeChecked();
 await page.getByRole('switch',{name:'接近上限',exact:true}).click();
 await page.getByRole('switch',{name:'开启通知',exact:true}).click();
 await expect(page.getByRole('switch',{name:'即将用完',exact:true})).toHaveCount(0);
 expect(await page.evaluate(()=>(window as any).__requests.at(-1).value.notifications)).toEqual([false,false,false]);
 await page.getByRole('switch',{name:'开启通知',exact:true}).click();
 await expect(page.getByRole('switch',{name:'接近上限',exact:true})).toBeChecked();
 const recorder=page.getByRole('button',{name:'录制快捷键',exact:true});await recorder.click();await recorder.press('Control+Shift+J');
 await expect(recorder).toContainText('Control+Shift+KeyJ');await page.getByRole('button',{name:'清除快捷键',exact:true}).click();
 await expect(recorder).toContainText('录制快捷键');await expect(page.getByRole('button',{name:'清除快捷键',exact:true})).toHaveCount(0);
 await page.waitForTimeout(750);await page.screenshot({path:info.outputPath(`notifications-shortcut-${theme}.png`)});
 expect(await visible(page).evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);
 await visible(page).evaluate(e=>e.scrollTop=0);await page.screenshot({path:info.outputPath(`settings-${theme}.png`)});
});

test('account dragging saves on release and keeps its landing position during slow saves',async({page})=>{
 await menu(page,'订阅管理');await page.getByRole('button',{name:'排序',exact:true}).click();
 await page.evaluate(()=>{const api=(window as any).__TAURI_INTERNALS__,invoke=api.invoke;api.invoke=async(command:string,args:any)=>{if(args?.request?.method==='move')await new Promise(r=>setTimeout(r,400));return invoke(command,args);};});
 const rows=visible(page).locator('[data-sort-id]'),first=await rows.first().getAttribute('data-sort-id');
 const handle=await rows.first().locator('.sort-handle').boundingBox(),target=await rows.nth(2).boundingBox();
 await page.mouse.move(handle!.x+handle!.width/2,handle!.y+handle!.height/2);await page.mouse.down();
 await page.mouse.move(target!.x+target!.width-20,target!.y+target!.height*.7,{steps:12});
 await expect(rows.first()).toHaveAttribute('data-sort-dragging','true');
 expect(await page.evaluate(()=>(window as any).__requests.filter((r:any)=>r.method==='move').length)).toBe(0);
 await page.mouse.up();await expect(rows.nth(2)).toHaveAttribute('data-sort-id',first!);
 await expect(rows.locator('.sort-handle').first()).toBeDisabled();
 await expect(rows.locator('.sort-handle').first()).toBeEnabled();
 await expect(rows.nth(2)).toHaveAttribute('data-sort-id',first!);
});

test('failed account reorder restores the saved order after the drag settles',async({page})=>{
 await menu(page,'订阅管理');await page.getByRole('button',{name:'排序',exact:true}).click();
 const rows=visible(page).locator('[data-sort-id]'),before=await rows.evaluateAll(es=>es.map(e=>e.getAttribute('data-sort-id')));
 await page.evaluate(()=>(window as any).__failNextRequest=true);
 const handle=await rows.first().locator('.sort-handle').boundingBox(),target=await rows.nth(1).boundingBox();
 await page.mouse.move(handle!.x+handle!.width/2,handle!.y+handle!.height/2);await page.mouse.down();
 await page.mouse.move(target!.x+target!.width-20,target!.y+target!.height*.65,{steps:10});await page.mouse.up();
 await expect(visible(page).getByRole('alert')).toBeVisible();
 expect(await rows.evaluateAll(es=>es.map(e=>e.getAttribute('data-sort-id')))).toEqual(before);
 await expect(visible(page).locator('[data-sort-dragging]')).toHaveCount(0);
});
