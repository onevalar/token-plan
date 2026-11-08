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
const legacy:Record<string,string[]>={'Gauges':['Instruments','Dashboard Ring'],'Quota Ruler':['Bars','Quota Ruler'],'Numbers':['Editorial & Numbers','Numbers'],'Percentage Grid':['Cells','Grid'],'Compact Rings':['Rings','Single Ring'],'Concentric Rings':['Rings','Double Ring'],'Tick Ring':['Rings','Single Ring Ticks'],'Segmented Bar':['Cells','Single Row']};
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
 await expect(options.getByRole('button')).toHaveCount(10);
 await expect(options.getByRole('button',{name:'Bars',exact:true})).toHaveAttribute('aria-pressed','true');
 await options.getByRole('button',{name:'Instruments',exact:true}).focus();await page.keyboard.press('Enter');await page.getByRole('combobox',{name:'Variant',exact:true}).click();await page.getByRole('option',{name:'Dashboard Ring',exact:true}).click();
 await expect(home(page)).toHaveAttribute('data-usage-style','gauges');
 await expect(options.getByRole('button',{name:'Instruments',exact:true})).toHaveAttribute('aria-pressed','true');
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
   await expect(tile.locator('.quota-ticks')).toHaveText(shown[i]);
   await expect(tile.locator('.quota-ticks')).not.toContainText(mode);
   // The independently authored meter need not use the former Pro SVG mask.
   await expect(tile.getByRole('meter')).toHaveAttribute('aria-valuemin','0');
   await expect(tile.getByRole('meter')).toHaveAttribute('aria-valuemax','100');
  }
 }
 if(style==='ticks'){
  const rings=home(page).locator('.quota-ticks');
  await expect(rings.getByRole('meter')).toHaveCount(values.length+1); // Includes the independent not-started quota, never missing readings.
  await expect(home(page).locator('[data-metric="missing"],[data-metric="null"]').getByRole('meter')).toHaveCount(0);
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
 if(style==='ticks'){
  const meter=home(page).locator('[data-metric="quota-0"]').getByRole('meter');
  await expect(meter).toHaveAttribute('aria-valuenow','7');await expect(meter).toHaveAttribute('aria-valuetext',remaining?'7% · Near quota limit':'7%');
 }
});

