import {test,expect,type Page} from '@playwright/test';
import {mockDesktop} from './mock';
import {largeDesktop} from './fixtures/largeDesktop';
import {textFor} from '../src/copy';
import {messages} from '../src/i18n';

test.beforeEach(async({page},info)=>{await page.addInitScript(platform=>{(window as any).__panelFrame={platform,rounded:platform!=='linux'};},String(info.project.metadata.platform??'macos'));});

const visible=(page:Page)=>page.locator('.preview-page:not([hidden])');
async function menu(page:Page,item:string){await page.getByRole('button',{name:'更多',exact:true}).click();await page.getByRole('menuitem',{name:item,exact:true}).click();}
const back=(page:Page)=>page.getByRole('button',{name:'返回',exact:true}).click();
async function setup(page:Page,data=largeDesktop()) {await mockDesktop(page,'zh-Hans',true,data);await page.goto('/');await expect(page.locator('.mac-preview')).toBeVisible();}
async function noOverflow(page:Page){expect(await visible(page).evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);}

test('contextual navigation scopes refresh and restores origin, tab, range and scroll',async({page})=>{
 await setup(page);
 await menu(page,'服务配置');
 await expect(page.getByRole('heading',{level:1})).toHaveText('服务配置');
 await expect(page.getByRole('button',{name:'刷新',exact:true})).toHaveCount(0);
 await expect(visible(page).locator('.usage-summary')).toHaveCount(0);
 await page.getByRole('button',{name:'排序',exact:true}).click();
 await visible(page).getByRole('button',{name:'Claude second.with.a.long.address@example.com',exact:true}).click();
 await expect(page.getByRole('button',{name:'设置',exact:true})).toHaveAttribute('aria-pressed','true');
 await page.getByRole('button',{name:'用量',exact:true}).click();
 await page.getByRole('button',{name:'刷新',exact:true}).click();
 expect(await page.evaluate(()=>(window as any).__requests.at(-1))).toEqual({method:'refresh',accountId:'claude:second'});
 await page.getByRole('button',{name:'昨天',exact:true}).click();
 await page.getByRole('button',{name:'查看历史',exact:true}).click();
 await expect(page.getByRole('heading',{level:1})).toHaveText('用量历史');
 await expect(page.getByRole('button',{name:'昨天',exact:true})).toHaveAttribute('aria-pressed','true');
 await back(page);
 await expect(page.getByRole('button',{name:'昨天',exact:true})).toHaveAttribute('aria-pressed','true');
 await page.getByRole('button',{name:'设置',exact:true}).click();
 await page.getByRole('textbox',{name:'备注',exact:true}).focus();
 await page.getByRole('textbox',{name:'备注',exact:true}).fill('Draft note');
 expect((await page.locator('.preview-header').boundingBox())!.y).toBeGreaterThanOrEqual(0);
 await back(page);
 await expect(page.getByRole('heading',{level:1})).toHaveText('服务配置');
 await expect(page.getByRole('button',{name:'完成',exact:true})).toBeVisible();
 await back(page);
 await visible(page).evaluate(e=>e.scrollTop=180);
 const scroll=await visible(page).evaluate(e=>e.scrollTop);
 await visible(page).locator('.dashboard').getByRole('button',{name:'Codex',exact:true}).click();
 await back(page);
 expect(await visible(page).evaluate(e=>e.scrollTop)).toBe(scroll);
});

test('settings have compact labels, conditional interval, immediate saves and local failures',async({page})=>{
 await setup(page);await menu(page,'通用设置');
 await expect(page.getByRole('button',{name:'刷新',exact:true})).toHaveCount(0);
 const count=await page.evaluate(()=>(window as any).__requests.length);
 await page.keyboard.press('Meta+r');
 expect(await page.evaluate(()=>(window as any).__requests.length)).toBe(count);
 await expect(page.getByRole('combobox',{name:'刷新间隔',exact:true})).toHaveCount(0);
 await page.getByRole('switch',{name:'自动刷新',exact:true}).click();
 await expect(page.getByRole('combobox',{name:'刷新间隔',exact:true})).toBeVisible();
 await page.getByRole('switch',{name:'自动刷新',exact:true}).click();
 await expect(page.getByRole('combobox',{name:'刷新间隔',exact:true})).toHaveCount(0);
 await page.evaluate(()=>(window as any).__failNextRequest=true);
 await page.getByRole('switch',{name:'显示剩余额度',exact:true}).click();
 await expect(visible(page).getByRole('alert')).toHaveText('保存失败，请重试。');
 await expect(page.getByRole('switch',{name:'显示剩余额度',exact:true})).not.toBeChecked();
 await noOverflow(page);
});

