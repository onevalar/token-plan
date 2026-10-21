import {test,expect,type Page} from '@playwright/test';
import {mockDesktop} from './mock';
import {largeDesktop} from './fixtures/largeDesktop';
import {textFor} from '../src/copy';
import {messages} from '../src/i18n';

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
 await visible(page).getByRole('button',{name:'Codex',exact:true}).click();
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
 await page.getByRole('button',{name:'Claude first@example.com',exact:true}).click();
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
 await page.getByRole('button',{name:'Claude first@example.com',exact:true}).click();
 await expect(visible(page).getByText('暂无用量历史。',{exact:true})).toBeVisible();
 await expect(visible(page).locator('.history-totals')).toHaveCount(0);
 await back(page);
 await page.getByRole('button',{name:'Claude second.with.a.long.address@example.com',exact:true}).click();
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
  if(screen==='detail')await page.getByRole('button',{name:'Codex',exact:true}).click();
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
 await setup(page,data);await page.getByRole('button',{name:'Claude first@example.com',exact:true}).click();
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
 await page.getByRole('button',{name:'Claude first@example.com',exact:true}).click();
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
 await setup(page);await page.getByRole('button',{name:'Claude first@example.com',exact:true}).click();
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
