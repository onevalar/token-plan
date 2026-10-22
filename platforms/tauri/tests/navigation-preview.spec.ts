import {test,expect,type Page} from '@playwright/test';
import {mockDesktop} from './mock';
import {largeDesktop} from './fixtures/largeDesktop';
import {textFor} from '../src/copy';
import {messages} from '../src/i18n';
import providerTranslations from '../src/provider-translations.json' with {type:'json'};

test.beforeEach(async({page},info)=>{await page.addInitScript(platform=>{(window as any).__panelFrame={platform,rounded:platform!=='linux'};},String(info.project.metadata.platform??'macos'));});

const visible=(page:Page)=>page.locator('.preview-page:not([hidden])');
async function menu(page:Page,item:string){await page.getByRole('button',{name:'更多',exact:true}).click();await page.getByRole('menuitem',{name:item,exact:true}).click();}
async function openNote(page:Page){const add=page.getByRole('button',{name:'添加备注',exact:true});if(await add.count())await add.click();else await page.getByRole('button',{name:'编辑',exact:true}).click();}
const back=(page:Page)=>page.getByRole('button',{name:'返回',exact:true}).click();
async function setup(page:Page,data=largeDesktop()) {await mockDesktop(page,'zh-Hans',true,data);await page.goto('/');await expect(page.locator('.dashboard,.empty-state')).toBeVisible();}
async function noOverflow(page:Page){expect(await visible(page).evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);}

test('contextual navigation scopes refresh and restores origin, tab, range and scroll',async({page})=>{
 await setup(page);
 await menu(page,'账号管理');
 await expect(page.getByRole('heading',{level:1})).toHaveText('账号管理');
 await expect(page.getByRole('button',{name:'刷新',exact:true})).toHaveCount(0);
 await expect(visible(page).locator('.usage-summary')).toHaveCount(0);
 await page.getByRole('button',{name:'排序',exact:true}).click();
 await visible(page).getByRole('button',{name:'Claude second.with.a.long.address@example.com',exact:true}).click();
 await expect(page.getByRole('button',{name:'设置',exact:true})).toHaveAttribute('aria-pressed','true');
 await page.getByRole('button',{name:'用量',exact:true}).click();
 await page.getByRole('button',{name:'刷新',exact:true}).click();
 expect(await page.evaluate(()=>(window as any).__requests.at(-1))).toEqual({method:'refresh',accountId:'claude:second',force:true});
 await page.getByRole('button',{name:'昨天',exact:true}).click();
 await page.getByRole('button',{name:'查看历史',exact:true}).click();
 await expect(page.getByRole('heading',{level:1})).toHaveText('用量历史');
 await expect(page.getByRole('button',{name:'昨天',exact:true})).toHaveAttribute('aria-pressed','true');
 await back(page);
 await expect(page.getByRole('button',{name:'昨天',exact:true})).toHaveAttribute('aria-pressed','true');
 await page.getByRole('button',{name:'设置',exact:true}).click();
 await openNote(page);
 await page.getByRole('textbox',{name:'备注',exact:true}).focus();
 await page.getByRole('textbox',{name:'备注',exact:true}).fill('Draft note');
 expect((await page.locator('.preview-header').boundingBox())!.y).toBeGreaterThanOrEqual(0);
 await back(page);
 await expect(page.getByRole('heading',{level:1})).toHaveText('账号管理');
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
 await setup(page,data);await menu(page,'账号管理');
 await page.getByRole('button',{name:'排序',exact:true}).click();
 await page.getByRole('button',{name:'上移 Claude second.with.a.long.address@example.com',exact:true}).click();
 await expect(visible(page).locator('.configured-account').first()).toContainText('second.with.a.long.address@example.com');
 await page.getByRole('button',{name:'完成',exact:true}).click();
 await page.getByRole('switch',{name:'显示账号 Claude first@example.com',exact:true}).click();
 await expect(visible(page).locator('.configured-account')).toHaveCount(7);
 await expect(page.getByRole('switch',{name:'显示账号 Claude first@example.com',exact:true})).not.toBeChecked();
 await page.getByRole('button',{name:'添加账号',exact:true}).click();
 await visible(page).getByRole('button',{name:'Claude',exact:true}).click();
 await expect(visible(page).getByRole('button',{name:'添加 Claude · first@example.com',exact:true})).toHaveCount(0);
 await back(page);
 await page.getByRole('switch',{name:'显示账号 Claude first@example.com',exact:true}).click();
 await expect(visible(page).locator('.configured-account')).toHaveCount(7);
 await visible(page).getByRole('button',{name:'Claude first@example.com',exact:true}).click();
 await page.getByRole('button',{name:'移除账号',exact:true}).click();
 await expect(page.getByRole('group').getByRole('button',{name:'移除账号',exact:true})).toBeEnabled();
 // Arc ignores presses within 280ms of opening, preventing the original click from confirming.
 await page.waitForTimeout(300);
 await page.getByRole('group').getByRole('button',{name:'移除账号',exact:true}).click();
 await expect(page.getByRole('heading',{level:1})).toHaveText('账号管理');
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
 await expect(visible(page).locator('.history-model-legend')).toContainText('synthetic-model');
 await expect(visible(page).locator('.usage-summary')).toHaveCount(1);
 await noOverflow(page);
});

