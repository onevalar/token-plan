import {test,expect,type Page} from '@playwright/test';
import {mockDesktop} from './mock';
import {largeDesktop} from './fixtures/largeDesktop';
import translations from '../src/provider-translations.json' with {type:'json'};
import {messages} from '../src/i18n';
import {textFor} from '../src/copy';

test.use({viewport:{width:390,height:680},reducedMotion:'reduce'});
test.beforeEach(async({page},info)=>{await page.addInitScript(platform=>{(window as any).__panelFrame={platform,rounded:platform!=='linux'};},String(info.project.metadata.platform??'macos'));});
const providerText=(key:string,language:string)=>(translations as Record<string,Record<string,string>>)[language]?.[key]??key;
const visible=(page:Page)=>page.locator('.preview-page:not([hidden])');
const home=(page:Page)=>page.locator('.dashboard');
const extraStyles={rings:'Compact Rings',ruler:'Quota Ruler',concentric:'Concentric Rings',numbers:'Numbers',segments:'Segmented Bar',ticks:'Tick Ring'};
async function settings(page:Page,language='en') {
 await page.getByRole('button',{name:messages(language).more,exact:true}).click();
 await page.getByRole('menuitem',{name:textFor(language).settings,exact:true}).click();
}
// Earlier single-name styles are now a family tile plus an option.
const legacy:Record<string,string[]>={'Gauges':['Rings','Dashboard Ring'],'Quota Ruler':['Bars','Quota Ruler'],'Numbers':['Numbers'],'Percentage Grid':['Cells','Grid'],'Compact Rings':['Rings','Single Ring'],'Concentric Rings':['Rings','Double Ring'],'Tick Ring':['Rings','Single Ring Ticks'],'Segmented Bar':['Cells','Single Row']};
async function choose(page:Page,name:string,language='en') {
 const label=providerText('Usage Style',language),toggle=page.getByRole('button',{name:new RegExp(`^${label}`)});
 if(await toggle.getAttribute('aria-expanded')==='false')await toggle.click();
 const [tile,option]=legacy[name]??[name];
 await page.getByRole('group',{name:label,exact:true}).getByRole('button',{name:providerText(tile,language),exact:true}).click();
 if(option){await page.getByRole('combobox',{name:providerText('Variant',language),exact:true}).click();await page.getByRole('option',{name:providerText(option,language),exact:true}).click();}
}
const back=(page:Page,language='en')=>page.getByRole('button',{name:messages(language).back,exact:true}).click();