test('service switches preserve accounts; add, reorder and remove return to configuration',async({page})=>{
 const data=largeDesktop();data.accounts.splice(1,0,data.accounts.pop()!);
 await setup(page,data);await menu(page,'服务配置');
 await page.getByRole('button',{name:'排序',exact:true}).click();
 await page.getByRole('button',{name:'上移 Claude second.with.a.long.address@example.com',exact:true}).click();
 await expect(visible(page).locator('.configured-account').first()).toContainText('second.with.a.long.address@example.com');
 await page.getByRole('button',{name:'完成',exact:true}).click();
 await page.getByRole('switch',{name:'显示账号 Claude first@example.com',exact:true}).click();
 await expect(visible(page).locator('.configured-account')).toHaveCount(6);
 await page.getByRole('button',{name:'添加服务',exact:true}).click();
 await page.getByRole('textbox',{name:'搜索服务',exact:true}).fill('first@example.com');
 await expect(visible(page).locator('.configured-account')).toHaveCount(1);
 await page.getByRole('switch',{name:'显示账号 Claude first@example.com',exact:true}).click();
 await back(page);
 await expect(visible(page).locator('.configured-account')).toHaveCount(7);
 await visible(page).getByRole('button',{name:'Claude first@example.com',exact:true}).click();
 await page.getByRole('button',{name:'移除账号',exact:true}).click();
 await expect(page.getByRole('group').getByRole('button',{name:'移除账号',exact:true})).toBeEnabled();
 // Arc ignores presses within 280ms of opening, preventing the original click from confirming.
 await page.waitForTimeout(300);
 await page.getByRole('group').getByRole('button',{name:'移除账号',exact:true}).click();
 await expect(page.getByRole('heading',{level:1})).toHaveText('服务配置');
 await expect(visible(page).locator('.configured-account')).toHaveCount(6);
});

test('history supports account filtering, pagination and model details without double summaries',async({page})=>{
 await setup(page);await menu(page,'用量历史');
 await expect(visible(page).locator('.day-record')).toHaveCount(7);
 await page.getByRole('button',{name:'下一页',exact:true}).click();
 await expect(visible(page).locator('.pagination').first()).toContainText('2 / 5');
 await page.getByRole('combobox',{name:'账号',exact:true}).click();
 await page.getByRole('option',{name:'Claude · first@example.com',exact:true}).click();
 await expect(visible(page).locator('.pagination').first()).toContainText('1 / 5');
 await visible(page).locator('.day-trigger').first().click();
 await expect(visible(page).locator('.history-entry')).toHaveCount(1);
 await visible(page).locator('.entry-trigger').click();
 await expect(visible(page).locator('.model-record')).toContainText('synthetic-model');
 await expect(visible(page).locator('.usage-summary')).toHaveCount(1);
 await noOverflow(page);
});

test('missing history and unknown prices stay unknown; popup Escape keeps panel open',async({page})=>{
 const data=largeDesktop();data.accounts[0].history=[];data.accounts[1].history.forEach(r=>r.cost=null);
 await setup(page,data);
 await page.locator('.dashboard').getByRole('button',{name:'Claude first@example.com',exact:true}).click();
 await expect(visible(page).getByText('暂无用量历史。',{exact:true})).toBeVisible();
 await expect(visible(page).locator('.history-totals')).toHaveCount(0);
 await back(page);
 await page.locator('.dashboard').getByRole('button',{name:'Claude second.with.a.long.address@example.com',exact:true}).click();
 await expect(visible(page).locator('.history-totals dd').first()).toHaveText('—');
 await back(page);await menu(page,'通用设置');
 await page.getByRole('combobox',{name:'语言',exact:true}).click();
 await page.keyboard.press('Escape');
 await expect(page.getByRole('listbox')).toHaveCount(0);
 expect(await page.evaluate(()=>(window as any).__panelHides??0)).toBe(0);
 await page.keyboard.press('Escape');
 expect(await page.evaluate(()=>(window as any).__panelHides??0)).toBe(1);
});

