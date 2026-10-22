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
async function settings(page:Page,language='en') {
 await page.getByRole('button',{name:messages(language).more,exact:true}).click();
 await page.getByRole('menuitem',{name:textFor(language).settings,exact:true}).click();
}
async function choose(page:Page,name:string,language='en') {
 await page.getByRole('combobox',{name:providerText('Home Usage Style',language),exact:true}).click();
 await page.getByRole('option',{name,exact:true}).click();
}
const back=(page:Page,language='en')=>page.getByRole('button',{name:messages(language).back,exact:true}).click();

test('Home style persists independently of density, tray and details, with keyboard selection',async({page})=>{
 const data=largeDesktop();data.accounts=data.accounts.slice(0,2);
 await mockDesktop(page,'en',false,data);await page.goto('/');
 await expect(home(page)).toHaveAttribute('data-usage-style','bars');
 await settings(page);
 const tray=await page.locator('.menu-bar-preview').innerHTML();
 const select=page.getByRole('combobox',{name:'Home Usage Style',exact:true});
 await select.focus();await page.keyboard.press('Enter');
 await expect(page.getByRole('option',{name:'Bars',exact:true})).toBeFocused();
 await page.keyboard.press('ArrowDown');await expect(page.getByRole('option',{name:'Gauges',exact:true})).toBeFocused();await page.keyboard.press('Enter');
 await expect(select).toBeFocused();await expect(home(page)).toHaveAttribute('data-usage-style','gauges');
 await select.press('Enter');await expect(page.getByRole('option',{name:'Gauges',exact:true})).toBeFocused();
 await page.keyboard.press('Escape');await expect(select).toBeFocused();
 expect(await page.evaluate(()=>(window as any).__panelHides??0)).toBe(0);
 expect(await page.locator('.menu-bar-preview').innerHTML()).toBe(tray);
 await page.getByRole('combobox',{name:'Home Layout',exact:true}).click();await page.getByRole('option',{name:'Comfortable',exact:true}).click();
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
});

test('unreadable preferences and failed saves stay visible and recover without changing the previous style',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('tokenplan.homeUsageStyle','unrecognized'));
 await mockDesktop(page,'en');await page.goto('/');await settings(page);
 await expect(visible(page).getByRole('alert')).toHaveText('Could not load the Home usage style. Choose a style to save it again.');
 await choose(page,'Gauges');await expect(visible(page).getByRole('alert')).toHaveCount(0);
 await page.evaluate(()=>{const original=Storage.prototype.setItem;(window as any).__restoreStorage=()=>{Storage.prototype.setItem=original;};Storage.prototype.setItem=function(key,value){if(key==='tokenplan.homeUsageStyle')throw new Error('fixture write denied');original.call(this,key,value);};});
 await choose(page,'Percentage Grid');await expect(visible(page).getByRole('alert')).toHaveText('Could not save. Try again.');
 await expect(home(page)).toHaveAttribute('data-usage-style','gauges');
 expect(await page.evaluate(()=>localStorage.getItem('tokenplan.homeUsageStyle'))).toBe('gauges');
 await page.evaluate(()=>(window as any).__restoreStorage());await choose(page,'Percentage Grid');
 await expect(visible(page).getByRole('alert')).toHaveCount(0);await expect(home(page)).toHaveAttribute('data-usage-style','cells');
});

for(const style of ['gauges','cells'] as const)for(const remaining of [false,true])test(`${style} preserves ${remaining?'remaining':'used'} readings, limits, missing data and metric order`,async({page})=>{
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
  if(style==='gauges'){
   const meter=tile.getByRole('meter',{name:`Quota ${i} · 5h · ${mode}`,exact:true});
   await expect(meter).toHaveAttribute('aria-valuetext',new RegExp(`^${shown[i]}`));
   await expect(meter).toHaveAttribute('aria-valuenow',String(Math.max(0,Math.min(100,values[i]))));
  }else{
   await expect(tile.locator('[data-category="reading"]')).toHaveCount(cells[i]);
   await expect(tile.locator('[data-category]')).toHaveCount(i===4?0:100);
   expect(await tile.locator('.quota-number strong').evaluate(e=>{const range=document.createRange();range.selectNodeContents(e);return range.getClientRects().length;})).toBe(1);
  }
 }
 await expect(home(page).locator('[data-metric="quota-1"] .quota-warning')).toBeEmpty();
 await expect(home(page).locator('[data-metric="quota-2"] .quota-warning')).toHaveText('Near quota limit');
 await expect(home(page).locator('[data-metric="quota-3"] .quota-warning')).toHaveText('Quota exhausted');
 await expect(home(page).locator('[data-metric="quota-4"] .quota-warning')).toHaveText('Quota exceeded');
 for(const id of ['missing','null']){
  const tile=home(page).locator(`[data-metric="${id}"]`);await expect(tile).toHaveAttribute('data-tone','normal');
  await expect(tile.getByRole('meter').or(tile.getByRole('img'))).toHaveCount(0);await expect(tile.locator('.quota-missing')).toContainText(messages('en').missing);
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

for(const language of ['en','zh-Hans','zh-Hant','ja','ko'])test(`Home styles fit with localized labels: ${language}`,async({page})=>{
 const data=largeDesktop();data.accounts[0].metrics[0].label='Claude Sonnet Extra Long Model Allowance';
 await mockDesktop(page,language,false,data);await page.goto('/');
 for(const theme of ['light','dark'] as const){
  await page.emulateMedia({colorScheme:theme});
  for(const style of ['Gauges','Percentage Grid']){
   await settings(page,language);await choose(page,providerText(style,language),language);await back(page,language);
   const tiles=home(page).locator('.home-quota');await expect(tiles.first()).toContainText(providerText('Used',language));
   await expect(tiles.nth(1)).toContainText(providerText('Near quota limit',language));
   expect(await visible(page).evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);
   expect(await tiles.evaluateAll(elements=>elements.every(e=>e.scrollWidth<=e.clientWidth+1))).toBe(true);
   const bodies=await home(page).locator('.quota-body').evaluateAll(elements=>elements.slice(0,2).map(e=>e.getBoundingClientRect().y));
   expect(Math.abs(bodies[0]-bodies[1])).toBeLessThan(1);
  }
 }
});