test('Home style persists independently of density, tray and details, with keyboard selection',async({page})=>{
 const data=largeDesktop();data.accounts=data.accounts.slice(0,2);
 await mockDesktop(page,'en',false,data);await page.goto('/');
 await expect(home(page)).toHaveAttribute('data-usage-style','bars');
 await settings(page);
 const tray=await page.locator('.menu-bar-preview').count()?await page.locator('.menu-bar-preview').innerHTML():null;
 // Collapsed to one row until opened; every style is then a pressed-state button reachable from the keyboard.
 const toggle=page.getByRole('button',{name:/^Usage Style/}),options=page.getByRole('group',{name:'Usage Style',exact:true});
 await expect(toggle).toHaveAttribute('aria-expanded','false');await expect(toggle).toContainText('Standard Bar');await expect(options).toHaveCount(0);
 await toggle.focus();await page.keyboard.press('Enter');await expect(toggle).toHaveAttribute('aria-expanded','true');
 await expect(options.getByRole('button')).toHaveCount(8);
 await expect(options.getByRole('button',{name:'Bars',exact:true})).toHaveAttribute('aria-pressed','true');
 await options.getByRole('button',{name:'Rings',exact:true}).focus();await page.keyboard.press('Enter');await page.getByRole('combobox',{name:'Variant',exact:true}).click();await page.getByRole('option',{name:'Dashboard Ring',exact:true}).click();
 await expect(home(page)).toHaveAttribute('data-usage-style','gauges');
 await expect(options.getByRole('button',{name:'Rings',exact:true})).toHaveAttribute('aria-pressed','true');
 await expect(options.getByRole('button',{name:'Bars',exact:true})).toHaveAttribute('aria-pressed','false');
 await expect(toggle).toContainText('Dashboard Ring');
 await toggle.click();await expect(options).toHaveCount(0);
 expect(await page.evaluate(()=>(window as any).__panelHides??0)).toBe(0);
 expect(await page.locator('.menu-bar-preview').count()?await page.locator('.menu-bar-preview').innerHTML():null).toBe(tray);
 await page.getByRole('combobox',{name:'Density',exact:true}).click();await page.getByRole('option',{name:'Comfortable',exact:true}).click();
 await back(page);
 await expect(home(page).getByRole('meter',{name:'5h · Used',exact:true}).first()).toHaveAttribute('aria-valuetext','46%');
 await home(page).getByRole('button',{name:'Claude first@example.com',exact:true}).click();
 await expect(visible(page).locator('.detail-group .home-metrics')).toHaveAttribute('data-style','gauges');
 await expect(visible(page).getByRole('meter')).toHaveCount(2);
 await back(page);await settings(page);await choose(page,'Percentage Grid');
 await page.getByRole('switch',{name:textFor('en').showRemaining,exact:true}).click();await back(page);
 await expect(home(page).getByRole('img',{name:'5h · Remaining · 54%',exact:true})).toHaveCount(1);
 await expect(home(page).locator('.home-grid-caption')).toHaveCount(0);
 await page.reload();await expect(home(page)).toHaveAttribute('data-usage-style','cells');
 await expect(page.locator('.mac-preview')).toHaveAttribute('data-density','comfortable');
 await settings(page);await choose(page,'Bars');await back(page);
 await expect(home(page).getByRole('progressbar')).toHaveCount(4);await expect(home(page).getByRole('meter')).toHaveCount(0);
 for(const [style,label] of Object.entries(extraStyles)){
  await settings(page);await choose(page,label);await back(page);await page.reload();
  await expect(home(page)).toHaveAttribute('data-usage-style',style);
  await expect(page.locator('.mac-preview')).toHaveAttribute('data-density','comfortable');
  await settings(page);await expect(page.getByRole('button',{name:/^Usage Style/})).toContainText(({'Compact Rings':'Single Ring','Segmented Bar':'Single Row','Concentric Rings':'Double Ring','Tick Ring':'Single Ring Ticks'} as Record<string,string>)[label]??label);await back(page);
 }
});

test('Tick Ring persists per account and survives switching to a uniform style and back',async({page})=>{
 const data=largeDesktop();data.accounts=data.accounts.slice(0,2);
 await mockDesktop(page,'en',false,data);await page.goto('/');await settings(page);await choose(page,'Gauges');
 await page.getByRole('combobox',{name:'Apply Style',exact:true}).click();
 await page.getByRole('option',{name:'Per Subscription',exact:true}).click();await back(page);
 await home(page).getByRole('button',{name:'Claude first@example.com',exact:true}).click();
 await page.getByRole('button',{name:'Edit Home Display',exact:true}).click();await choose(page,'Tick Ring');
 const editor=visible(page).locator('.home-metric-editor');
 await expect(editor.getByRole('combobox',{name:'Variant',exact:true})).toContainText('Single Ring Ticks');
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('tokenplan.homeUsagePreferences')!).accounts)).toEqual({claude:'ticks'});
 await page.locator('header').getByRole('button',{name:textFor('en').finishEditing,exact:true}).click();
 await expect(editor).toHaveCount(0);await back(page);
 const accounts=home(page).locator('.account-block');
 await expect(accounts.nth(0).locator('.home-metrics')).toHaveAttribute('data-style','ticks');
 await expect(accounts.nth(1).locator('.home-metrics')).toHaveAttribute('data-style','gauges');
 await page.reload();
 await expect(accounts.nth(0).locator('.home-metrics')).toHaveAttribute('data-style','ticks');
 await expect(accounts.nth(1).locator('.home-metrics')).toHaveAttribute('data-style','gauges');
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('tokenplan.homeUsagePreferences')!).accounts)).toEqual({claude:'ticks'});
 await settings(page);await page.getByRole('combobox',{name:'Apply Style',exact:true}).click();
 await page.getByRole('option',{name:'Unified Style',exact:true}).click();await choose(page,'Percentage Grid');await back(page);await page.reload();
 await expect(accounts.nth(0).locator('.home-metrics')).toHaveAttribute('data-style','cells');
 await expect(accounts.nth(1).locator('.home-metrics')).toHaveAttribute('data-style','cells');
 await settings(page);await page.getByRole('combobox',{name:'Apply Style',exact:true}).click();
 await page.getByRole('option',{name:'Per Subscription',exact:true}).click();await back(page);await page.reload();
 await expect(accounts.nth(0).locator('.home-metrics')).toHaveAttribute('data-style','ticks');
 await expect(accounts.nth(1).locator('.home-metrics')).toHaveAttribute('data-style','gauges');
});

