import {test,expect,type Page} from '@playwright/test';
import {mockDesktop} from './mock';
import {largeDesktop} from './fixtures/largeDesktop';

const visible=(page:Page)=>page.locator('.preview-page:not([hidden])');
test.beforeEach(async({page},info)=>{
 await page.addInitScript(platform=>(window as any).__panelFrame={platform,rounded:platform==='macos'},String(info.project.metadata.platform??'macos'));
});
async function settings(page:Page){await page.getByRole('button',{name:'更多',exact:true}).click();await page.getByRole('menuitem',{name:'通用设置',exact:true}).click();}

test('platform settings expose live tray quotas only on macOS',async({page},info)=>{
 const mac=(info.project.metadata.platform??'macos')==='macos';
 await mockDesktop(page,'zh-Hans',false,largeDesktop());await page.goto('/');
 await expect(visible(page).locator('.tray-panel-strip')).toHaveCount(0);
 await settings(page);
 await expect(visible(page).locator('.menu-bar-preview')).toHaveCount(mac?1:0);
 await expect(page.getByRole('combobox',{name:/菜单栏样式|托盘样式/})).toHaveCount(mac?1:0);
 await expect(page.getByRole('button',{name:/^用量样式/})).toBeVisible();
 await page.getByRole('button',{name:'返回',exact:true}).click();
 await page.getByRole('button',{name:'Claude first@example.com',exact:true}).click();
 await page.getByRole('button',{name:'编辑首页显示',exact:true}).click();
 // Global styles have no duplicate account-level entry.
 await expect(visible(page).getByRole('switch')).toHaveCount(0);
 await expect(visible(page).locator('.linked-setting').filter({hasText:'菜单栏'})).toHaveCount(0);
 await expect(visible(page).locator('.linked-setting').filter({hasText:'首页用量样式'})).toHaveCount(0);
 const rows=visible(page).locator('.placement-row');
 await expect(rows.first().getByRole('combobox')).toBeVisible();
 await rows.first().getByRole('combobox').click();await page.getByRole('option',{name:'仅详情',exact:true}).click();
 await expect.poll(async()=>(await page.evaluate(()=>(window as any).__requests.filter((r:any)=>r.method==='metricLayout'))).length).toBe(1);
 await page.getByRole('button',{name:'完成',exact:true}).click();
 expect(await page.evaluate(()=>(window as any).__requests.filter((r:any)=>r.method==='metricLayout'))).toHaveLength(1);
 expect(await page.evaluate(()=>(window as any).__requests.at(-1))).toMatchObject({method:'metricLayout',value:expect.arrayContaining([expect.objectContaining({placement:'details'})])});
 expect(await visible(page).evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);
 await page.screenshot({path:info.outputPath('account-settings.png'),animations:'disabled'});
});

for(const theme of ['light','dark'] as const)test(`Antigravity keeps periods and pairs two rings alongside Argon in ${theme}`,async({page},info)=>{
 await page.emulateMedia({colorScheme:theme});
 const data=largeDesktop(),account=data.accounts.find(a=>a.family==='antigravity')!;
 data.accounts=[account];account.metrics=account.metrics.slice(0,3);data.settings.appearance='system';
 await mockDesktop(page,'zh-Hans',false,data);await page.goto('/');
 await expect(visible(page).locator('.metric-name')).toHaveText(['5h','1w','1w']);
 await expect(visible(page).locator('.metric-scope')).toHaveText(['Argon']);
 await settings(page);
 await page.getByRole('button',{name:/^用量样式/}).click();
 await page.getByRole('group',{name:'用量样式',exact:true}).getByRole('button',{name:'环形',exact:true}).click();
 await page.getByRole('combobox',{name:'子样式',exact:true}).click();
 await page.getByRole('option',{name:'双环',exact:true}).click();
 await page.getByRole('button',{name:'返回',exact:true}).click();
 await expect(visible(page).locator('.home-concentric > svg > g')).toHaveCount(2);
 await expect(visible(page).locator('.home-concentric-readings .home-reading')).toHaveCount(2);
 await expect(visible(page).locator('.home-compact')).toHaveCount(1);
 await expect(visible(page).locator('.home-concentric')).toContainText('5h');
 await expect(visible(page).locator('.home-concentric')).toContainText('1w');
 await expect(visible(page).locator('.home-compact')).toContainText('Argon · 1w');
 await expect(visible(page).getByRole('meter')).toHaveCount(3);
 expect(await visible(page).evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);
 await page.screenshot({path:info.outputPath(`antigravity-concentric-${theme}.png`),animations:'disabled'});
});