for(const theme of ['light','dark'] as const)test(`390px visual review ${theme}`,async({page},info)=>{
 await page.emulateMedia({colorScheme:theme});
 const data=largeDesktop(),codex=data.accounts.find(a=>a.family==='codex')!;
 codex.metrics.push({...codex.metrics[0],id:'codex.rateLimitResets',label:'Rate Limit Resets',percent:null,periodSeconds:null,placement:'details',unit:'count',amount:3,hasData:true,expiries:['2026-10-23T04:47:31Z','2026-10-30T03:01:06Z','2026-11-07T07:31:20Z']});
 await setup(page,data);
 for(const screen of ['home','detail','account-settings','configure','settings','history']){
  if(screen==='detail')await page.locator('.dashboard').getByRole('button',{name:'Codex',exact:true}).click();
  if(screen==='account-settings')await page.getByRole('button',{name:'设置',exact:true}).click();
  if(screen==='configure'){await back(page);await menu(page,'服务配置');}
  if(screen==='settings'){await back(page);await menu(page,'通用设置');}
  if(screen==='history'){await back(page);await menu(page,'用量历史');}
  await noOverflow(page);
  await expect(page.locator('h1:visible')).toHaveCount(1);
  await page.screenshot({path:info.outputPath(`${screen}-${theme}.png`),animations:'disabled'});
 }
});

test('summary keeps metric-only history when daily records are unavailable',async({page})=>{
 const data=largeDesktop(),a=data.accounts[0];a.history=[];
 a.metrics.push({...a.metrics[0],id:'claude.last30',label:'Last 30 Days',percent:null,periodSeconds:null,unit:'dollars',amount:12.5,values:[]});
 await setup(page,data);await page.locator('.dashboard').getByRole('button',{name:'Claude first@example.com',exact:true}).click();
 await expect(visible(page).locator('.history-fallback')).toContainText('$12.50');
 await expect(visible(page).getByText('暂无用量历史。',{exact:true})).toHaveCount(0);
});

for(const language of ['en','zh-Hant','ja','ko'])test(`compact controls and removal confirmation in ${language}`,async({page})=>{
 const t=textFor(language),basic=messages(language);
 await mockDesktop(page,language,false,largeDesktop());await page.goto('/');
 await page.getByRole('button',{name:basic.more,exact:true}).click();
 await page.getByRole('menuitem',{name:t.settings,exact:true}).click();await noOverflow(page);
 await page.getByRole('button',{name:basic.back,exact:true}).click();
 await page.getByRole('button',{name:basic.more,exact:true}).click();
 await page.getByRole('menuitem',{name:t.configure,exact:true}).click();
 await visible(page).getByRole('button',{name:'Claude first@example.com',exact:true}).click();
 await page.getByRole('button',{name:t.remove,exact:true}).click();
 await expect(page.getByRole('group').getByRole('button',{name:t.remove,exact:true})).toBeVisible();
 await noOverflow(page);
 const confirm=await page.getByRole('group').getByRole('button',{name:t.remove,exact:true}).boundingBox();
 expect(confirm!.x+confirm!.width).toBeLessThanOrEqual(390);
});