test('unreadable preferences and failed saves stay visible and recover without changing the previous style',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('tokenplan.homeUsageStyle','unrecognized'));
 await mockDesktop(page,'en');await page.goto('/');await settings(page);
 await expect(visible(page).getByRole('alert')).toHaveText('Could not load the Home usage style. Choose a style to save it again.');
 await choose(page,'Gauges');await expect(visible(page).getByRole('alert')).toHaveCount(0);
 await page.evaluate(()=>{const original=Storage.prototype.setItem;(window as any).__restoreStorage=()=>{Storage.prototype.setItem=original;};Storage.prototype.setItem=function(key,value){if(key==='tokenplan.homeUsagePreferences')throw new Error('fixture write denied');original.call(this,key,value);};});
 await page.getByRole('group',{name:'Usage Style',exact:true}).getByRole('button',{name:'Cells',exact:true}).click();await expect(visible(page).getByRole('alert')).toHaveText('Could not save. Try again.');
 await expect(home(page)).toHaveAttribute('data-usage-style','gauges');
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('tokenplan.homeUsagePreferences')!).style)).toBe('gauges');
 await page.evaluate(()=>(window as any).__restoreStorage());await choose(page,'Percentage Grid');
 await expect(visible(page).getByRole('alert')).toHaveCount(0);await expect(home(page)).toHaveAttribute('data-usage-style','cells');
});