for(const language of ['en','zh-Hans','zh-Hant','ja','ko'])test(`model composition preserves recorded shares, unknown costs and variants in ${language}`,async({page})=>{
 const data=largeDesktop(),a=data.accounts[0];data.accounts=[a];
 const tr=(key:string)=>(providerTranslations as Record<string,Record<string,string>>)[language]?.[key]??key;
 a.history=[{...a.history[0],tokens:1000000,cost:3.76,models:[
  {model:'Alpha',tokens:370000,cost:2.64,variants:[{model:'Input',tokens:300000,cost:2.1},{model:'Output',tokens:70000,cost:.54}]},
  {model:'Beta',tokens:220000,cost:null,variants:[]},{model:'Gamma',tokens:190000,cost:1.12,variants:[]},{model:'Zero',tokens:0,cost:0,variants:[]},
 ]}];
 await mockDesktop(page,language,false,data);await page.goto('/');
 await page.getByRole('button',{name:messages(language).more,exact:true}).click();await page.getByRole('menuitem',{name:textFor(language).history,exact:true}).click();
 await visible(page).locator('.day-trigger').click();await visible(page).locator('.entry-trigger').click();
 const chart=visible(page).locator('.history-model-composition'),legend=chart.locator('.history-model-legend');
 await expect(chart.getByRole('heading')).toHaveText(tr('Share of Recorded Tokens'));
 await expect(legend.locator('strong')).toHaveText(['37%','22%','19%','0%','22%']);
 await expect(legend.locator('li').nth(1)).toContainText(tr('Cost Unknown'));
 await expect(legend.locator('li').nth(3)).toContainText('$0.00');
 await expect(legend.locator('li').nth(4)).toContainText(tr('Unclassified Records'));
 await expect(legend.locator('li').nth(4)).toContainText('220,000');
 // Sample the actual painted SVG sectors, not data attributes or the chart's own arithmetic.
 const shares=await chart.locator('svg').evaluate(svg=>{
  const ctx=document.createElement('canvas').getContext('2d')!;
  const paths=Array.from(svg.querySelectorAll('path'),p=>new Path2D(p.getAttribute('d')!));
  return paths.map(path=>Array.from({length:1000},(_,i)=>{
   const angle=(i+.5)/1000*Math.PI*2-Math.PI/2;return ctx.isPointInPath(path,104+85*Math.cos(angle),104+85*Math.sin(angle))?1:0;
  }).reduce((sum,n)=>sum+n,0));
 });
 expect(shares).toEqual([370,220,190,220]);
 const variants=legend.locator('.history-model-variants');await variants.locator('summary').focus();await page.keyboard.press('Enter');
 await expect(variants).toHaveAttribute('open','');await expect(variants).toContainText('300,000');await expect(variants).toContainText('70,000');
 await expect(variants).toContainText(tr('These variants are included in the model above, not added again.'));
 await expect(legend.locator('strong')).toHaveText(['37%','22%','19%','0%','22%']);await noOverflow(page);
});

test('model composition uses explained list fallbacks and counts unclassified records as a part',async({page})=>{
 const data=largeDesktop(),a=data.accounts[0];data.accounts=[a];
 const model=(i:number,tokens:number)=>({model:`Model ${i}`,tokens,cost:null,variants:[]});
 const cases=[
  {tokens:0,models:[model(0,0)],reason:'没有大于零的 token 记录'},
  {tokens:100,models:[model(0,70),model(1,40)],reason:'超过记录总数'},
  {tokens:100,models:Array.from({length:40},(_,i)=>model(i,1)),reason:'非零部分超过六项'},
  {tokens:7,models:Array.from({length:6},(_,i)=>model(i,1)),reason:'非零部分超过六项'},
  {tokens:6,models:Array.from({length:6},(_,i)=>model(i,1)),reason:''},
  {tokens:6,models:Array.from({length:5},(_,i)=>model(i,1)),reason:''},
  {tokens:100000,models:[model(0,99999),model(1,1),model(2,0)],reason:''},
 ];
 a.history=cases.map((c,i)=>({...a.history[i],tokens:c.tokens,cost:null,models:c.models}));
 await setup(page,data);await menu(page,'用量历史');
 for(let i=0;i<cases.length;i++){
  await visible(page).locator('.day-trigger').nth(i).click();await visible(page).locator('.entry-trigger').click();
  const current=visible(page).locator('.history-model-breakdown');
  if(cases[i].reason){await expect(current.locator('.history-model-notice')).toContainText(cases[i].reason);await expect(current.locator('svg')).toHaveCount(0);await expect(current.locator('.model-record')).toHaveCount(cases[i].models.length);}
  else await expect(current.locator('svg path')).toHaveCount(i===6?2:6);
  if(i===2)await expect(current.locator('.history-model-caption')).toContainText('60 token');
  if(i===3||i===5)await expect(current).toContainText('未归类记录');
  if(i===6){await expect(current.locator('.history-model-legend strong')).toHaveText(['>99.99%','<0.01%','0%']);await expect(current.locator('.history-model-legend li')).toHaveCount(3);}
  await noOverflow(page);
 }
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
  if(screen==='configure'){await back(page);await menu(page,'账号管理');}
  if(screen==='settings'){await back(page);await menu(page,'通用设置');}
  if(screen==='history'){await back(page);await menu(page,'用量历史');}
  await noOverflow(page);
  await expect(page.locator('h1:visible')).toHaveCount(1);
  await page.screenshot({path:info.outputPath(`${screen}-${theme}.png`),animations:'disabled'});
 }
});