test('home density persists, reduces space without dropping metrics, and toolbar controls match',async({page},info)=>{
 await setup(page);
 const home=visible(page),metrics=await home.locator('.metric').count();
 const compactHeight=await home.locator('.provider').first().evaluate(e=>e.getBoundingClientRect().height);
 const font=await home.locator('.metric-name').first().evaluate(e=>getComputedStyle(e).fontSize);
 await expect(page.locator('.mac-preview')).toHaveAttribute('data-density','compact');
 const refresh=await page.getByRole('button',{name:'刷新',exact:true}).boundingBox();
 const more=page.getByRole('button',{name:'更多',exact:true});
 expect((await more.boundingBox())!.width).toBe(refresh!.width);
 expect(await more.innerText()).toBe('');
 await menu(page,'通用设置');
 await expect(visible(page).getByText('iCloud',{exact:true})).toHaveCount(0);
 await expect(page.getByRole('switch',{name:'跨 Mac 同步',exact:true})).toHaveCount(0);
 await page.getByRole('combobox',{name:'首页布局',exact:true}).click();
 await page.getByRole('option',{name:'宽松',exact:true}).click();
 await back(page);
 expect(await home.locator('.metric').count()).toBe(metrics);
 expect(await home.locator('.metric-name').first().evaluate(e=>getComputedStyle(e).fontSize)).toBe(font);
 const comfortableHeight=await home.locator('.provider').first().evaluate(e=>e.getBoundingClientRect().height);
 expect(compactHeight).toBeLessThan(comfortableHeight*.85);
 await page.screenshot({path:info.outputPath('home-comfortable.png'),animations:'disabled'});
 await page.reload();
 await expect(page.locator('.mac-preview')).toHaveAttribute('data-density','comfortable');
 await noOverflow(page);
});

test('account note saves inline and removal shares its right alignment',async({page})=>{
 await setup(page);await page.locator('.dashboard').getByRole('button',{name:'Claude first@example.com',exact:true}).click();
 await page.getByRole('button',{name:'设置',exact:true}).click();
 const note=page.getByRole('textbox',{name:'备注',exact:true});
 await note.fill('Local note');
 const save=page.getByRole('button',{name:'保存',exact:true});
 await save.click();
 expect(await page.evaluate(()=>(window as any).__requests.at(-1))).toEqual({method:'note',accountId:'claude',value:'Local note'});
 await expect(save).toBeDisabled();
 const inputBox=(await note.boundingBox())!,saveBox=(await save.boundingBox())!;
 expect(Math.abs(inputBox.y-saveBox.y)).toBeLessThan(1);
 await page.getByRole('button',{name:'移除账号',exact:true}).scrollIntoViewIfNeeded();
 const removeBox=(await page.getByRole('button',{name:'移除账号',exact:true}).boundingBox())!;
 expect(Math.abs(removeBox.x+removeBox.width-saveBox.x-saveBox.width)).toBeLessThan(1);
 await noOverflow(page);
});