for(const style of ['gauges','cells','rings','ruler','concentric','numbers','segments','ticks'] as const)for(const remaining of [false,true])test(`${style} preserves ${remaining?'remaining':'used'} readings, limits, missing data and metric order`,async({page})=>{
 if(style==='ticks')await page.emulateMedia({reducedMotion:'no-preference'});
 const data=largeDesktop(),account=data.accounts[0],base=account.metrics[0];data.accounts=[account];data.settings.showRemaining=remaining;
 // Asymmetric readings make a double inversion and rounded threshold visibly wrong.
 const values=remaining?[100,20.4,20,0,-12,62.4]:[0,79.6,80,100,112,37.6];
 const shown=remaining?['100%','20%','20%','0%','-12%','62%']:['0%','80%','80%','100%','112%','38%'];
 const cells=remaining?[100,20,20,0,0,62]:[0,80,80,100,0,38];
 account.metrics=values.map((percent,i)=>({...base,id:`quota-${i}`,label:`Quota ${i}`,percent,notStarted:i===0}));
 account.metrics.push({...base,id:'missing',label:'Missing',percent:95,hasData:false},{...base,id:'null',label:'Null',percent:null,hasData:true},
  {...base,id:'unstarted',label:'Pending',percent:remaining?83:17,notStarted:true},
  {...base,id:'hidden',label:'Hidden quota',placement:'hidden'},{...base,id:'details',label:'Details quota',placement:'details'});
 account.metrics.splice(1,0,{...base,id:'amount',label:'Balance',percent:null,periodSeconds:null,unit:'dollars',amount:7.25});
 account.metrics.push({...base,id:'history',label:'Daily Tokens',chart:[{label:'Today',value:12}]});
 account.metrics[0].expiries=['2026-10-30T03:01:06Z'];
 await page.addInitScript(style=>localStorage.setItem('tokenplan.homeUsageStyle',style),style);
 await mockDesktop(page,'en',false,data);await page.goto('/');
 const mode=remaining?'Remaining':'Used';
 for(let i=0;i<values.length;i++){
  const tile=home(page).locator(`[data-metric="quota-${i}"]`);
  await expect(tile).toContainText(shown[i]);await expect(tile).toHaveAttribute('data-tone',i>=2&&i<=4?'critical':'normal');
  if(style!=='cells'&&style!=='numbers'){
   const meter=tile.getByRole('meter',{name:`Quota ${i} · 5h · ${mode}`,exact:true});
   await expect(meter).toHaveAttribute('aria-valuetext',new RegExp(`^${shown[i]}`));
   await expect(meter).toHaveAttribute('aria-valuenow',String(Math.max(0,Math.min(100,values[i]))));
  }else if(style==='cells'){
   await expect(tile.locator('[data-category="reading"]')).toHaveCount(cells[i]);
   await expect(tile.locator('[data-category]')).toHaveCount(i===4?0:100);
   expect(await tile.locator('.quota-number strong').evaluate(e=>{const range=document.createRange();range.selectNodeContents(e);return range.getClientRects().length;})).toBe(1);
  }else if(style==='numbers'){
   const color=await tile.locator('.home-number-value strong').evaluate(e=>getComputedStyle(e).color);
   await expect(tile.locator('.home-number-value > span')).toHaveCSS('color',color);
  }
  if(style==='ticks'){
   await expect(tile.locator('.quota-ticks strong')).toHaveText(shown[i]);await expect(tile.locator('.quota-ticks')).not.toContainText(mode);
   await expect(tile.locator('.quota-ticks mask circle')).toHaveAttribute('stroke-dasharray',`${Math.max(0,Math.min(1,values[i]/100))} 1`);
  }
 }
 if(style==='ticks'){
  const rings=home(page).locator('.quota-ticks'),ids=await rings.locator('mask').evaluateAll(es=>es.map(e=>e.id));
  expect(new Set(ids).size).toBe(values.length+1); // Includes the independent not-started quota, never the missing readings.
  await expect(rings.locator('button,[tabindex]')).toHaveCount(0);
  expect(await rings.evaluateAll(es=>es.flatMap(e=>e.getAnimations({subtree:true})).length)).toBe(0);
 }
 if(style==='segments'){
  const fills=await home(page).locator('[data-metric="quota-5"] .home-segment-track > span > span').evaluateAll(es=>es.map(e=>new DOMMatrix(getComputedStyle(e).transform).a));
  // 37.6% = seven whole cells and 52% of the eighth, not eight whole cells.
  expect(fills.slice(0,remaining?12:7)).toEqual(Array(remaining?12:7).fill(1));
  expect(fills[remaining?12:7]).toBeCloseTo(remaining?0.48:0.52,5);
  expect(fills.slice(remaining?13:8)).toEqual(Array(remaining?7:12).fill(0));
 }
 await expect(home(page).locator('.quota-warning')).toHaveCount(0);
 for(const id of ['missing','null']){
  const tile=home(page).locator(`[data-metric="${id}"]`);await expect(tile).toHaveAttribute('data-tone','normal');
  await expect(tile.getByRole('meter').or(tile.getByRole('img'))).toHaveCount(0);await expect(tile).toContainText(messages('en').missing);
 }
 await expect(home(page).locator('[data-metric="unstarted"] .reset')).toHaveText(textFor('en').notStarted);
 await expect(home(page).locator('[data-metric="unstarted"]')).toContainText(remaining?'83%':'17%');
 await expect(home(page).locator('[data-metric="quota-0"] .expiries')).toContainText('2026');
 await expect(home(page).locator('[data-metric="quota-2"] .reset svg')).toHaveCount(1);
 await expect(home(page).locator('[data-metric="hidden"],[data-metric="details"]')).toHaveCount(0);
 await expect(home(page).locator('.home-metrics > *').nth(1)).toContainText('$7.25');
 await expect(home(page).getByRole('img',{name:'Daily Tokens · 5h',exact:true})).toHaveCount(1);
 expect(await visible(page).evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);
 // The real refresh route updates readings without a zero-to-value entrance animation.
 await page.evaluate(()=>{(window as any).__beforeRefresh=(state:any)=>{state.accounts[0].metrics[0].percent=7;};});
 await page.getByRole('button',{name:messages('en').refresh,exact:true}).click();
 await expect(home(page).locator('[data-metric="quota-0"]')).toContainText('7%');
 if(style==='ticks')await expect(home(page).locator('[data-metric="quota-0"] .quota-ticks mask circle')).toHaveAttribute('stroke-dasharray','0.07 1');
});