test('native Show Home returns from settings to Home',async({page})=>{
 await mockDesktop(page,'zh-Hans',false,largeDesktop());await page.goto('/');await settings(page);
 await expect(page.getByRole('heading',{level:1})).toHaveText('通用设置');
 await page.evaluate(()=>(window as any).__emitTauriEvent('show-home',null));
 await expect(page.getByRole('heading',{level:1})).toHaveText('TokenPlan');
 await expect(visible(page).locator('.dashboard')).toBeVisible();
});

for(const reduced of [false,true])test(`panel style sits under Appearance and follows the system transparency setting${reduced?' (reduced)':''}`,async({page},info)=>{
 const platform=String(info.project.metadata.platform??'macos');
 if(reduced)await page.addInitScript(platform=>{
  if(platform==='macos'){(window as any).__panelFrame={platform,rounded:true,reduceTransparency:true};return;}
  const original=window.matchMedia.bind(window);window.matchMedia=query=>query.includes('reduced-transparency')?{...original(query),matches:true,media:query,addEventListener(){},removeEventListener(){}} as MediaQueryList:original(query);
 },platform);
 await mockDesktop(page);await page.goto('/');await settings(page);
 const style=page.getByRole('combobox',{name:'面板样式',exact:true}),slider=page.getByRole('slider',{name:'透明度',exact:true});
 if(platform==='linux'){await expect(style).toHaveCount(0);await expect(slider).toHaveCount(0);return;}
 const group=visible(page).locator('.preference-group').filter({has:page.getByRole('heading',{name:'外观与语言',exact:true})});
 await expect(group.getByRole('combobox',{name:'面板样式',exact:true})).toBeVisible();
 await expect(slider).toHaveAttribute('aria-valuetext','中');
 await expect(slider).toHaveAttribute('aria-valuemin','20');
 await expect(group.getByText('系统设置中已关闭透明效果，面板保持不透明。',{exact:true})).toHaveCount(reduced?1:0);
 await expect(page.locator('html')).toHaveAttribute('data-panel',reduced?'solid':'glass');
 const effects=()=>page.evaluate(()=>(window as any).__windowEffects??[]);
 if(reduced){
  await expect(style).toBeDisabled();await expect(slider).toHaveAttribute('aria-disabled','true');
  if(platform==='windows')await expect.poll(effects).toEqual([null]);
  return;
 }
 if(platform==='windows')await expect.poll(effects).toEqual([{effects:['acrylic']}]);
 await style.click();await page.getByRole('option',{name:'纯色',exact:true}).click();
 await expect(page.locator('html')).toHaveAttribute('data-panel','solid');
 await expect(slider).toHaveCount(0);
 // Only Windows turns its native material off; macOS keeps vibrancy under the opaque page.
 await expect.poll(effects).toEqual(platform==='windows'?[{effects:['acrylic']},null]:[]);
});

test('service heading stays visible while scrolling accounts without covering keyboard focus',async({page})=>{
 await page.setViewportSize({width:390,height:680});
 await page.addInitScript(()=>localStorage.setItem('tokenplan.homeUsageStyle','instrument'));
 await mockDesktop(page,'zh-Hans',false,largeDesktop());await page.goto('/');
 const group=visible(page).locator('.provider[data-provider="claude"]');
 const heading=group.getByRole('heading',{name:'Claude',exact:true});
 const account=group.getByRole('button',{name:'Claude second.with.a.long.address@example.com',exact:true});
 await expect(account).toBeVisible();
 const viewport=(await visible(page).boundingBox())!,entry=(await account.boundingBox())!;
 // Put the second account just below the viewport edge, where a sticky heading could cover it.
 await visible(page).evaluate((e,y)=>e.scrollTop=y,entry.y-viewport.y-4);
 const headingBox=(await heading.boundingBox())!;
 expect(headingBox.y).toBeGreaterThanOrEqual(viewport.y);
 expect(headingBox.y+headingBox.height).toBeLessThan(viewport.y+60);
 await account.focus();
 await expect(account).toBeFocused();
 expect((await account.boundingBox())!.y).toBeGreaterThan(headingBox.y+headingBox.height);
 expect(await account.evaluate(e=>{const r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));})).toBe(true);
 await page.keyboard.press('Enter');
 await expect(page.getByRole('heading',{level:1})).toHaveText('Claude');
});