for(const style of ['cells','numbers'])test(`${style} fits up to three compact quotas per row without reserving empty columns`,async({page},info)=>{
 const data=largeDesktop(),base=data.accounts[0],quota=base.metrics[0],gap=style==='cells'?12:24;
 const readings=[17,63,92].map((percent,i)=>({...quota,id:`q${i}`,label:['Session','Weekly','Monthly'][i],periodSeconds:[18000,604800,2592000][i],percent}));
 const longName='Long Model Name With Its Own Independent Allowance';
 const edge=[...readings,{...quota,id:'long',label:longName,percent:112},{...quota,id:'negative',label:'Extra',percent:-12},
  {...quota,id:'missing',label:'Unavailable Allowance',hasData:false},{...quota,id:'null',label:'Pending Allowance',percent:null}];
 const balance={...quota,id:'balance',label:'Balance',percent:null,periodSeconds:null,unit:'dollars',amount:7.25};
 data.accounts=[readings,[...readings.slice(0,1),balance],[balance,...readings.slice(0,2)],edge,[...readings,balance,...readings.slice(0,2).map(m=>({...m,id:`after-${m.id}`}))]]
  .map((metrics,i)=>({...structuredClone(base),id:`claude:layout-${i}`,email:`layout-${i}@example.com`,metrics}));
 await page.addInitScript(style=>localStorage.setItem('tokenplan.homeUsageStyle',style),style);
 await mockDesktop(page,'en',false,data);await page.goto('/');
 const grids=home(page).locator('.home-metrics'),tiles=(index:number)=>grids.nth(index).locator(':scope > [data-metric]');
 const boxes=(index:number)=>tiles(index).evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width};}));
 const rowCount=async(index:number)=>{const b=await boxes(index);return b.filter(r=>Math.abs(r.y-b[0].y)<1).length;};
 for(const density of ['compact','comfortable']){
  await page.evaluate(value=>localStorage.setItem('tokenplan.homeDensity',value),density);await page.reload();await page.evaluate(()=>document.fonts.ready);
  await expect(grids).toHaveCount(5);
  expect(await rowCount(0)).toBe(3);
  for(const count of [1,2,3]){
   const index=count===3?0:count,b=await boxes(index),grid=(await grids.nth(index).boundingBox())!;
   expect(b).toHaveLength(count);expect(b[0].x).toBeCloseTo(grid.x,1);expect(b.at(-1)!.right).toBeCloseTo(grid.x+grid.width,1);
   for(let i=1;i<count;i++){expect(b[i].y).toBeCloseTo(b[0].y,1);expect(b[i].x-b[i-1].right).toBeCloseTo(gap,1);}
  }
  const many=await boxes(3);expect(await rowCount(3)).toBe(3);expect(many[3].y).toBeGreaterThanOrEqual(many[0].bottom);expect(many[6].y).toBeGreaterThanOrEqual(many[3].bottom);
  const valueSelector=style==='cells'?'.quota-number strong':'.home-number-value';
  await expect(tiles(0).locator(valueSelector)).toHaveText(['17%','63%','92%']);
  await expect(tiles(3).nth(3)).toContainText(longName);await expect(tiles(3).nth(3).locator(valueSelector)).toHaveText('112%');
  await expect(tiles(3).nth(4).locator(valueSelector)).toHaveText('-12%');
  for(const index of [5,6])await expect(tiles(3).nth(index)).toContainText(messages('en').missing);
  // Inspect actual text bounds, not just scrollWidth: clipped names or split numbers must not pass.
  const textBounds=await grids.locator('.quota-title,.home-number-label > span,.quota-number strong,.home-number-value').evaluateAll(es=>es.map(e=>{
   const range=document.createRange();range.selectNodeContents(e);const tile=e.closest('[data-metric]')!.getBoundingClientRect(),rects=[...range.getClientRects()];
   range.selectNodeContents(e.querySelector('strong')??e);
   return {text:e.textContent,fits:rects.every(r=>r.left>=tile.left-1&&r.right<=tile.right+1&&r.top>=tile.top-1&&r.bottom<=tile.bottom+1),
    clipped:getComputedStyle(e).textOverflow==='ellipsis',value:e.matches('.quota-number strong,.home-number-value'),lines:range.getClientRects().length};
  }));
  for(const b of textBounds){expect(b.fits,b.text!).toBe(true);expect(b.clipped,b.text!).toBe(false);if(b.value)expect(b.lines,b.text!).toBe(1);}
  expect(await grids.locator('[data-metric]').evaluateAll(es=>es.every(e=>e.scrollWidth<=e.clientWidth+1))).toBe(true);
  if(style==='cells')for(const width of await grids.locator('.quota-grid').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().width)))expect(width).toBe(76);
  else await expect(tiles(0).first().locator('.home-number-value strong')).toHaveCSS('font-size','36px');
  const mixed=grids.nth(4),order=await mixed.locator(':scope > *').evaluateAll(es=>es.map(e=>e.getAttribute('data-metric')??'balance'));
  expect(order).toEqual(['q0','q1','q2','balance','after-q0','after-q1']);
  const mixedBox=(await mixed.boundingBox())!,full=(await mixed.locator('.home-metric-row').boundingBox())!,mb=await boxes(4);
  expect(full.x).toBeCloseTo(mixedBox.x,1);expect(full.width).toBeCloseTo(mixedBox.width,1);expect(full.y).toBeGreaterThanOrEqual(mb[0].bottom);expect(mb[3].y).toBeGreaterThanOrEqual(full.y+full.height);
  await grids.first().screenshot({path:info.outputPath(`${style}-three-${density}.png`)});
  // Width belongs to the containing account, not the viewport; test both sides of each fit threshold.
  for(const [width,columns] of [[288+2*gap,3],[287+2*gap,2],[192+gap,2],[191+gap,1]]){
   await grids.first().locator('..').evaluate((e,width)=>{(e as HTMLElement).style.width=`${width}px`;},width);
   expect(await rowCount(0),`container ${width}px`).toBe(columns);
  }
  await grids.first().locator('..').evaluate(e=>{(e as HTMLElement).style.removeProperty('width');});
  await page.setViewportSize({width:560,height:680});expect(await rowCount(3)).toBe(3);await page.setViewportSize({width:390,height:680});
 }
 await settings(page);await choose(page,style==='cells'?'Percentage Grid':'Numbers');
 const preview=page.getByRole('region',{name:'Style Preview'}),sample=preview.locator('[data-metric]');
 const first=(await sample.first().boundingBox())!,last=(await sample.last().boundingBox())!;expect(first.y).toBeCloseTo(last.y,1);
 const grid=(await preview.locator('.home-metrics').boundingBox())!;expect(last.x+last.width).toBeCloseTo(grid.x+grid.width,1);
 await preview.evaluate(e=>{(e as HTMLElement).style.width='190px';});
 expect((await sample.last().boundingBox())!.y).toBeGreaterThanOrEqual((await sample.first().boundingBox())!.y+(await sample.first().boundingBox())!.height);
 expect(await preview.evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);
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
 await expect(options.getByRole('button')).toHaveCount(10);
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