test('a saved row fill opens as the full-width textured card: percentage left and stacks the period over the countdown without warning copy',async({page})=>{
 const data=largeDesktop();data.accounts=[data.accounts[0]];
 await page.addInitScript(()=>localStorage.setItem('tokenplan.homeUsageStyle','rowfill'));
 await mockDesktop(page,'en',false,data);await page.goto('/');
 const rows=home(page).locator('.home-rowfill');await expect(rows).toHaveCount(2);
 const first=rows.first(),meta=first.locator('.home-rowfill-meta');
 await expect(first.locator('.home-rowfill-value')).toHaveText('46%');
 await expect(first).not.toContainText('Near quota limit');
 await expect(home(page).locator('.quota-warning')).toHaveCount(0);
 await expect(meta).toContainText('5h');
 const valueBox=(await first.locator('.home-rowfill-value').boundingBox())!,metaBox=(await meta.boundingBox())!;
 expect(valueBox.x+valueBox.width).toBeLessThanOrEqual(metaBox.x);
 const periodBox=(await meta.locator(':scope > span').first().boundingBox())!,resetBox=(await meta.locator('.reset').boundingBox())!;
 expect(periodBox.y+periodBox.height).toBeLessThanOrEqual(resetBox.y);
});
test('textured bar fills in when shown and glides, not jumps, to a refreshed reading',async({page})=>{
 const data=largeDesktop();data.accounts=[data.accounts[0]];
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.addInitScript(()=>localStorage.setItem('tokenplan.homeUsageStyle','texturebar:row:solid'));
 await mockDesktop(page,'en',false,data);await page.goto('/');
 const meter=home(page).locator('.metric-texture').first();await expect(meter).toHaveAttribute('aria-valuenow','46');
 // Share of canvas columns painted on the middle row: the solid fill's visible length.
 const filled=()=>meter.locator('canvas').evaluate((c:HTMLCanvasElement)=>{
  const d=c.getContext('2d')!.getImageData(0,c.height>>1,c.width,1).data;let n=0;for(let i=3;i<d.length;i+=4)if(d[i])n++;return n/c.width;
 });
 const sample=async(ms:number)=>{const seen:number[]=[];const end=Date.now()+ms;while(Date.now()<end){seen.push(await filled());await page.waitForTimeout(16);}return seen;};
 const intro=await sample(900);
 expect(intro.some(v=>v>.03&&v<.42)).toBe(true);expect(intro.at(-1)!).toBeCloseTo(.46,1);
 await page.evaluate(()=>{(window as any).__beforeRefresh=(state:any)=>{state.accounts[0].metrics[0].percent=88;};});
 await page.getByRole('button',{name:messages('en').refresh,exact:true}).click();
 await expect(meter).toHaveAttribute('aria-valuenow','88');
 const glide=await sample(900);
 expect(glide.some(v=>v>.5&&v<.84)).toBe(true);expect(glide.at(-1)!).toBeCloseTo(.88,1);
});
test('a full textured bar is painted solid to its end, in every layout',async({page})=>{
 const data=largeDesktop();data.accounts=[data.accounts[0]];data.accounts[0].metrics[0].percent=100;
 await page.addInitScript(()=>localStorage.setItem('tokenplan.homeUsageStyle','texturebar:row:hatch'));
 await mockDesktop(page,'en',false,data);await page.goto('/');
 const canvas=home(page).locator('.metric-texture canvas').first();
 await expect(canvas).toBeVisible();
 // Every pixel of the middle row is opaque: no texture gaps remain at 100%.
 await expect.poll(()=>canvas.evaluate((c:HTMLCanvasElement)=>{const d=c.getContext('2d')!.getImageData(0,c.height>>1,c.width,1).data;let n=0;for(let i=3;i<d.length;i+=4)if(d[i]===255)n++;return n/c.width;})).toBe(1);
});
test('half-width textured bar puts a large reading left, period over countdown right, and no mode copy',async({page})=>{
 const data=largeDesktop();data.accounts=[data.accounts[0]];
 await page.addInitScript(()=>localStorage.setItem('tokenplan.homeUsageStyle','texturebar:half'));
 await mockDesktop(page,'en',false,data);await page.goto('/');
 const first=home(page).locator('.home-texture-half').first(),meta=first.locator('.home-rowfill-meta');
 await expect(first.locator('.home-rowfill-value')).toHaveText('46%');
 await expect(home(page)).not.toContainText(/\b(Used|Remaining)\b/);
 const valueBox=(await first.locator('.home-rowfill-value').boundingBox())!,metaBox=(await meta.boundingBox())!;
 expect(valueBox.x+valueBox.width).toBeLessThanOrEqual(metaBox.x);
 const periodBox=(await meta.locator(':scope > span').first().boundingBox())!,resetBox=(await meta.locator('.reset').boundingBox())!;
 expect(periodBox.y+periodBox.height).toBeLessThanOrEqual(resetBox.y);
 expect((await first.locator('.home-texture-meter').boundingBox())!.y).toBeGreaterThanOrEqual(resetBox.y+resetBox.height);
});
test('concentric rings keep independent readings and never pair unrelated quotas',async({page})=>{
 const data=largeDesktop(),base=data.accounts[0];
 data.accounts=Array.from({length:7},(_,i)=>({...structuredClone(base),id:`claude:pair-${i}`,email:`pair-${i}@example.com`}));
 data.accounts[0].metrics[0].percent=37;data.accounts[0].metrics[1].percent=82;
 data.accounts[1].metrics=data.accounts[1].metrics.slice(0,1);
 data.accounts[2].metrics[1].periodSeconds=data.accounts[2].metrics[0].periodSeconds;
 data.accounts[3].metrics[1].periodSeconds=null;
 data.accounts[4].metrics.splice(1,0,{...base.metrics[0],id:'balance',label:'Balance',percent:null,periodSeconds:null,unit:'dollars',amount:7.25});
 data.accounts[5].metrics.push({...base.metrics[0],id:'extra',periodSeconds:86400});
 data.accounts[6].metrics[0].hasData=false;
 await page.addInitScript(()=>localStorage.setItem('tokenplan.homeUsageStyle','concentric'));
 await mockDesktop(page,'en',false,data);await page.goto('/');
 const accounts=home(page).locator('.account-block');
 await expect(accounts.nth(0).locator('.home-concentric')).toHaveCount(1);
 await expect(accounts.nth(0).getByRole('meter',{name:'5h · Used',exact:true})).toHaveAttribute('aria-valuetext','37%');
 await expect(accounts.nth(0).getByRole('meter',{name:'1w · Used',exact:true})).toHaveAttribute('aria-valuetext','82% · Near quota limit');
 await expect(accounts.nth(0)).toContainText('Outer Ring');await expect(accounts.nth(0)).toContainText('Inner Ring');
 for(let i=1;i<=4;i++)await expect(accounts.nth(i).locator('.home-concentric')).toHaveCount(0);
 await expect(accounts.nth(5).locator('.home-concentric')).toHaveCount(1);
 await expect(accounts.nth(5).locator('.home-compact')).toHaveCount(1);
 await expect(accounts.nth(4).locator('.home-metrics > *').nth(1)).toContainText('$7.25');
 await expect(accounts.nth(6).getByRole('meter')).toHaveCount(1);
 await expect(accounts.nth(6)).toContainText(messages('en').missing);
});