for(const theme of ['light','dark'] as const)test(`ring layout and three metrics stay consistent in ${theme}`,async({page},info)=>{
 await page.emulateMedia({colorScheme:theme});
 const data=largeDesktop(),a=data.accounts[0];data.settings.trayStyle='ring';
 data.accounts.forEach(x=>x.tray=x.id===a.id);
 a.metrics=[0,1,2,3].map((i)=>({...a.metrics[0],id:`test.${i}`,label:['Session','Weekly','Monthly','Extra'][i],periodSeconds:[18000,604800,2592000,3600][i],percent:[25,50,75,90][i],pinned:i<2,pinnable:true,hasData:true}));
 await setup(page,data);await menu(page,'通用设置');
 await expect(page.getByRole('button',{name:'圆环内',exact:true})).toHaveAttribute('aria-pressed','true');
 await page.getByRole('button',{name:'圆环左侧',exact:true}).click();
 await expect(page.getByRole('button',{name:'圆环左侧',exact:true})).toHaveAttribute('aria-pressed','true');
 await expect(visible(page).locator('.menu-bar-preview .tray-glyph')).toHaveAttribute('data-layout','left');
 expect(await page.evaluate(()=>(window as any).__requests.at(-1))).toEqual({method:'settings',value:{ringIconPosition:'left'}});
 await back(page);await page.locator('.dashboard').getByRole('button',{name:'Claude first@example.com',exact:true}).click();
 await page.getByRole('button',{name:'设置',exact:true}).click();
 const rows=visible(page).locator('.placement-row');
 await rows.nth(2).getByRole('switch').click();
 await expect(rows.nth(2).getByRole('switch')).toBeChecked();
 await expect(rows.nth(3).getByRole('switch')).toBeDisabled();
 await expect(visible(page).locator('.ring-legend')).toContainText('外环');
 await expect(visible(page).locator('.ring-legend')).toContainText('中环');
 await expect(visible(page).locator('.ring-legend')).toContainText('内环');
 await expect(visible(page).locator('.account-tray-preview svg > g')).toHaveCount(3);
 await noOverflow(page);
 await page.screenshot({path:info.outputPath(`three-metric-account-${theme}.png`),animations:'disabled'});
 await back(page);await menu(page,'通用设置');
 await page.getByRole('button',{name:'圆环内',exact:true}).click();
 // Preserve inside preference, but keep a legible logo beside three rings.
 await expect(visible(page).locator('.menu-bar-preview .tray-glyph')).toHaveAttribute('data-layout','left');
 await page.getByRole('button',{name:'圆环左侧',exact:true}).click();
 await visible(page).locator('.ring-layout-picker').scrollIntoViewIfNeeded();
 await page.screenshot({path:info.outputPath(`ring-layout-settings-${theme}.png`),animations:'disabled'});
 await page.getByRole('combobox',{name:/菜单栏样式|托盘样式/,exact:true}).click();
 await page.getByRole('option',{name:'百分比',exact:true}).click();
 await expect(visible(page).locator('.ring-layout-picker')).toHaveCount(0);
 await expect(visible(page).locator('.menu-bar-preview .tray-values > span')).toHaveCount(3);
 await expect(visible(page).locator('.menu-bar-preview .tray-values')).toHaveText('25%50%75%');
 await page.getByRole('combobox',{name:/菜单栏样式|托盘样式/,exact:true}).click();
 await page.getByRole('option',{name:'环形',exact:true}).click();
 await expect(page.getByRole('button',{name:'圆环左侧',exact:true})).toHaveAttribute('aria-pressed','true');
 await expect(visible(page).locator('.menu-bar-preview svg > g')).toHaveCount(3);
 // Failed persistence must leave the selected layout and preview unchanged.
 await page.evaluate(()=>{(window as any).__failNextRequest=true;});
 await page.getByRole('button',{name:'圆环内',exact:true}).click();
 await expect(page.getByRole('alert')).toBeVisible();
 await expect(page.getByRole('button',{name:'圆环左侧',exact:true})).toHaveAttribute('aria-pressed','true');
});

test('three-ring badges share the center and keep a compact stable footprint',async({page},info)=>{
 const data=largeDesktop();
 data.accounts.forEach(a=>a.tray=a.family==='claude');
 for(const a of data.accounts.filter(a=>a.family==='claude'))a.metrics=[25,50,75].map((percent,i)=>({...a.metrics[0],id:`ring.${i}`,label:`Ring ${i+1}`,percent,pinned:true,hasData:true,unit:'percent'}));
 await setup(page,data);await menu(page,'通用设置');
 const glyphs=visible(page).locator('.menu-bar-preview .tray-glyph');
 await expect(glyphs).toHaveCount(2);
 await expect(glyphs.locator('.tray-center-badge')).toHaveText(['1','2']);
 await expect(glyphs.locator('sup')).toHaveCount(0);
 for(const glyph of await glyphs.all())expect((await glyph.boundingBox())!.width).toBeCloseTo(53.2,0);
 await glyphs.first().scrollIntoViewIfNeeded();
 await page.screenshot({path:info.outputPath('compact-three-ring-badges.png'),animations:'disabled'});
 await back(page);
 if(info.project.metadata.platform!=='macos'){
  await expect(visible(page).locator('.tray-panel-strip .tray-center-badge')).toHaveText(['1','2']);
  await visible(page).locator('.tray-panel-account').first().click();
  await expect(page.getByRole('heading',{level:1})).toHaveText('Claude');
 }
});