const approved=[
 ['instrument','Instruments','Needle Dials'],['instrument:edge','Instruments','Side Dials'],['instrument:primary','Instruments','Primary Dial'],
 ['cells:dots','Cells','Dot Matrix'],['cells:grille','Cells','Slanted Grille'],['vessel:chambers','Containers','Segmented Battery'],
 ['cycle','Cycles','Dual Racetrack'],['cycle:lanes','Cycles','Parallel Cycle'],['cycle:clock','Cycles','Reset Sundial'],
 ['ruler:cursor','Bars','Horizontal Cursor'],['ruler:edge','Bars','Edge Ruler'],['ruler:folded','Bars','Folded Ruler'],
 ['numbers:ticket','Editorial & Numbers','Quota Ticket'],['numbers:spread','Editorial & Numbers','Used & Remaining'],['numbers:spine','Editorial & Numbers','Number Spine'],
] as const;

for(const [style] of approved)for(const remaining of [false,true])test(`approved Home ${style}: precise ${remaining?'Remaining':'Used'}, mixed metrics and responsive themes`,async({page})=>{
 const data=largeDesktop(),account=data.accounts[0],base=account.metrics[0];data.accounts=[account];data.settings.showRemaining=remaining;
 const used=[0,.4,79.6,80,100,112,-12],values=used.map(n=>remaining?Number((100-n).toFixed(8)):n);
 account.metrics=values.map((percent,i)=>({...base,id:`q${i}`,label:i===2?'Long Model Name With Its Own Independent Allowance':`Quota ${i}`,percent,notStarted:i===0}));
 account.metrics.splice(1,0,{...base,id:'balance',label:'Balance',percent:null,periodSeconds:null,unit:'dollars',amount:7.25});
 account.metrics.push({...base,id:'missing',label:'Missing',hasData:false,percent:95},{...base,id:'null',label:'Null',percent:null,resetsAt:null});
 account.metrics[0].expiries=['2026-10-30T03:01:06Z'];
 await page.addInitScript(style=>localStorage.setItem('tokenplan.homeUsageStyle',style),style);await mockDesktop(page,'en',false,data);await page.goto('/');
 const design=home(page).locator('.home-quota-designs');await expect(design).toHaveAttribute('data-style',style);
 expect(await design.locator('[data-metric]').evaluateAll(es=>es.map(e=>e.getAttribute('data-metric')))).toEqual(account.metrics.map(m=>m.id));
 for(let i=0;i<values.length;i++){
  const tile=design.locator(`[data-metric="q${i}"]`);await expect(tile.locator('[data-quota-value]')).toHaveText(`${values[i]}%`);
  await expect(tile).toHaveAttribute('data-tone',used[i]>=80?'critical':'normal');expect(Number(await tile.getAttribute('data-used'))).toBeCloseTo(used[i],8);
  const encoded=style==='numbers:spread'?used[i]:values[i];
  expect(Number(await tile.getByRole('meter').getAttribute('aria-valuenow'))).toBeCloseTo(Math.max(0,Math.min(100,encoded)),8);
 }
 for(const id of ['missing','null']){
  const tile=design.locator(`[data-metric="${id}"]`);await expect(tile).toContainText(messages('en').missing);await expect(tile.getByRole('meter')).toHaveCount(0);
  await expect(tile.locator('[data-needle-value],[data-rail-marker],[data-quota-fill],.hq-b-battery-fill')).toHaveCount(0);
  if(id==='missing')await expect(tile.locator('.reset')).toHaveCount(0);
 }
 await expect(design.locator('[data-metric="balance"]')).toContainText('$7.25');await expect(design.locator('[data-metric="q0"] .expiries')).toContainText('2026');
 await expect(design.locator('[data-metric="q0"] .reset')).toHaveText(textFor('en').notStarted);
 for(const width of [390,560])for(const colorScheme of ['light','dark'] as const){
  await page.setViewportSize({width,height:800});await page.emulateMedia({colorScheme});await page.evaluate(()=>document.fonts.ready);
  expect(await design.evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);
  expect(await design.locator('[data-metric]').evaluateAll(es=>es.every(e=>e.scrollWidth<=e.clientWidth+1))).toBe(true);
  expect(await visible(page).evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);
 }
});