for(const language of ['en','zh-Hans','zh-Hant','ja','ko'])test(`Home styles fit with localized labels: ${language}`,async({page})=>{
 const data=largeDesktop();data.accounts[0].metrics[0].label='Claude Sonnet Extra Long Model Allowance';
 // Keep the narrow-panel regression: the grid must yield space to its numeric reading.
 if(language==='en')await page.setViewportSize({width:360,height:680});
 await mockDesktop(page,language,false,data);await page.goto('/');
 for(const theme of ['light','dark'] as const){
  await page.emulateMedia({colorScheme:theme});
  for(const style of ['Gauges','Percentage Grid',...Object.values(extraStyles)]){
   await settings(page,language);await choose(page,style,language);await back(page,language);
   const tiles=home(page).locator('.home-quota,.home-reading');await expect(tiles.first()).toContainText('46%');
   await expect(tiles.first()).not.toContainText(providerText('Used',language));
   await expect(tiles.first()).not.toContainText(providerText('Remaining',language));
   await expect(tiles.nth(1)).toContainText('92%');await expect(home(page).locator('.quota-warning')).toHaveCount(0);
   expect(await visible(page).evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);
   expect(await tiles.evaluateAll(elements=>elements.every(e=>e.scrollWidth<=e.clientWidth+1))).toBe(true);
   const bodies=await home(page).locator('.quota-body').evaluateAll(elements=>elements.slice(0,2).map(e=>e.getBoundingClientRect().y));
   if(bodies.length)expect(Math.abs(bodies[0]-bodies[1])).toBeLessThan(1);
  }
 }
});