for(const language of ['en','zh-Hans','zh-Hant','ja','ko'])test(`benefits keep exact closed summaries and disclose only expiry dates in ${language}`,async({page})=>{
 const data=largeDesktop(),codex=data.accounts.find(a=>a.family==='codex')!;
 const tr=(key:string)=>(providerTranslations as Record<string,Record<string,string>>)[language]?.[key]??key;
 const expiries=['2026-10-23T04:47:31Z','2026-10-30T03:01:06Z','2026-11-07T07:31:20Z'];
 const benefit={...codex.metrics[0],id:'codex.rateLimitResets',label:'Rate Limit Resets',percent:null,periodSeconds:null,placement:'details' as const,unit:'count',amount:7,values:[],hasData:true,expiries};
 const values=[{amount:0,unit:'dollars',label:''},{amount:-12.5,unit:'yuan',label:''},{amount:1200,unit:'credits',label:'Credits'},{amount:3,unit:'credits',label:''}];
 codex.metrics.push(benefit,
  {...benefit,id:'mixed',label:'Balance',unit:'dollars',amount:999,values},
  {...benefit,id:'zero',label:'Zero Balance',unit:'yuan',amount:0},
  {...benefit,id:'missing',label:'Missing Balance',unit:'dollars',amount:999,values,hasData:false},
  {...benefit,id:'unknown',label:'Unknown Balance',unit:'dollars',amount:null},
  {...benefit,id:'plain',label:'Plain Balance',unit:'dollars',amount:12.5,expiries:[]},
 );
 await mockDesktop(page,language,false,data);await page.goto('/');
 await page.locator('.dashboard').getByRole('button',{name:'Codex',exact:true}).click();
 const group=visible(page).locator('.detail-group').filter({has:page.getByRole('heading',{name:tr('Balance and Benefits'),exact:true})});
 const name=`${tr('Rate Limit Resets')} · 7`,trigger=group.getByRole('button',{name,exact:true});
 await expect(trigger).toBeVisible();await expect(trigger).toHaveAttribute('aria-expanded','false');
 const compact=new Intl.NumberFormat(language,{notation:'compact',maximumFractionDigits:1}).format(1200);
 await expect(group.getByRole('button',{name:`${tr('Balance')} · $0.00 · ¥-12.50 · ${compact} ${tr('Credits')} · 3`,exact:true})).toBeVisible();
 await expect(group.getByRole('button',{name:'Zero Balance · ¥0.00',exact:true})).toBeVisible();
 await expect(group.getByRole('button',{name:`Missing Balance · ${messages(language).missing}`,exact:true})).toBeVisible();
 await expect(group.getByRole('button',{name:`Unknown Balance · ${messages(language).missing}`,exact:true})).toBeVisible();
 const plain=group.locator('.text-metric').filter({hasText:'Plain Balance'});
 await expect(plain).toContainText('$12.50');await expect(plain.getByRole('button')).toHaveCount(0);
 await expect(group.getByRole('button')).toHaveCount(5);
 // Arc keeps details mounted; test its collapsed, inert panel rather than DOM absence.
 await expect(group.locator('[inert]')).toHaveCount(5);
 const panel=page.locator(`[id="${await trigger.getAttribute('aria-controls')}"]`);
 await expect(panel).toHaveAttribute('inert','');
 expect(await panel.evaluate(e=>e.getBoundingClientRect().height)).toBe(0);
 await trigger.focus();await page.keyboard.press('Enter');
 await expect(trigger).toHaveAttribute('aria-expanded','true');
 await expect(panel).not.toHaveAttribute('inert','');
 await expect.poll(()=>panel.evaluate(e=>e.getBoundingClientRect().height)).toBeGreaterThan(0);
 await expect(trigger).toHaveText(name);
 const dates=panel.getByRole('listitem');
 // There are three dates, not seven: never infer an amount per date from the balance.
 await expect(panel.locator('p')).toHaveText(`${textFor(language).expires} · 3`);
 await expect(dates).toHaveCount(3);
 const formatted=await page.evaluate(({expiries,language})=>expiries.map(date=>new Date(date).toLocaleString(language,{dateStyle:'medium',timeStyle:'short'})),{expiries,language});
 await expect(dates).toHaveText(formatted);
 expect(await dates.locator('time').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('datetime')))).toEqual(expiries);
 await noOverflow(page);
 await page.keyboard.press('Escape');
 await expect(trigger).toHaveAttribute('aria-expanded','false');await expect(trigger).toBeFocused();
 await expect(trigger).toHaveText(name);
 await expect(panel).toHaveAttribute('inert','');
 await expect.poll(()=>panel.evaluate(e=>e.getBoundingClientRect().height)).toBe(0);
 expect(await page.evaluate(()=>(window as any).__panelHides??0)).toBe(0);
 await page.keyboard.press('Space');await expect(trigger).toHaveAttribute('aria-expanded','true');
 await trigger.click();await expect(trigger).toHaveAttribute('aria-expanded','false');
 await expect(visible(page).getByRole('progressbar')).toHaveAttribute('value','29');
 await expect(visible(page).locator('.history-totals')).toBeVisible();
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