test('all approved looks are categorized, selectable and previewed with the production renderer',async({page})=>{
 await mockDesktop(page,'en',false,largeDesktop());await page.goto('/');await settings(page);
 for(const [id,category,label] of approved){
  await choose(page,category);await page.getByRole('combobox',{name:'Variant',exact:true}).click();await page.getByRole('option',{name:label,exact:true}).click();
  await expect(page.getByRole('region',{name:'Style Preview'}).locator('.home-quota-designs')).toHaveAttribute('data-style',id);
  await expect(page.getByRole('button',{name:/^Usage Style/})).toContainText(label);await expect(home(page)).toHaveAttribute('data-usage-style',id);
 }
 await back(page);await page.reload();await expect(home(page).locator('.home-quota-designs').first()).toHaveAttribute('data-style','numbers:spine');
});

test('quota disclosure shows real readings and reset time, and Escape or close restores the trigger',async({page})=>{
 const data=largeDesktop();data.accounts=[data.accounts[0]];data.settings.showRemaining=true;data.accounts[0].metrics[0].percent=-12;
 await page.addInitScript(()=>localStorage.setItem('tokenplan.homeUsageStyle','numbers:ticket'));await mockDesktop(page,'en',false,data);await page.goto('/');
 const trigger=home(page).getByRole('button',{name:'View 5h Quota Details',exact:true}),detail=home(page).getByRole('region',{name:'5h · Quota Details',exact:true});
 await trigger.focus();await page.keyboard.press('Enter');await expect(detail).toBeFocused();await expect(trigger).toHaveAttribute('aria-expanded','true');
 await expect(trigger).toHaveAttribute('aria-controls',(await detail.getAttribute('id'))!);
 await expect(detail.locator('dd').nth(0)).toHaveText('112%');await expect(detail.locator('dd').nth(1)).toHaveText('-12%');
 await expect(detail.locator('time')).toHaveAttribute('datetime',data.accounts[0].metrics[0].resetsAt!);
 await page.keyboard.press('Tab');await expect(detail.getByRole('button',{name:'Close Quota Details'})).toBeFocused();
 await page.keyboard.press('Escape');await expect(detail).toHaveCount(0);await expect(trigger).toBeFocused();
 await page.keyboard.press('Space');await detail.getByRole('button',{name:'Close Quota Details'}).click();await expect(trigger).toBeFocused();
 await page.evaluate(()=>{(window as any).__beforeRefresh=(s:any)=>{s.accounts[0].metrics[0].hasData=false;};});
 await page.getByRole('button',{name:messages('en').refresh,exact:true}).click();await trigger.click();
 await expect(detail.locator('dd')).toHaveText(Array(4).fill(messages('en').missing));await expect(detail.locator('time')).toHaveCount(0);
 await page.keyboard.press('Escape');await expect(trigger).toBeFocused();await expect(trigger).not.toHaveAttribute('aria-controls');
 expect(await page.evaluate(()=>(window as any).__panelHides??0)).toBe(0);
});

test('Primary Dial shows each quota once in compact independent rows',async({page})=>{
 const data=largeDesktop();data.accounts=[data.accounts[0]];
 await page.addInitScript(()=>localStorage.setItem('tokenplan.homeUsageStyle','instrument:primary'));await mockDesktop(page,'en',false,data);await page.goto('/');
 const rows=home(page).locator('.hq-primary-row');await expect(rows).toHaveCount(2);
 await expect(home(page).locator('.hq-primary-hero,.hq-track')).toHaveCount(0);
 await expect(home(page).getByRole('meter')).toHaveCount(2);
 for(const row of await rows.all()){await expect(row.locator('[data-quota-value]')).toHaveCount(1);expect((await row.boundingBox())!.height).toBeLessThan(145);}
 await rows.first().getByRole('button').click();await expect(home(page).getByRole('region',{name:/Quota Details/})).toBeVisible();
 await page.keyboard.press('Escape');await expect(rows.first().getByRole('button')).toBeFocused();
 await page.screenshot({path:'../../dist/review-instruments/needle.png'});
});