test('production update entry preserves errors and the about page is not a design preview',async({page})=>{
 await setup(page);await menu(page,'检查更新');
 await page.getByRole('button',{name:'检查更新',exact:true}).click();
 await expect(page.getByRole('status')).toContainText('9.9.9');
 await page.getByRole('button',{name:'安装并重启',exact:true}).click();
 await expect(page.getByRole('status')).toContainText('更新安装失败');
 await back(page);await menu(page,'关于');
 await expect(visible(page)).not.toContainText('设计预览');
 await expect(page.getByRole('heading',{level:1})).toHaveText('关于');
});

test('account drafts survive navigation without being saved and return restores the trigger',async({page})=>{
 const data=largeDesktop();data.accounts[0].apiKey=true;
 await setup(page,data);
 const first=page.locator('.dashboard').getByRole('button',{name:'Claude first@example.com',exact:true});
 await first.focus();await page.keyboard.press('Enter');
 await page.getByRole('button',{name:'设置',exact:true}).click();
 await page.getByRole('textbox',{name:'备注',exact:true}).fill('Unsaved first account');
 await page.getByRole('textbox',{name:'API 密钥',exact:true}).fill('synthetic-test-key');
 await back(page);await expect(first).toBeFocused();
 await page.locator('.dashboard').getByRole('button',{name:'Claude second.with.a.long.address@example.com',exact:true}).click();
 await page.getByRole('button',{name:'设置',exact:true}).click();
 await expect(page.getByRole('textbox',{name:'备注',exact:true})).not.toHaveValue('Unsaved first account');
 await back(page);await first.click();await page.getByRole('button',{name:'设置',exact:true}).click();
 await expect(page.getByRole('textbox',{name:'备注',exact:true})).toHaveValue('Unsaved first account');
 const key=page.getByRole('textbox',{name:'API 密钥',exact:true});
 await expect(key).toHaveValue('synthetic-test-key');
 expect(await page.evaluate(()=>(window as any).__requests.filter((r:any)=>r.method==='note'))).toHaveLength(0);
 await visible(page).locator('form').filter({has:key}).getByRole('button',{name:'保存',exact:true}).click();
 await expect(key).toHaveValue('');
 await expect(page.getByRole('textbox',{name:'备注',exact:true})).toHaveValue('Unsaved first account');
 await page.getByRole('button',{name:'用量',exact:true}).click();
 const history=page.getByRole('button',{name:'查看历史',exact:true});
 await history.click();await back(page);await expect(history).toBeFocused();
 await back(page);await menu(page,'通用设置');await back(page);
 await expect(page.getByRole('button',{name:'更多',exact:true})).toBeFocused();
});

test('note saves report pending, failure and success nearby and long content stays within the panel',async({page})=>{
 await setup(page);await page.locator('.dashboard').getByRole('button',{name:'Claude first@example.com',exact:true}).click();
 await page.getByRole('button',{name:'设置',exact:true}).click();
 const note=page.getByRole('textbox',{name:'备注',exact:true}),form=visible(page).locator('form').filter({has:note});
 const value='audit_identifier_'.repeat(14);
 await note.fill(value);
 await page.evaluate(()=>{const api=(window as any).__TAURI_INTERNALS__,invoke=api.invoke;api.invoke=async(command:string,args:any)=>{if(args?.request?.method==='note')await new Promise(r=>setTimeout(r,700));return invoke(command,args);};(window as any).__failNextRequest=true;});
 await form.getByRole('button',{name:'保存',exact:true}).click();
 await expect(form.getByRole('button')).toHaveAttribute('aria-busy','true');
 await expect(form.getByRole('alert')).toContainText('保存失败');
 await expect(note).toHaveValue(value);
 await form.getByRole('button',{name:'保存',exact:true}).click();
 await expect(form.getByRole('status')).toHaveText('已保存');
 await page.getByRole('button',{name:'用量',exact:true}).click();
 await expect(visible(page)).toContainText(value);await noOverflow(page);
});