for(const density of ['compact','comfortable'])test(`Home keeps frameless service groups and aligned readings in ${density} density`,async({page})=>{
 await page.setViewportSize({width:390,height:680});
 await page.addInitScript(density=>localStorage.setItem('tokenplan.homeDensity',density),density);
 await mockDesktop(page,'zh-Hans',false,largeDesktop());
 for(const style of ['glass','solid']){
  await page.goto('/');
  await page.evaluate(style=>localStorage.setItem('tokenplan.panelSurface',JSON.stringify({style,transparency:60})),style);
  await page.reload();
  const groups=visible(page).locator('.service-group');await expect(groups.first()).toBeVisible();
  for(const group of await groups.all()){
   const surface=await group.evaluate(e=>{const s=getComputedStyle(e);return {left:s.borderLeftWidth,right:s.borderRightWidth,top:s.borderTopWidth,radius:s.borderTopLeftRadius,background:s.backgroundColor,padding:s.paddingLeft};});
   expect(surface).toEqual({left:'0px',right:'0px',top:'0px',radius:'0px',background:'rgba(0, 0, 0, 0)',padding:'0px'});
   const heading=group.locator(':scope > .family-heading');
   if(await heading.count())expect((await heading.boundingBox())!.y).toBeGreaterThanOrEqual((await group.boundingBox())!.y);
  }
  const pageBox=(await visible(page).boundingBox())!,metricBox=(await visible(page).locator('.metric').first().boundingBox())!;
  expect(metricBox.x-pageBox.x).toBe(24);
  expect(await visible(page).evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);
 }
});

for(const theme of ['light','dark'] as const)test(`selected menu bar metrics retain readable inverse labels in ${theme} glass`,async({page},info)=>{
 test.skip(info.project.metadata.platform!=='macos','Menu bar metrics are macOS-only.');
 const data=largeDesktop();data.settings.appearance=theme;
 await mockDesktop(page,'zh-Hans',false,data);await page.goto('/');await settings(page);
 const chip=visible(page).locator('.metric-chip[aria-pressed="true"]').first();
 await chip.scrollIntoViewIfNeeded();await expect(chip).toBeVisible();
 const contrast=await chip.evaluate(e=>{
  const s=getComputedStyle(e),ctx=document.createElement('canvas').getContext('2d')!;
  ctx.fillStyle=s.backgroundColor;ctx.fillRect(0,0,1,1);const back=ctx.getImageData(0,0,1,1).data;
  ctx.fillStyle=s.color;ctx.fillRect(0,0,1,1);const text=ctx.getImageData(0,0,1,1).data;
  const luminance=(rgb:Uint8ClampedArray)=>[.2126,.7152,.0722].reduce((sum,weight,i)=>{const c=rgb[i]/255;return sum+weight*(c<=.04045?c/12.92:((c+.055)/1.055)**2.4);},0);
  const [low,high]=[luminance(back),luminance(text)].sort((a,b)=>a-b);return (high+.05)/(low+.05);
 });
 expect(contrast).toBeGreaterThanOrEqual(4.5);
});

test('native transparency changes update the open Mac panel without overwriting its saved style',async({page},info)=>{
 test.skip(info.project.metadata.platform!=='macos','NSWorkspace is macOS-only.');
 await page.addInitScript(()=>{
  (window as any).__panelFrame={platform:'macos',rounded:true,reduceTransparency:true};
  localStorage.setItem('tokenplan.panelSurface',JSON.stringify({style:'glass',transparency:80}));
 });
 await mockDesktop(page);await page.goto('/');await settings(page);
 const style=page.getByRole('combobox',{name:'面板样式',exact:true});
 await expect(page.locator('html')).toHaveAttribute('data-panel','solid');await expect(style).toBeDisabled();
 for(const reduced of [false,true,false]){
  await page.evaluate(reduceTransparency=>(window as any).__emitTauriEvent('panel-frame',{platform:'macos',rounded:true,reduceTransparency}),reduced);
  await expect(page.locator('html')).toHaveAttribute('data-panel',reduced?'solid':'glass');
  if(reduced)await expect(style).toBeDisabled();else await expect(style).toBeEnabled();
  await expect(page.getByRole('slider',{name:'透明度',exact:true})).toHaveAttribute('aria-valuenow','80');
 }
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('tokenplan.panelSurface')!))).toEqual({style:'glass',transparency:80});
});