for(const language of ['en','zh-Hans','zh-Hant','ja','ko'])test(`style picker keeps localized labels inside their cards: ${language}`,async({page},info)=>{
 await mockDesktop(page,language,false,largeDesktop());await page.goto('/');await settings(page,language);
 const label=providerText('Usage Style',language);
 await page.getByRole('button',{name:new RegExp(`^${label}`)}).click();
 const options=page.getByRole('group',{name:label,exact:true});
 await expect(options.getByRole('button')).toHaveCount(8);
 await options.scrollIntoViewIfNeeded();await page.evaluate(()=>document.fonts.ready);
 for(const colorScheme of ['light','dark'] as const){
  await page.emulateMedia({colorScheme});
  const bounds=await options.locator('.usage-style-option').evaluateAll(buttons=>buttons.flatMap(button=>{
   const label=button.querySelector('.usage-style-card-content > span')!,range=document.createRange();range.selectNodeContents(label);
   const box=button.getBoundingClientRect();
   return [...range.getClientRects()].map(rect=>({text:label.textContent,left:rect.left-box.left,right:box.right-rect.right,top:rect.top-box.top,bottom:box.bottom-rect.bottom}));
  }));
  for(const b of bounds){expect(b.left,b.text!).toBeGreaterThanOrEqual(2);expect(b.right,b.text!).toBeGreaterThanOrEqual(2);expect(b.top,b.text!).toBeGreaterThanOrEqual(2);expect(b.bottom,b.text!).toBeGreaterThanOrEqual(2);}
  expect(await visible(page).evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);
  await page.screenshot({path:info.outputPath(`style-picker-${language}-${colorScheme}.png`),animations:'disabled'});
 }
});

for(const dark of [false,true])test(`style preview follows variants without leaving settings: ${dark}`,async({page},info)=>{
 const data=largeDesktop();data.settings.appearance=dark?'dark':'light';await mockDesktop(page,'en',false,data);await page.goto('/');await settings(page);
 const preview=page.getByRole('region',{name:'Style Preview'});
 for(const [name,id] of [['Percentage Grid','cells'],['Compact Rings','rings'],['Tick Ring','ticks']]){
  await choose(page,name);await expect(preview.locator('.home-metrics')).toHaveAttribute('data-style',id);
  await expect(preview).toContainText('46%');await expect(preview).toContainText('92%');
  await preview.scrollIntoViewIfNeeded();expect(await preview.evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);
  await preview.screenshot({path:info.outputPath(`${id}-${dark}.png`)});
 }
});

