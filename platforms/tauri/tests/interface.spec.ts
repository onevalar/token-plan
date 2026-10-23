import {test,expect} from '@playwright/test';
import {mockDesktop} from './mock';
import {largeDesktop} from './fixtures/largeDesktop';
for(const remaining of [false,true])test(`quota emphasis follows real usage, remaining=${remaining}`,async({page},info)=>{
 const data=largeDesktop(),base=data.accounts[0].metrics[0];
 data.settings.showRemaining=remaining;
 data.accounts[0].metrics=[79,80,100,90].map((used,i)=>({...base,id:`threshold-${i}`,label:i===2?'Sonnet':'Weekly',periodSeconds:604800,
  percent:remaining?100-used:used,hasData:i!==3}));
 data.accounts[1].metrics=[{...base,percent:remaining?54:46}];
 data.accounts[2].metrics=[{...base,percent:remaining?20:80}];
 data.accounts[2].email='personal@example.com';
 data.accounts=data.accounts.slice(0,3);
 await mockDesktop(page,'zh-Hans',false,data);await page.goto('/');
 await page.setViewportSize({width:390,height:720});
 const rows=page.locator('.dashboard .metric'),values=rows.locator('.value');
 await expect(values).toHaveText(remaining?['21%','20%','0%','—','54%','20%']:['79%','80%','100%','—','46%','80%']);
 for(const colorScheme of ['light','dark'] as const){
  await page.emulateMedia({colorScheme,reducedMotion:'reduce'});
  await expect(page.locator('html')).toHaveAttribute('data-theme',colorScheme);
  const colors=await rows.evaluateAll(es=>es.map(e=>({
   fill:getComputedStyle(e.querySelector('progress')!).accentColor,
   value:getComputedStyle(e.querySelector('.value')!).color,
  })));
  expect(colors[0].fill).toBe(await page.locator('.dashboard .provider-logo').first().evaluate(e=>getComputedStyle(e).color));
  expect(colors[0].fill).not.toBe(colors[1].fill);
  expect(colors[1].fill).toBe(colors[2].fill);expect(colors[1].fill).toBe(colors[5].fill);
  expect(colors[0].value).not.toBe(colors[1].value);
  expect(colors[1].value).toBe(colors[2].value);expect(colors[1].value).toBe(colors[5].value);
  expect(colors[3].value).toBe(colors[0].value);
  await expect(rows.first().locator('.metric-name')).toHaveCSS('text-align','left');
  expect(await rows.first().locator('.metric-name').evaluate(e=>getComputedStyle(e).color)).toBe(await page.locator('.mac-preview').evaluate(e=>getComputedStyle(e).color));
  await expect(page.locator('.dashboard .identity-line h2').first()).toHaveCSS('font-weight','500');
  await expect(page.locator('.dashboard .email')).toHaveCSS('font-weight','400');
  const contrasts=await page.evaluate(()=>{
   const ctx=document.createElement('canvas').getContext('2d')!;
   const luminance=(color:string)=>{ctx.clearRect(0,0,1,1);ctx.fillStyle=color;ctx.fillRect(0,0,1,1);
    const rgb=Array.from(ctx.getImageData(0,0,1,1).data).slice(0,3).map(v=>{const s=v/255;return s<=.04045?s/12.92:((s+.055)/1.055)**2.4;});
    return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;};
   const bg=luminance(getComputedStyle(document.querySelector('.mac-preview')!).backgroundColor);
   const ratio=(color:string)=>{const l=luminance(color);return (Math.max(l,bg)+.05)/(Math.min(l,bg)+.05);};
   const text=Array.from(document.querySelectorAll('.dashboard .value,.dashboard .reset,.dashboard .metric-name,.dashboard .metric-scope,.dashboard .identity-line h2,.dashboard .plan,.dashboard .email')).map(e=>ratio(getComputedStyle(e).color));
   const critical=document.querySelectorAll('.dashboard .metric')[1];
   return {minimum:Math.min(...text),value:ratio(getComputedStyle(critical.querySelector('.value')!).color),bar:ratio(getComputedStyle(critical.querySelector('progress')!).accentColor)};
  });
  expect(contrasts.minimum).toBeGreaterThanOrEqual(4.5);
  expect(contrasts.value).toBeLessThan(contrasts.bar);
  console.log(`${colorScheme}, remaining=${remaining}: minimum text ${contrasts.minimum.toFixed(2)}:1, alert text ${contrasts.value.toFixed(2)}:1, bar ${contrasts.bar.toFixed(2)}:1`);
  await page.screenshot({path:info.outputPath(`hierarchy-${colorScheme}.png`),animations:'disabled'});
 }
});
for(const colorScheme of ['light','dark'] as const)for(const width of [390,768,1024,1440]){
 test(`${colorScheme} ${width}px accounts and columns`,async({page},info)=>{
  await page.setViewportSize({width,height:850});await page.emulateMedia({colorScheme,reducedMotion:'reduce'});
  await mockDesktop(page);await page.goto('/');
  await expect(page.getByText('first@example.com',{exact:true})).toBeVisible();
  await expect(page.getByText('second.with.a.long.address@example.com',{exact:true})).toBeVisible();
  await expect(page.getByText('Argon',{exact:true})).toHaveCount(3);
  await expect(page.getByText('无数据',{exact:true})).toHaveCount(3);
  await expect(page.getByText('0%',{exact:true})).toHaveCount(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:info.outputPath('home.png'),fullPage:true});
  await page.getByRole('button',{name:'更多',exact:true}).click();
  await expect(page.getByRole('menuitem',{name:'关于'})).toBeVisible();
  await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'更多',exact:true})).toBeFocused();
 });
}
for(const language of ['en','zh-Hans','zh-Hant','ja','ko'])test(`quota labels and countdown alignment ${language}`,async({page},info)=>{
 const now=new Date(),data=largeDesktop(now),account=data.accounts[0],base=account.metrics[0];
 const labels=['Session','Weekly','Argon Weekly','Sonnet 4.5 · Extended Context Weekly','Web Searches','Fable Weekly','Monthly'];
 account.metrics=labels.map((label,i)=>({...base,id:`quota-${i}`,label,
  periodSeconds:[18000,604800,604800,604800,2592000,null,2592000][i],
  percent:[46,92,29,65,24,null,0][i],hasData:i!==5,notStarted:i===6,
  resetsAt:new Date(now.getTime()+[59*60,3600,6*86400+13*3600,29*86400+23*3600,2*86400,0,0][i]*1000).toISOString(),
 }));
 const amp=data.accounts.find(a=>a.family==='amp')!;
 amp.metrics=[{...amp.metrics[0],id:'amp.orb'},{...amp.metrics[0],id:'Orb Usage'}];
 data.accounts=[account,amp,data.accounts.find(a=>a.family==='deepseek')!];
 await mockDesktop(page,language,false,data);await page.goto('/');
 const rows=page.locator('.dashboard [data-provider="claude"] .metric');
 const orbs=page.locator('.dashboard [data-provider="amp"] .metric');
 await expect(orbs.locator('.metric-name')).toHaveText(['Orb','Orb']);
 await expect(orbs.locator('.metric-scope')).toHaveCount(0);
 await expect(rows).toHaveCount(7);
 await expect(rows.locator('.metric-name')).toHaveText(['5h','1w','1w','1w','30d','—','30d']);
 await expect(rows.nth(0).locator('.metric-scope')).toHaveCount(0);
 await expect(rows.nth(2).locator('.metric-scope')).toHaveText('Argon');
 await expect(rows.nth(3).locator('.metric-scope')).toHaveText('Sonnet 4.5 · Extended Context');
 await expect(rows.nth(5).getByRole('progressbar')).toHaveAccessibleName(/Fable Weekly/);
 await expect(rows.nth(5).locator('.value')).toHaveText('—');
 await expect(rows.nth(6).locator('.value')).toHaveText('0%');
 await expect(rows.nth(6).locator('.reset svg')).toHaveCount(0);
 await expect(page.locator('.dashboard .text-metric .amount')).toHaveText('¥126.85');
 for(const colorScheme of ['light','dark'] as const)for(const width of [390,350]){
  await page.emulateMedia({colorScheme,reducedMotion:'reduce'});await page.setViewportSize({width,height:850});
  const boxes=await rows.evaluateAll(elements=>elements.map(e=>{
   const box=(selector:string)=>{const r=e.querySelector(selector)!.getBoundingClientRect();return {x:r.x,right:r.right,y:r.y,height:r.height};};
   return {height:e.getBoundingClientRect().height,name:box('.metric-name'),bar:box('progress'),value:box('.value'),time:box('.reset > span'),
    icon:e.querySelector('.reset svg')?box('.reset svg'):null,scope:e.querySelector('.metric-scope')?box('.metric-scope'):null};
  }));
  for(const b of boxes){
   expect(b.height).toBe(28);
   expect(b.bar.x).toBeCloseTo(boxes[0].bar.x,1);
   expect(b.bar.right).toBeCloseTo(boxes[0].bar.right,1);
   expect(b.time.right).toBeCloseTo(b.icon?boxes[0].time.right:boxes[0].icon!.right,1);
   expect(b.bar.y+b.bar.height/2).toBeCloseTo(b.name.y+b.name.height/2,1);
   expect(b.bar.y+b.bar.height/2).toBeCloseTo(b.value.y+b.value.height/2,1);
   if(b.icon){expect(b.icon.x-b.time.right).toBeCloseTo(4,1);expect(b.icon.right).toBeCloseTo(boxes[0].icon!.right,1);}
   if(b.scope){expect(b.scope.x).toBeCloseTo(b.bar.x,1);expect(b.bar.y-b.scope.y-b.scope.height).toBeCloseTo(1,1);}
  }
  expect(boxes[3].scope!.height).toBe(boxes[2].scope!.height);
  if(width===350)expect(await rows.nth(3).locator('.metric-scope').evaluate(e=>e.scrollWidth>e.clientWidth)).toBe(true);
  await expect(rows.nth(3).getByRole('progressbar')).toHaveAccessibleName(/Sonnet 4.5 · Extended Context/);
  expect(await page.locator('.dashboard').evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);
  if(language==='zh-Hans')await page.screenshot({path:info.outputPath(`quota-${colorScheme}-${width}.png`),animations:'disabled'});
 }
 if(language==='zh-Hans'){
  await page.emulateMedia({colorScheme:'light'});await page.setViewportSize({width:390,height:850});
  await page.getByRole('button',{name:'更多',exact:true}).click();await page.getByRole('menuitem',{name:'通用设置',exact:true}).click();
  await page.getByRole('combobox',{name:'密度',exact:true}).click();await page.getByRole('option',{name:'宽松',exact:true}).click();
  await page.getByRole('button',{name:'返回',exact:true}).click();
  await expect(rows.nth(3).locator('.metric-scope')).toHaveText('Sonnet 4.5 · Extended Context');
  await page.screenshot({path:info.outputPath('quota-comfortable.png'),animations:'disabled'});
  await page.getByRole('button',{name:'Claude first@example.com',exact:true}).click();

  await page.getByRole('button',{name:'编辑首页显示',exact:true}).click();
  await expect(page.locator('.placement-row > span').filter({hasText:'Sonnet 4.5 · Extended Context · 1w'})).toBeVisible();
 }
});
test('account settings allow zero home metrics and preserve another account',async({page},info)=>{
 await page.setViewportSize({width:390,height:850});
 await mockDesktop(page);await page.goto('/');
 await page.getByRole('button',{name:'Claude first@example.com',exact:true}).click();

 await page.getByRole('button',{name:'编辑首页显示',exact:true}).click();
 for(const row of await page.locator('.placement-row').all()){
  await row.getByRole('combobox').click();await page.getByRole('option',{name:'仅详情',exact:true}).click();
 }
 await page.getByRole('button',{name:'确定',exact:true}).click();
 await page.getByRole('button',{name:'返回',exact:true}).click();
 await expect(page.locator('.account-block').first().locator('.metric')).toHaveCount(0);
 await expect(page.locator('.account-block').nth(1).locator('.metric')).toHaveCount(2);
 // Showing or hiding an account belongs to Account Management only.
 await page.getByRole('button',{name:'更多',exact:true}).click();await page.getByRole('menuitem',{name:'订阅管理',exact:true}).click();
 await page.getByRole('switch',{name:'显示账号 Claude first@example.com',exact:true}).click();
 await page.getByRole('button',{name:'返回',exact:true}).click();
 await expect(page.getByText('first@example.com',{exact:true})).toHaveCount(0);
 await expect(page.getByText('second.with.a.long.address@example.com',{exact:true})).toBeVisible();
 await page.screenshot({path:info.outputPath('account-hidden.png'),fullPage:true});
});
test('ring and percentage keep the same accounts and removal is confirmed',async({page},info)=>{
 await page.setViewportSize({width:390,height:850});
 await mockDesktop(page);await page.goto('/');
 await page.getByRole('button',{name:'更多',exact:true}).click();await page.getByRole('menuitem',{name:'通用设置'}).click();
 await expect(page.locator('.menu-bar-preview .tray-glyph')).toHaveCount(3);
 await expect(page.locator('.menu-bar-preview .tray-glyph sup')).toHaveText(['1','2']);
 await page.getByRole('combobox',{name:'菜单栏样式',exact:true}).click();await page.getByRole('option',{name:'百分比',exact:true}).click();
 await expect(page.locator('.menu-bar-preview .tray-glyph')).toHaveCount(3);await expect(page.locator('.menu-bar-preview .tray-glyph sup')).toHaveText(['1','2']);
 await expect(page.getByRole('option',{name:'百分比',exact:true})).toHaveCount(0);
 await page.screenshot({path:info.outputPath('settings.png'),fullPage:true});
 await page.getByRole('button',{name:'返回',exact:true}).click();
 await page.getByRole('button',{name:'Claude first@example.com',exact:true}).click();
 await page.getByRole('button',{name:'移除账号',exact:true}).click();
 await expect(page.getByText('终端登录与历史记录会保留。')).toHaveCount(0);
 await expect(page.getByRole('button',{name:'取消',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByRole('button',{name:'取消',exact:true}).click();
 await page.getByRole('button',{name:'返回',exact:true}).click();await expect(page.getByText('first@example.com',{exact:true})).toBeVisible();
});
test('update installation errors stay visible and do not restart',async({page})=>{
 await mockDesktop(page);await page.goto('/');
 await page.getByRole('button',{name:'更多',exact:true}).click();await page.getByRole('menuitem',{name:'检查更新',exact:true}).click();
 await expect(page.getByRole('status')).toContainText('9.9.9');
 await page.getByRole('button',{name:'安装并重启',exact:true}).click();await expect(page.getByRole('status')).toContainText('更新安装失败');
});
test('update entry checks immediately, preserves pending work and allows retry after failure',async({page})=>{
 await mockDesktop(page);
 await page.addInitScript(()=>{
  const api=(window as any).__TAURI_INTERNALS__,invoke=api.invoke;
  (window as any).__checks=0;
  api.invoke=async(command:string,args:unknown)=>{
   if(command==='plugin:updater|check'){
    (window as any).__checks++;
    await new Promise<void>(resolve=>{(window as any).__finishCheck=resolve;});
    if((window as any).__checks===1)throw 'offline';
   }
   return invoke(command,args);
  };
 });
 await page.goto('/');
 const open=async()=>{await page.getByRole('button',{name:'更多',exact:true}).click();await page.getByRole('menuitem',{name:'检查更新',exact:true}).click();};
 await open();
 await expect(page.getByRole('button',{name:'检查更新',exact:true})).toHaveAttribute('aria-busy','true');
 await page.getByRole('button',{name:'返回',exact:true}).click();await open();
 expect(await page.evaluate(()=>(window as any).__checks)).toBe(1);
 await page.evaluate(()=>(window as any).__finishCheck());
 await expect(page.getByRole('status')).toHaveText('无法检查更新，请稍后重试。');
 await page.getByRole('button',{name:'检查更新',exact:true}).click();
 await expect(page.getByRole('button',{name:'检查更新',exact:true})).toHaveAttribute('aria-busy','true');
 await page.evaluate(()=>(window as any).__finishCheck());
 await expect(page.getByRole('status')).toContainText('9.9.9');
 expect(await page.evaluate(()=>(window as any).__checks)).toBe(2);
});
for(const [locale,settings] of [['en','General Settings'],['zh-Hant','一般設定'],['ja','一般設定'],['ko','일반 설정']])test(`localized navigation ${locale}`,async({page})=>{
 await mockDesktop(page,locale);await page.goto('/');await page.locator('header button').last().click();
 await expect(page.getByRole('menuitem',{name:settings,exact:true})).toBeVisible();
});

test('confirmed account removal leaves contiguous tray numbering',async({page})=>{
 await mockDesktop(page);await page.goto('/');
 await page.getByRole('button',{name:'Claude first@example.com',exact:true}).click();

 await page.getByRole('button',{name:'移除账号',exact:true}).click();
 // Arc intentionally ignores a confirming press within its 280 ms accidental-double-click guard.
 await page.waitForTimeout(300);
 await page.getByRole('group').getByRole('button',{name:'移除账号',exact:true}).click();
 await expect(page.locator('.account-block').filter({hasText:'first@example.com'})).toHaveCount(0);
 await expect(page.locator('.account-block').filter({hasText:'second.with.a.long.address@example.com'})).toHaveCount(1);
 await page.getByRole('button',{name:'更多',exact:true}).click();await page.getByRole('menuitem',{name:'通用设置'}).click();
 await expect(page.locator('.menu-bar-preview .tray-glyph')).toHaveCount(2);
 await expect(page.locator('.menu-bar-preview .tray-glyph sup')).toHaveCount(0);
});

test('service order is reflected in the homepage',async({page})=>{
 await mockDesktop(page);await page.goto('/');
 await page.getByRole('button',{name:'更多',exact:true}).click();await page.getByRole('menuitem',{name:'订阅管理',exact:true}).click();
 await page.getByRole('button',{name:'排序',exact:true}).click();
 await page.locator('.configured-account').nth(1).getByRole('button',{name:/拖动排序/}).press('ArrowUp');
 await page.getByRole('button',{name:'返回',exact:true}).click();
 await expect(page.locator('.account-block').first()).toContainText('second.with.a.long.address@example.com');
});

test('Escape dismisses the panel from details but first closes an open menu',async({page})=>{
 await mockDesktop(page);await page.goto('/');
 await page.getByRole('button',{name:'更多',exact:true}).click();
 await page.keyboard.press('Escape');
 await expect(page.getByRole('menu',{includeHidden:true})).toHaveCount(0);
 expect(await page.evaluate(()=>(window as any).__panelHides??0)).toBe(0);
 await page.getByRole('button',{name:'Claude first@example.com',exact:true}).click();
 await page.keyboard.press('Escape');
 expect(await page.evaluate(()=>(window as any).__panelHides)).toBe(1);
});

test('confirmation timeout pauses for keyboard focus, including internal focus moves',async({page,browserName})=>{
 // macOS WebKit uses Option+Tab to include buttons regardless of the host's full-keyboard-access preference.
 const previousControl=browserName==='webkit'&&process.platform==='darwin'?'Alt+Shift+Tab':'Shift+Tab';
 await mockDesktop(page);await page.goto('/');
 await page.getByRole('button',{name:'Claude first@example.com',exact:true}).click();

 await page.mouse.move(0,0);
 await page.getByRole('button',{name:'移除账号',exact:true}).focus();await page.keyboard.press('Enter');
 const control=page.locator('.danger-zone [data-mode]');
 await expect(control.getByRole('group').getByRole('button',{name:'移除账号',exact:true})).toBeFocused();
 await page.waitForTimeout(6200);
 await expect(control).toHaveAttribute('data-state','confirming');
 await page.keyboard.press(previousControl);
 await expect(control.getByRole('button',{name:'取消',exact:true})).toBeFocused();
 await page.waitForTimeout(6200);
 await expect(control).toHaveAttribute('data-state','confirming');
 // Leaving by keyboard resumes the clock; an outside click would cancel immediately instead.
 await page.keyboard.press(previousControl);
 await expect(control).toHaveAttribute('data-state','idle',{timeout:7000});
});

test('reduced motion stops the pending spinner without hiding its status',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await mockDesktop(page);
 await page.addInitScript(()=>{
  const internals=(window as any).__TAURI_INTERNALS__,invoke=internals.invoke;
  internals.invoke=async(command:string,args:any)=>{
   if(command==='desktop_request'&&args.request.method==='remove')await new Promise(()=>{});
   return invoke(command,args);
  };
 });
 await page.goto('/');
 await page.getByRole('button',{name:'Claude first@example.com',exact:true}).click();

 await page.getByRole('button',{name:'移除账号',exact:true}).click();
 await page.waitForTimeout(300);
 await page.getByRole('group').getByRole('button',{name:'移除账号',exact:true}).click();
 const control=page.locator('.danger-zone [data-mode]'),spinner=control.locator('svg');
 await expect(control).toHaveAttribute('data-state','pending');
 await expect(control).toHaveAttribute('aria-busy','true');
 await expect(control.locator('[data-face="pending"]')).toHaveText('正在移除…');
 await expect(control.getByRole('status')).toHaveText('正在移除…');
 await expect(spinner).toHaveCSS('animation-name','none');
 await page.emulateMedia({reducedMotion:'no-preference'});
 await expect(spinner).not.toHaveCSS('animation-name','none');
 await page.emulateMedia({reducedMotion:'reduce'});
 await expect(spinner).toHaveCSS('animation-name','none');
 await expect(control.locator('[data-face="pending"]')).toBeVisible();
});