test('Dashboard Ring is an instrument with its cycle inside the dial',async({page})=>{
 await mockDesktop(page,'en',false,largeDesktop());await page.goto('/');await settings(page);await choose(page,'Gauges');
 const preview=page.getByRole('region',{name:'Style Preview'});
 await expect(preview.locator('.quota-gauge-reading')).toHaveCount(2);
 await expect(preview.locator('.quota-title')).toHaveCount(0);
 await expect(preview.locator('.quota-gauge-reading').first()).toContainText('5h');
 await preview.screenshot({path:'../../dist/review-instruments/gauges.png'});
});

test('Dashboard Ring moves an overflowing name above its unchanged dial while short cycles stay inside',async({page},info)=>{
 const data=largeDesktop(),account=data.accounts[0],base=account.metrics[0];data.accounts=[account];
 const name='Long Model Name With Its Own Independent Allowance';account.metrics=[base,{...base,id:'long',label:name,percent:92}];
 await page.addInitScript(()=>localStorage.setItem('tokenplan.homeUsageStyle','gauges'));await mockDesktop(page,'en',false,data);await page.goto('/');
 for(const density of ['compact','comfortable']){
  await page.evaluate(value=>localStorage.setItem('tokenplan.homeDensity',value),density);await page.reload();await page.evaluate(()=>document.fonts.ready);
  const short=home(page).locator('[data-metric="session"]'),long=home(page).locator('[data-metric="long"]');
  await expect(long.locator('.quota-title')).toHaveText(`${name} · 5h`);await expect(short.locator('.quota-title')).toHaveCount(0);
  await expect(short.locator('.quota-gauge-reading>span')).toHaveText('5h');await expect(long.locator('.quota-gauge-reading>strong')).toHaveText('92%');
  const label=(await long.locator('.quota-title').boundingBox())!,dial=(await long.locator('.quota-gauge').boundingBox())!,small=(await short.locator('.quota-gauge').boundingBox())!;
  expect(label.y+label.height).toBeLessThanOrEqual(dial.y);expect(dial.width).toBe(116);expect(dial.height).toBeCloseTo(small.height,1);expect(dial.y).toBeCloseTo(small.y,1);
  const inside=(await short.locator('.quota-gauge-reading>span').boundingBox())!;
  expect(inside.y).toBeGreaterThan(small.y);expect(inside.y+inside.height).toBeLessThan(small.y+small.height);
  expect(await visible(page).evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);
  await home(page).screenshot({path:info.outputPath(`gauge-label-${density}.png`)});
 }
 await page.evaluate(()=>{(window as any).__beforeRefresh=(s:any)=>{s.accounts[0].metrics[1].label='Session';};});
 await page.getByRole('button',{name:messages('en').refresh,exact:true}).click();
 await expect(home(page).locator('.quota-title')).toHaveCount(0);await expect(home(page).locator('.quota-gauge-reading>span')).toHaveText(['5h','5h']);
});

test('Dashboard Ring preserves readable values, colored arcs and missing-value hierarchy',async({page})=>{
 const data=largeDesktop(),account=data.accounts[0],base=account.metrics[0];data.accounts=[account];
 account.metrics.push({...base,id:'missing',hasData:false},{...base,id:'null',percent:null});
 await page.addInitScript(()=>localStorage.setItem('tokenplan.homeUsageStyle','gauges'));await mockDesktop(page,'en',false,data);await page.goto('/');
 const normal=home(page).locator('[data-metric="session"]'),critical=home(page).locator('[data-metric="weekly"]');
 for(const colorScheme of ['light','dark'] as const){
  await page.emulateMedia({colorScheme});await expect(page.locator('html')).toHaveAttribute('data-theme',colorScheme);
  const label=normal.locator('.quota-gauge-reading>span'),value=normal.locator('.quota-gauge-reading>strong');
  await expect(value).toBeVisible();await expect(value).toHaveText('46%');
  await expect.soft(value).toHaveCSS('color',await label.evaluate(e=>getComputedStyle(e).color));
  const brand=await home(page).locator('.provider-logo').evaluate(e=>getComputedStyle(e).color);
  await expect(normal.locator('.quota-gauge path').last()).toHaveCSS('stroke',brand);
  await expect(critical.locator('.quota-gauge-reading>strong')).toHaveText('92%');
  await expect(critical.locator('.quota-gauge-reading>strong')).toHaveCSS('color',await critical.locator('.quota-gauge path').last().evaluate(e=>getComputedStyle(e).stroke));
  for(const id of ['missing','null']){
   const tile=home(page).locator(`[data-metric="${id}"]`),name=tile.locator('.quota-missing>span').first(),dash=tile.locator('.quota-missing>[aria-hidden="true"]');
   await expect(name).toBeVisible();await expect(dash).toHaveText('—');await expect(tile).toContainText(messages('en').missing);
   await expect(tile.getByRole('meter')).toHaveCount(0);
   await expect.soft(name).toHaveCSS('font-size',await label.evaluate(e=>getComputedStyle(e).fontSize));
   expect.soft(await dash.evaluate(e=>parseFloat(getComputedStyle(e).fontSize))).toBeGreaterThan(await name.evaluate(e=>parseFloat(getComputedStyle(e).fontSize)));
  }
 }
});