for(const dark of [false,true])test(`border preview has a separate value and compact timing: ${dark}`,async({page},info)=>{
 const data=largeDesktop();data.settings.appearance=dark?'dark':'light';await mockDesktop(page,'en',false,data);await page.goto('/');await settings(page);await choose(page,'Border Progress');
 const preview=page.getByRole('region',{name:'Style Preview'}),frame=preview.locator('.home-frame').first();
 await expect(frame.locator('.home-frame-value')).toHaveText('46%');await expect(frame.locator('.home-frame-details')).toContainText('5h');
 await expect(preview).not.toContainText('Used');await expect(preview).not.toContainText('Near quota limit');await expect(page.getByRole('combobox',{name:'Variant',exact:true})).toHaveCount(0);
 const value=await frame.locator('.home-frame-value').boundingBox(),details=await frame.locator('.home-frame-details').boundingBox();expect(value!.x+value!.width).toBeLessThan(details!.x);
 const frameBox=await frame.boundingBox();expect(Math.abs(details!.x+details!.width-(frameBox!.x+frameBox!.width-14))).toBeLessThan(2);
 await expect(frame.locator('.home-frame-details')).toHaveCSS('text-align','right');
 await preview.scrollIntoViewIfNeeded();await preview.screenshot({path:info.outputPath(`border-${dark}.png`)});
});

test('style dropdowns update previews and preserve rounded inset layout',async({page},info)=>{
 await mockDesktop(page,'zh-Hans',false,largeDesktop());await page.goto('/');await settings(page,'zh-Hans');await choose(page,'Bars','zh-Hans');
 const preview=page.getByRole('region',{name:'样式预览'});
 await expect(page.getByRole('combobox',{name:'子样式',exact:true})).toContainText('标准横条');
 await page.getByRole('combobox',{name:'预测',exact:true}).click();await page.getByRole('option',{name:'显示预测',exact:true}).click();
 await expect(preview.locator('.home-forecast')).toHaveCount(2);
 await page.getByRole('combobox',{name:'预测',exact:true}).click();await page.getByRole('option',{name:'关闭',exact:true}).click();
 for(const theme of ['light','dark'] as const){await page.emulateMedia({colorScheme:theme});await preview.scrollIntoViewIfNeeded();
  const layout=await preview.evaluate(e=>{const surface=e.closest('.preference-surface')!,a=e.getBoundingClientRect(),b=surface.getBoundingClientRect();return {radius:parseFloat(getComputedStyle(e).borderRadius),inset:b.bottom-a.bottom,overflow:e.scrollWidth>e.clientWidth};});
  expect(layout.radius).toBeGreaterThan(0);expect(layout.inset).toBeGreaterThanOrEqual(10);expect(layout.overflow).toBe(false);
  await preview.screenshot({path:info.outputPath(`rounded-preview-${theme}.png`)});
 }
});

for(const theme of ['light','dark'] as const)test(`single rings bind percentages to their own arc in ${theme}`,async({page},info)=>{
 const data=largeDesktop(),account=data.accounts[0],base=account.metrics[0];data.accounts=[account];
 account.metrics=[{...base,id:'session',label:'Session',periodSeconds:18000,percent:0},{...base,id:'weekly',label:'Weekly',periodSeconds:604800,percent:46}];
 await page.addInitScript(()=>localStorage.setItem('tokenplan.homeUsageStyle','rings'));
 await mockDesktop(page,'en',false,data);await page.emulateMedia({colorScheme:theme});await page.goto('/');
 const tiles=home(page).locator('.home-compact');
 await expect(tiles.locator('.home-ring-value')).toHaveText(['0%','46%']);
 await expect(tiles.locator('.home-quota-heading')).toHaveText(['5h','1w']);
 for(const width of [350,390]){
  await page.setViewportSize({width,height:680});
  const boxes=await tiles.evaluateAll(es=>es.map(e=>{
   const rect=(selector:string)=>{const r=e.querySelector(selector)!.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};};
   const r=e.getBoundingClientRect();return {left:r.left,right:r.right,meter:rect('.home-small-meter'),value:rect('.home-ring-value'),text:rect('.home-readout')};
  }));
  expect(boxes[1].left-boxes[0].right).toBeGreaterThanOrEqual(24);
  for(const b of boxes){expect(b.value.left).toBeGreaterThanOrEqual(b.meter.left);expect(b.value.right).toBeLessThanOrEqual(b.meter.right);expect(b.text.left-b.meter.right).toBeGreaterThanOrEqual(10);}
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:info.outputPath(`single-ring-${theme}-${width}.png`)});
 }
});