test('quota readings retain accessible used and remaining names without explanatory copy',async({page})=>{
 await setup(page);
 await expect(visible(page).getByRole('progressbar').first()).toHaveAccessibleName(/已用/);
 await expect(visible(page).getByText(/已用|距重置/)).toHaveCount(0);
 await menu(page,'通用设置');await page.getByRole('switch',{name:'显示剩余额度',exact:true}).click();await back(page);
 await expect(visible(page).getByRole('progressbar').first()).toHaveAccessibleName(/剩余/);
 await expect(visible(page).getByText(/剩余|距重置/)).toHaveCount(0);
 await page.locator('.dashboard').getByRole('button',{name:'Claude first@example.com',exact:true}).click();
 await expect(visible(page).getByRole('progressbar').first()).toHaveAccessibleName(/剩余/);
 await expect(visible(page).getByText(/剩余|距重置/)).toHaveCount(0);
});

test('content height follows the active page and shrinks after returning to one service',async({page})=>{
 const data=largeDesktop();data.accounts.forEach((a,i)=>{a.enabled=i===0;});
 await setup(page,data);
 await expect.poll(()=>page.evaluate(()=>(window as any).__panelHeights?.at(-1))).toBeGreaterThan(100);
 const home=await page.evaluate(()=>(window as any).__panelHeights.at(-1));
 expect(home).toBeLessThan(500);
 await menu(page,'通用设置');
 await expect.poll(()=>page.evaluate(()=>(window as any).__panelHeights.at(-1))).toBeGreaterThan(home);
 await back(page);
 await expect.poll(()=>page.evaluate(()=>(window as any).__panelHeights.at(-1))).toBe(home);
});

test('account setup guides isolated login and detection without restarting',async({page},info)=>{
 await setup(page);await menu(page,'服务配置');await page.getByRole('button',{name:'添加服务',exact:true}).click();
 const scan=page.getByRole('button',{name:'重新检测账号',exact:true});
 await expect(scan).toBeEnabled();
 await page.evaluate(()=>(window as any).__failNextRequest=true);
 await scan.click();
 await expect(visible(page).getByRole('alert').filter({hasText:'操作未完成'})).toBeVisible();
 await scan.click();
 await expect(visible(page).getByRole('status')).toContainText('检测完成');
 await page.getByRole('button',{name:'登录新账号',exact:true}).click();
 await expect(page.locator('.login-command')).toContainText('CLAUDE_CONFIG_DIR=/isolated');
 expect(await page.evaluate(()=>(window as any).__loginProviders)).toEqual(['claude']);
 await page.screenshot({path:info.outputPath('account-login-guide.png')});
 await page.getByRole('button',{name:'已完成登录，重新检测',exact:true}).click();
 expect(await page.evaluate(()=>(window as any).__requests.at(-1).method)).toBe('discover');
 await page.getByRole('button',{name:'连接已有配置目录',exact:true}).click();
 await page.getByRole('textbox',{name:'配置目录',exact:true}).fill('invalid');
 await page.getByRole('button',{name:'连接并检测',exact:true}).click();
 await expect(visible(page).getByRole('alert').filter({hasText:'操作未完成'})).toBeVisible();
 await page.getByRole('textbox',{name:'配置目录',exact:true}).fill('/custom/account');
 await page.getByRole('button',{name:'连接并检测',exact:true}).click();
 await expect(visible(page).getByRole('status')).toContainText('检测完成');
 expect(await page.evaluate(()=>(window as any).__directories.at(-1))).toEqual({provider:'claude',directory:'/custom/account'});
 await noOverflow(page);
});

test('unavailable saved account remains configurable and offers reconnect guidance',async({page})=>{
 const data=largeDesktop();const account=data.accounts[0];account.error='Account saved. Reconnect its login, then detect accounts again.';account.metrics=[];
 await setup(page,data);
 await visible(page).locator('.dashboard').getByRole('button',{name:`${account.name} ${account.email}`,exact:true}).click();
 await expect(page.getByRole('button',{name:'登录新账号',exact:true})).toBeVisible();
 await expect(visible(page).getByText('账号已保留。请重新连接登录后，再检测账号。',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'设置',exact:true}).click();
 await expect(page.getByRole('textbox',{name:'备注',exact:true})).toBeVisible();
 await noOverflow(page);
});