for(const style of ['cycle','cycle:lanes','cycle:clock'])test(`${style} keeps independent time channels and never infers a missing or renewed cycle`,async({page})=>{
 const now=Date.parse('2026-10-28T08:00:00Z'),data=largeDesktop(new Date(now));data.accounts=[data.accounts[0]];
 await page.clock.setFixedTime(now);data.accounts[0].metrics[1].resetsAt=new Date(now+604800000*.3).toISOString();
 await page.addInitScript(style=>localStorage.setItem('tokenplan.homeUsageStyle',style),style);await mockDesktop(page,'en',false,data);await page.goto('/');
 const cycles=home(page).locator('.hq-cycle-item');await expect(cycles.nth(0)).toHaveAttribute('data-cycle-elapsed','40');await expect(cycles.nth(1)).toHaveAttribute('data-cycle-elapsed','70');
 await settings(page);await page.getByRole('switch',{name:textFor('en').showRemaining,exact:true}).click();await back(page);
 await expect(cycles.nth(0)).toHaveAttribute('data-cycle-elapsed','40');await expect(cycles.nth(1)).toHaveAttribute('data-cycle-elapsed','70');
 await page.evaluate(()=>{(window as any).__beforeRefresh=(s:any)=>{s.accounts[0].metrics[0].resetsAt=new Date(Date.now()).toISOString();s.accounts[0].metrics[1].periodSeconds=null;};});
 await page.getByRole('button',{name:messages('en').refresh,exact:true}).click();
 for(const row of await cycles.all()){await expect(row).toHaveAttribute('data-cycle-elapsed','unknown');await expect(row.locator('[data-time-fill],[data-channel="time"] .hq-cycle-endpoint')).toHaveCount(0);await expect(row).toContainText('Cycle progress unavailable');}
});

test('Folded Ruler keeps 50% at the bend and 0/100 at opposite ends at both panel widths',async({page})=>{
 const data=largeDesktop(),account=data.accounts[0];data.accounts=[account];
 account.metrics=[0,50,100].map((percent,i)=>({...account.metrics[0],id:`q${i}`,percent}));
 await page.addInitScript(()=>localStorage.setItem('tokenplan.homeUsageStyle','ruler:folded'));await mockDesktop(page,'en',false,data);await page.goto('/');
 const scales=home(page).locator('.hq-rail-fold-scale');
 for(const width of [390,560]){
  await page.setViewportSize({width,height:800});
  await expect.poll(()=>scales.first().evaluate(e=>Math.abs(Number(e.querySelector('svg')!.getAttribute('width'))-e.getBoundingClientRect().width))).toBeLessThan(.1);
  const points=await scales.evaluateAll(es=>es.map(e=>{
   const dot=e.querySelector('[data-rail-marker]')!;
   return {width:e.getBoundingClientRect().width,x:Number(dot.getAttribute('cx')),y:Number(dot.getAttribute('cy'))};
  }));
  expect(points[0].x).toBeCloseTo(8,5);expect(points[0].y).toBeCloseTo(26,5);
  expect(points[1].x).toBeCloseTo(points[1].width-28,5);expect(points[1].y).toBeCloseTo(42,5);
  expect(points[2].x).toBeCloseTo(8,5);expect(points[2].y).toBeCloseTo(58,5);
 }
});
