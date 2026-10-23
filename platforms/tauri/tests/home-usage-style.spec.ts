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
const extraStyles={rings:'Compact Rings',ruler:'Quota Ruler',concentric:'Concentric Rings',numbers:'Numbers',segments:'Segmented Bar'};
async function settings(page:Page,language='en') {
 await page.getByRole('button',{name:messages(language).more,exact:true}).click();
 await page.getByRole('menuitem',{name:textFor(language).settings,exact:true}).click();
}
async function choose(page:Page,name:string,language='en') {
 const label=providerText('Usage Style',language),toggle=page.getByRole('button',{name:new RegExp(`^${label}`)});
 if(await toggle.getAttribute('aria-expanded')==='false')await toggle.click();
 await page.getByRole('group',{name:label,exact:true}).getByRole('button',{name,exact:true}).click();
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
 await expect(toggle).toHaveAttribute('aria-expanded','false');await expect(toggle).toContainText('Bars');await expect(options).toHaveCount(0);
 await toggle.focus();await page.keyboard.press('Enter');await expect(toggle).toHaveAttribute('aria-expanded','true');
 await expect(options.getByRole('button')).toHaveCount(8);
 await expect(options.getByRole('button',{name:'Bars',exact:true})).toHaveAttribute('aria-pressed','true');
 await options.getByRole('button',{name:'Gauges',exact:true}).focus();await page.keyboard.press('Enter');
 await expect(home(page)).toHaveAttribute('data-usage-style','gauges');
 await expect(options.getByRole('button',{name:'Gauges',exact:true})).toHaveAttribute('aria-pressed','true');
 await expect(options.getByRole('button',{name:'Bars',exact:true})).toHaveAttribute('aria-pressed','false');
 await expect(toggle).toContainText('Gauges');
 await toggle.click();await expect(options).toHaveCount(0);
 expect(await page.evaluate(()=>(window as any).__panelHides??0)).toBe(0);
 expect(await page.locator('.menu-bar-preview').count()?await page.locator('.menu-bar-preview').innerHTML():null).toBe(tray);
 await page.getByRole('combobox',{name:'Density',exact:true}).click();await page.getByRole('option',{name:'Comfortable',exact:true}).click();
 await back(page);
 await expect(home(page).getByRole('meter',{name:'5h · Used',exact:true}).first()).toHaveAttribute('aria-valuetext','46%');
 await home(page).getByRole('button',{name:'Claude first@example.com',exact:true}).click();
 await expect(visible(page).getByRole('progressbar')).toHaveCount(2);await expect(visible(page).getByRole('meter')).toHaveCount(0);
 await back(page);await settings(page);await choose(page,'Percentage Grid');
 await page.getByRole('switch',{name:textFor('en').showRemaining,exact:true}).click();await back(page);
 await expect(home(page).getByRole('img',{name:'5h · Remaining · 54%. Each cell is 1%.',exact:true})).toHaveCount(1);
 await page.reload();await expect(home(page)).toHaveAttribute('data-usage-style','cells');
 await expect(page.locator('.mac-preview')).toHaveAttribute('data-density','comfortable');
 await settings(page);await choose(page,'Bars');await back(page);
 await expect(home(page).getByRole('progressbar')).toHaveCount(4);await expect(home(page).getByRole('meter')).toHaveCount(0);
 for(const [style,label] of Object.entries(extraStyles)){
  await settings(page);await choose(page,label);await back(page);await page.reload();
  await expect(home(page)).toHaveAttribute('data-usage-style',style);
  await expect(page.locator('.mac-preview')).toHaveAttribute('data-density','comfortable');
  await settings(page);await expect(page.getByRole('button',{name:/^Usage Style/})).toContainText(label);await back(page);
 }
});

test('unreadable preferences and failed saves stay visible and recover without changing the previous style',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('tokenplan.homeUsageStyle','unrecognized'));
 await mockDesktop(page,'en');await page.goto('/');await settings(page);
 await expect(visible(page).getByRole('alert')).toHaveText('Could not load the Home usage style. Choose a style to save it again.');
 await choose(page,'Gauges');await expect(visible(page).getByRole('alert')).toHaveCount(0);
 await page.evaluate(()=>{const original=Storage.prototype.setItem;(window as any).__restoreStorage=()=>{Storage.prototype.setItem=original;};Storage.prototype.setItem=function(key,value){if(key==='tokenplan.homeUsagePreferences')throw new Error('fixture write denied');original.call(this,key,value);};});
 await choose(page,'Percentage Grid');await expect(visible(page).getByRole('alert')).toHaveText('Could not save. Try again.');
 await expect(home(page)).toHaveAttribute('data-usage-style','gauges');
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('tokenplan.homeUsagePreferences')!).style)).toBe('gauges');
 await page.evaluate(()=>(window as any).__restoreStorage());await choose(page,'Percentage Grid');
 await expect(visible(page).getByRole('alert')).toHaveCount(0);await expect(home(page)).toHaveAttribute('data-usage-style','cells');
});

for(const style of ['gauges','cells','rings','ruler','concentric','numbers','segments'] as const)for(const remaining of [false,true])test(`${style} preserves ${remaining?'remaining':'used'} readings, limits, missing data and metric order`,async({page})=>{
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
 }
 if(style==='segments'){
  const fills=await home(page).locator('[data-metric="quota-5"] .home-segment-track > span > span').evaluateAll(es=>es.map(e=>new DOMMatrix(getComputedStyle(e).transform).a));
  // 37.6% = seven whole cells and 52% of the eighth, not eight whole cells.
  expect(fills.slice(0,remaining?12:7)).toEqual(Array(remaining?12:7).fill(1));
  expect(fills[remaining?12:7]).toBeCloseTo(remaining?0.48:0.52,5);
  expect(fills.slice(remaining?13:8)).toEqual(Array(remaining?7:12).fill(0));
 }
 await expect(home(page).locator('[data-metric="quota-1"]')).not.toContainText('Near quota limit');
 await expect(home(page).locator('[data-metric="quota-2"] .quota-warning')).toHaveText('Near quota limit');
 await expect(home(page).locator('[data-metric="quota-3"] .quota-warning')).toHaveText('Quota exhausted');
 await expect(home(page).locator('[data-metric="quota-4"] .quota-warning')).toHaveText('Quota exceeded');
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
   await settings(page,language);await choose(page,providerText(style,language),language);await back(page,language);
   const tiles=home(page).locator('.home-quota,.home-reading');await expect(tiles.first()).toContainText(providerText('Used',language));
   await expect(tiles.nth(1)).toContainText(providerText('Near quota limit',language));
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