test('account note stays collapsed until wanted, saves inline and removal sits in its own section',async({page})=>{
 await setup(page);await page.locator('.dashboard').getByRole('button',{name:'Claude first@example.com',exact:true}).click();
 await page.getByRole('button',{name:'设置',exact:true}).click();
 await expect(page.getByRole('textbox',{name:'备注',exact:true})).toHaveCount(0);
 await openNote(page);
 const note=page.getByRole('textbox',{name:'备注',exact:true});
 await note.fill('Local note');
 const save=page.getByRole('button',{name:'保存',exact:true});
 await save.click();
 expect(await page.evaluate(()=>(window as any).__requests.at(-1))).toEqual({method:'note',accountId:'claude',value:'Local note'});
 await expect(visible(page).locator('.note-row')).toContainText('Local note');
 await expect(page.getByRole('textbox',{name:'备注',exact:true})).toHaveCount(0);
 await expect(visible(page).locator('.danger-zone').getByRole('button',{name:'移除账号',exact:true})).toBeVisible();
 await expect(visible(page).locator('.preference-group').getByRole('button',{name:'移除账号',exact:true})).toHaveCount(0);
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
 await setup(page);await page.getByRole('button',{name:'更多',exact:true}).click();
 await expect(page.getByRole('menuitem')).toHaveText(['账号管理','用量历史','通用设置','检查更新','关于','退出']);
 await expect(page.getByRole('separator')).toHaveCount(2);
 await page.getByRole('menuitem',{name:'检查更新',exact:true}).click();
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
 await openNote(page);
 await page.getByRole('textbox',{name:'备注',exact:true}).fill('Unsaved first account');
 await page.getByRole('textbox',{name:'API 密钥',exact:true}).fill('synthetic-test-key');
 await back(page);await expect(first).toBeFocused();
 await page.locator('.dashboard').getByRole('button',{name:'Claude second.with.a.long.address@example.com',exact:true}).click();
 await page.getByRole('button',{name:'设置',exact:true}).click();
 await expect(page.getByRole('textbox',{name:'备注',exact:true})).toHaveCount(0);
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
 await openNote(page);
 const note=page.getByRole('textbox',{name:'备注',exact:true}),form=visible(page).locator('form').filter({has:note});
 const value='audit_identifier_'.repeat(14);
 await note.fill(value);
 await page.evaluate(()=>{const api=(window as any).__TAURI_INTERNALS__,invoke=api.invoke;api.invoke=async(command:string,args:any)=>{if(args?.request?.method==='note')await new Promise(r=>setTimeout(r,700));return invoke(command,args);};(window as any).__failNextRequest=true;});
 await form.getByRole('button',{name:'保存',exact:true}).click();
 await expect(form.getByRole('button',{name:'保存',exact:true})).toHaveAttribute('aria-busy','true');
 await expect(form.getByRole('alert')).toContainText('保存失败');
 await expect(note).toHaveValue(value);
 await form.getByRole('button',{name:'保存',exact:true}).click();
 await expect(visible(page).getByRole('status').filter({hasText:'已保存'})).toBeVisible();
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
 // Wait for fonts and the ResizeObserver's frame, not the empty loading shell's first height.
 await page.evaluate(async()=>{await document.fonts.ready;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
 await expect.poll(()=>page.evaluate(()=>(window as any).__panelHeights?.at(-1))).toBeGreaterThan(100);
 const home=await page.evaluate(()=>(window as any).__panelHeights.at(-1));
 expect(home).toBeLessThan(500);
 await menu(page,'通用设置');
 await expect.poll(()=>page.evaluate(()=>(window as any).__panelHeights.at(-1))).toBeGreaterThan(home);
 await back(page);
 await expect.poll(()=>page.evaluate(()=>(window as any).__panelHeights.at(-1))).toBe(home);
});

test('account setup guides isolated login and detection without restarting',async({page},info)=>{
 await setup(page);await menu(page,'账号管理');await page.getByRole('button',{name:'添加账号',exact:true}).click();
 await visible(page).getByRole('button',{name:'Claude',exact:true}).click();
 const scan=page.getByRole('button',{name:'检查已有登录',exact:true});
 await expect(scan).toBeEnabled();
 await page.evaluate(()=>(window as any).__failNextRequest=true);
 await scan.click();
 await expect(visible(page).getByRole('alert').filter({hasText:'操作未完成'})).toBeVisible();
 await scan.click();
 await expect(visible(page).getByRole('status')).toContainText('检测完成');
 await page.getByRole('button',{name:'打开终端登录',exact:true}).click();
 await expect(page.locator('.login-command')).toContainText('CLAUDE_CONFIG_DIR=/isolated');
 await expect(visible(page).locator('.login-steps li')).toHaveCount(2);
 expect(await page.evaluate(()=>(window as any).__loginProviders)).toEqual(['claude']);
 await page.screenshot({path:info.outputPath('account-login-guide.png')});
 await page.getByRole('button',{name:'我已登录，重新检查',exact:true}).click();
 expect(await page.evaluate(()=>(window as any).__requests.at(-1).method)).toBe('discover');
 await page.getByRole('button',{name:'高级：使用已有文件夹',exact:true}).click();
 await page.getByRole('textbox',{name:'配置目录',exact:true}).fill('invalid');
 await page.getByRole('button',{name:'连接并检测',exact:true}).click();
 await expect(visible(page).getByRole('alert').filter({hasText:'目录不存在或无法访问'})).toBeVisible();
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
 await expect(page.getByRole('button',{name:'打开终端登录',exact:true})).toBeVisible();
 await expect(visible(page).getByText('账号已保留。请重新连接登录后，再检测账号。',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'设置',exact:true}).click();
 await expect(page.getByRole('button',{name:'添加备注',exact:true})).toBeVisible();
 await noOverflow(page);
});


test('detection reports per-account outcomes and network failures do not request login',async({page})=>{
 const data=largeDesktop();data.accounts[0].error='The connection timed out. Try again later.';
 data.accounts[1].error='Another account is currently connected. This saved account is kept; connect its configuration directory or sign in to it.';
 data.accounts[1].connection='different_account';
 await setup(page,data);
 await visible(page).locator('.dashboard').getByRole('button',{name:`Claude ${data.accounts[0].email}`,exact:true}).click();
 await expect(visible(page).getByRole('button',{name:'打开终端登录',exact:true})).toHaveCount(0);
 await back(page);await menu(page,'账号管理');await page.getByRole('button',{name:'添加账号',exact:true}).click();
 await visible(page).getByRole('button',{name:'Claude',exact:true}).click();
 await page.getByRole('button',{name:'检查已有登录',exact:true}).click();
 const results=visible(page).getByRole('list',{name:'检测结果'});
 await expect(results).toContainText(data.accounts[0].email);
 await expect(results).toContainText('用量暂时无法读取，请稍后重试。');
 await expect(results).toContainText('当前连接的是另一个账号。');
 await noOverflow(page);
});

test('background history notices retain quota without a reconnect prompt',async({page})=>{
 const data=largeDesktop();const a=data.accounts[0];a.error='';a.warning='Local token history is still updating.';
 await setup(page,data);
 await visible(page).locator('.dashboard').getByRole('button',{name:`Claude ${a.email}`,exact:true}).click();
 await expect(visible(page).getByRole('button',{name:'打开终端登录',exact:true})).toHaveCount(0);
 await expect(visible(page).getByRole('progressbar').first()).toBeVisible();
 await expect(visible(page).locator('.group-description').filter({hasText:'历史'}).first()).toBeVisible();
});

test('service accents adapt to light and dark while quota warnings keep priority',async({page})=>{
 const data=largeDesktop();data.settings.appearance='system';await setup(page,data);
 for(const mode of ['light','dark'] as const){
  await page.emulateMedia({colorScheme:mode});
  await expect(page.locator('html')).toHaveAttribute('data-theme',mode);
  const claude=page.locator('.dashboard section[data-provider="claude"]').first();
  const codex=page.locator('.dashboard section[data-provider="codex"]').first();
  const c=await claude.locator('.provider-logo').evaluate(e=>getComputedStyle(e).color);
  const x=await codex.locator('.provider-logo').evaluate(e=>getComputedStyle(e).color);
  expect(c).not.toBe(x);
  expect(c).toBe(mode==='light'?'rgb(191, 86, 57)':'rgb(237, 153, 125)');
  const normal=await claude.locator('.metric[data-tone="normal"]').first().evaluate(e=>getComputedStyle(e).getPropertyValue('--meter-fill').trim());
  const critical=await claude.locator('.metric[data-tone="critical"]').first().evaluate(e=>getComputedStyle(e).getPropertyValue('--meter-fill').trim());
  expect(normal).toBe(mode==='light'?'#bf5639':'#ed997d');expect(critical).not.toBe(normal);
  await noOverflow(page);
  await page.screenshot({path:`test-results-navigation/service-colors-${test.info().project.name}-${mode}.png`});
 }
});

test('manual refresh spins the button, prevents duplicate requests, and reports the result beside it',async({page})=>{
 await setup(page);
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.evaluate(()=>{(window as any).__beforeRefresh=(state:any)=>new Promise<void>(resolve=>{(window as any).__finishRefresh=()=>{state.accounts[0].fetchedAt='2030-01-01T12:00:00Z';resolve();};});});
 const button=page.getByRole('button',{name:'刷新',exact:true}),status=page.locator('.refresh-status'),announce=page.locator('.refresh-announcement');
 await button.click();
 await expect(button).toHaveAttribute('aria-busy','true');
 // No banner and no text while working: the button itself spins.
 await expect(announce).toHaveText('正在刷新用量…');
 await expect(status).toHaveCount(0);
 await expect(page.locator('.refresh-feedback')).toHaveCount(0);
 expect(await button.locator('svg').evaluate(e=>getComputedStyle(e).animationName)).toBe('refresh-turn');
 const requests=await page.evaluate(()=>(window as any).__requests.length);
 await button.dispatchEvent('click');await page.keyboard.press('Meta+r');
 expect(await page.evaluate(()=>(window as any).__requests.length)).toBe(requests);
 await page.screenshot({path:`test-results-navigation/refresh-pending-${test.info().project.name}.png`});
 await page.evaluate(()=>(window as any).__finishRefresh());
 await expect(status).toHaveText('已刷新');
 await expect(button).toHaveAttribute('data-result','success');
 await expect(announce).toHaveText('用量已更新。');
 await expect(button).toHaveAttribute('aria-busy','false');
 // The label sits next to the button without resizing the header or pushing the page down.
 const header=(await page.locator('.preview-header').boundingBox())!,list=(await visible(page).boundingBox())!;
 expect(header.height).toBeLessThan(60);expect(list.y).toBeLessThan(70);
 await page.screenshot({path:`test-results-navigation/refresh-done-${test.info().project.name}.png`});
 await page.evaluate(()=>{(window as any).__beforeRefresh=undefined;});
 await button.click();await expect(announce).toHaveText('正在刷新用量…');
 await expect(status).toHaveText('已刷新');await expect(announce).toHaveText('用量已更新。');
 // If the helper reports back without having fetched anything, the app must not claim success.
 await page.evaluate(()=>{(window as any).__skipFetch=true;});
 await button.click();
 await expect(status).toHaveText('未刷新');await expect(status).toHaveAttribute('data-tone','warning');await expect(announce).toHaveText('没有获取到新数据，请稍后再试。');
 await page.evaluate(()=>{(window as any).__skipFetch=false;});
 await page.evaluate(()=>{(window as any).__beforeRefresh=(state:any)=>{state.accounts[0].warning='Usage queries are temporarily rate limited.';};});
 await button.click();await expect(announce).toHaveText('刷新完成，部分账号有提示，请查看详情。');
 await expect(status).toHaveText('需要留意');await expect(status).toHaveAttribute('data-tone','warning');
 await page.evaluate(()=>{(window as any).__beforeRefresh=(state:any)=>{state.accounts[0].error='Network timeout';};});
 await button.click();await expect(status).toHaveAttribute('data-tone','warning');
 await expect(status).toHaveText('部分失败');await expect(announce).toHaveText('部分账号刷新失败，请查看账号状态。');
 await page.evaluate(()=>{(window as any).__failNextRequest=true;});
 await button.click();await expect(status).toHaveText('刷新失败');await expect(announce).toHaveText('刷新失败，请重试。');
 await expect(button).toHaveAttribute('data-result','error');
 await expect(button).toHaveAttribute('aria-busy','false');
});

test('manual refresh shows reset countdowns against the time the data arrived',async({page})=>{
 // The first session resets three hours after 10:00. Jumping the clock does not fire the page's 30-second tick, so only the refresh itself can update the countdown.
 const start=new Date('2026-10-25T10:00:00Z');
 await page.clock.install({time:start});
 await setup(page,largeDesktop(start));
 const reset=page.locator('.dashboard .reset').first(),status=page.locator('.refresh-status');
 await expect(reset).toHaveText('3h');
 await page.clock.setSystemTime(new Date('2026-10-25T10:20:00Z'));
 await page.getByRole('button',{name:'刷新',exact:true}).click();
 await expect(status).toHaveText('已刷新');
 await expect(reset).toHaveText('2h 40m');
});

test('reduced motion keeps the busy state without spinning and other actions do not spin refresh',async({page})=>{
 await setup(page);await page.emulateMedia({reducedMotion:'reduce'});
 await page.evaluate(()=>{(window as any).__beforeRefresh=()=>new Promise<void>(resolve=>{(window as any).__finishRefresh=resolve;});});
 const button=page.getByRole('button',{name:'刷新',exact:true});await button.click();
 await expect(page.locator('.refresh-announcement')).toHaveText('正在刷新用量…');
 await expect(button).toHaveAttribute('aria-busy','true');
 expect(await button.locator('svg').evaluate(e=>getComputedStyle(e).animationName)).toBe('none');
 await menu(page,'通用设置');
 await expect(page.locator('.refresh-announcement')).toHaveText('');
 await expect(page.locator('.refresh-status')).toHaveCount(0);
 await page.evaluate(()=>(window as any).__finishRefresh());
 await page.getByRole('switch',{name:'显示剩余额度',exact:true}).click();
 await back(page);
 await expect(button).toHaveAttribute('aria-busy','false');
});

test('a problem card offers the one next step instead of only describing it',async({page})=>{
 const data=largeDesktop();
 data.accounts[0].error='Usage queries are temporarily rate limited. Data may be out of date. Retrying automatically later.';
 data.accounts[2].error='Not logged in. Run `codex` to authenticate.';
 const deepseek=data.accounts.find(a=>a.family==='deepseek')!;deepseek.apiKey=true;deepseek.error='No DeepSeek API key. Set DEEPSEEK_API_KEY or add it to ~/.config/tokenplan/deepseek.json.';
 await setup(page,data);
 const home=visible(page).locator('.dashboard');
 // Temporary failure: retry just that account.
 await home.locator('.account-block').first().getByRole('button',{name:'重试',exact:true}).click();
 expect(await page.evaluate(()=>(window as any).__requests.at(-1))).toEqual({method:'refresh',accountId:'claude',force:true});
 // Sign-in problem on a CLI login: go to the account, where the sign-in steps are.
 await home.locator('.account-block').filter({hasText:'Codex'}).getByRole('button',{name:'重新登录',exact:true}).click();
 await expect(page.getByRole('heading',{level:1})).toHaveText('Codex');
 await expect(page.getByRole('button',{name:'打开终端登录',exact:true})).toBeVisible();
 await back(page);
 // Missing key: straight to the key field.
 await home.locator('.account-block').filter({hasText:'DeepSeek'}).getByRole('button',{name:'设置 API 密钥',exact:true}).click();
 await expect(page.getByRole('button',{name:'设置',exact:true})).toHaveAttribute('aria-pressed','true');
 await expect(page.getByRole('textbox',{name:'API 密钥',exact:true})).toBeVisible();
 await noOverflow(page);
});

test('each home heading has one usage entry, with settings inside details',async({page})=>{
 await setup(page);
 const first=visible(page).locator('.account-block').first();
 await first.hover();
 await expect(first.locator('.provider-heading').getByRole('button')).toHaveCount(1);
 await expect(first.getByRole('button',{name:/^账号设置/})).toHaveCount(0);
 await first.getByRole('button',{name:'Claude first@example.com',exact:true}).focus();
 await page.keyboard.press('Enter');
 await expect(page.getByRole('button',{name:'用量',exact:true})).toHaveAttribute('aria-pressed','true');
 await page.getByRole('button',{name:'设置',exact:true}).click();
 await expect(page.getByRole('button',{name:'设置',exact:true})).toHaveAttribute('aria-pressed','true');
 await back(page);
 const names=visible(page).locator('.metric-name');
 await expect(names.first()).toHaveAttribute('title','5 小时窗口');
 await expect(visible(page).locator('.reset').first()).toHaveAttribute('title',/后重置/);
});

test('first-run welcome explains the basics once, and an alerts nudge appears near a limit',async({page})=>{
 await page.addInitScript(()=>{(window as any).__tips=true;});
 await setup(page);
 const welcome=page.getByRole('region',{name:'欢迎使用 TokenPlan'});
 await expect(welcome).toContainText('“5h”“1w”');
 await expect(page.getByRole('region',{name:'在用完之前提前收到提醒。'})).toHaveCount(0);
 await welcome.getByRole('button',{name:'知道了',exact:true}).click();
 await expect(welcome).toHaveCount(0);
 // Claude is at 92%, notifications are off: one nudge, which turns every alert on.
 const nudge=page.getByRole('region',{name:'在用完之前提前收到提醒。'});
 await expect(nudge).toBeVisible();
 await nudge.getByRole('button',{name:'开启提醒',exact:true}).click();
 await expect(nudge).toHaveCount(0);
 const requests=await page.evaluate(()=>(window as any).__requests.map((r:any)=>r.method));
 expect(requests).toContain('notificationPermission');
 expect(await page.evaluate(()=>(window as any).__requests.at(-1))).toEqual({method:'settings',value:{notifications:[true,true,true]}});
 await page.reload();await expect(page.locator('.mac-preview')).toBeVisible();
 await expect(page.getByRole('region',{name:'欢迎使用 TokenPlan'})).toHaveCount(0);
 await expect(page.getByRole('region',{name:'在用完之前提前收到提醒。'})).toHaveCount(0);
});

test('the welcome can jump straight to adding an account',async({page})=>{
 await page.addInitScript(()=>{(window as any).__tips=true;});
 await setup(page);
 await page.getByRole('region',{name:'欢迎使用 TokenPlan'}).getByRole('button',{name:'添加账号',exact:true}).click();
 await expect(page.getByRole('heading',{level:1})).toHaveText('添加账号');
});

test('about offers project links and credits the original project',async({page})=>{
 await setup(page);await menu(page,'关于');
 await expect(visible(page)).toContainText('Robin Ebers');
 await expect(visible(page)).toContainText('不发送任何统计或崩溃报告');
 await visible(page).getByRole('button',{name:'更新说明'}).click();
 await visible(page).getByRole('button',{name:'反馈问题'}).click();
 expect(await page.evaluate(()=>(window as any).__openedLinks)).toEqual(['https://github.com/onevalar/token-plan/releases','https://github.com/onevalar/token-plan/issues/new']);
 await noOverflow(page);
});

test('the menu bar account list is collapsed until opened',async({page})=>{
 await setup(page);await menu(page,'通用设置');
 const row=visible(page).getByRole('button',{name:/显示在菜单栏的账号/});
 await expect(row).toHaveAttribute('aria-expanded','false');
 await expect(row).toContainText('7 / 7');
 await expect(visible(page).getByRole('switch',{name:/Claude · first@example.com/})).toHaveCount(0);
 await row.click();
 await expect(visible(page).getByRole('switch',{name:/Claude · first@example.com/})).toBeVisible();
 await noOverflow(page);
});

test('hidden accounts survive a fresh UI load and an empty Home links to management',async({page})=>{
 const data=largeDesktop();data.accounts.forEach(a=>{a.added=a.enabled;a.enabled=false;});
 await setup(page,data);
 await expect(visible(page)).toContainText('所有账号都已在首页隐藏');
 await visible(page).getByRole('button',{name:'账号管理',exact:true}).click();
 await expect(visible(page).locator('.configured-account')).toHaveCount(7);
 await expect(visible(page)).not.toContainText('Cursor');
 const toggle=page.getByRole('switch',{name:'显示账号 Claude first@example.com',exact:true});
 await expect(toggle).not.toBeChecked();
 await toggle.focus();await page.keyboard.press('Space');
 await expect(toggle).toBeChecked();
 await back(page);
 await expect(visible(page).locator('.account-block')).toHaveCount(1);
});

test('service-first addition handles failure, success and API-key setup with management as parent',async({page})=>{
 const data=largeDesktop();data.accounts.find(a=>a.family==='grok')!.apiKey=true;
 await setup(page,data);
 await visible(page).getByRole('button',{name:'添加账号',exact:true}).click();
 await visible(page).getByRole('button',{name:'Cursor',exact:true}).click();
 await page.evaluate(()=>(window as any).__failNextRequest=true);
 await page.getByRole('button',{name:'添加 Cursor',exact:true}).click();
 await expect(visible(page).getByRole('alert')).toBeVisible();
 await expect(page.getByRole('heading',{level:1})).toHaveText('添加账号');
 await page.getByRole('button',{name:'添加 Cursor',exact:true}).click();
 await expect(page.getByRole('heading',{level:1})).toHaveText('账号管理');
 await expect(visible(page).getByRole('status')).toContainText('Cursor');
 await expect(visible(page).locator('.configured-account')).toHaveCount(8);
 await page.getByRole('button',{name:'添加账号',exact:true}).click();
 await visible(page).getByRole('button',{name:'Grok',exact:true}).click();
 await expect(visible(page).getByRole('button',{name:'打开终端登录',exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'设置 Grok',exact:true}).click();
 await expect(page.getByRole('textbox',{name:'API 密钥',exact:true})).toBeVisible();
 await back(page);
 await expect(page.getByRole('heading',{level:1})).toHaveText('账号管理');
 await expect(visible(page).locator('.configured-account')).toHaveCount(9);
});
