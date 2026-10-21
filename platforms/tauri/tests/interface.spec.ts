import {test,expect} from '@playwright/test';
import {mockDesktop} from './mock';
for(const colorScheme of ['light','dark'] as const)for(const width of [390,768,1024,1440]){
 test(`${colorScheme} ${width}px accounts and columns`,async({page},info)=>{
  await page.setViewportSize({width,height:850});await page.emulateMedia({colorScheme,reducedMotion:'reduce'});
  await mockDesktop(page);await page.goto('/');
  await expect(page.getByText('first@example.com',{exact:true})).toBeVisible();
  await expect(page.getByText('second.with.a.long.address@example.com',{exact:true})).toBeVisible();
  await expect(page.getByText('Argon · 1w',{exact:true})).toHaveCount(3);
  await expect(page.getByText('无数据',{exact:true})).toHaveCount(3);
  await expect(page.getByText('0%',{exact:true})).toHaveCount(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:info.outputPath('home.png'),fullPage:true});
  await page.getByRole('button',{name:'更多',exact:true}).click();
  await expect(page.getByRole('menuitem',{name:'关于'})).toBeVisible();
  await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'更多',exact:true})).toBeFocused();
 });
}
test('account settings allow zero home metrics and preserve another account',async({page},info)=>{
 await page.setViewportSize({width:390,height:850});
 await mockDesktop(page);await page.goto('/');
 await page.getByRole('button',{name:'Claude first@example.com',exact:true}).click();
 await page.getByRole('button',{name:'设置',exact:true}).click();
 for(const row of await page.locator('.placement-row').all()){
  await row.getByRole('combobox').click();await page.getByRole('option',{name:'仅详情',exact:true}).click();
 }
 await page.getByRole('button',{name:'返回',exact:true}).click();
 await expect(page.locator('.account-block').first().locator('.metric')).toHaveCount(0);
 await expect(page.locator('.account-block').nth(1).locator('.metric')).toHaveCount(2);
 await page.getByRole('button',{name:'Claude first@example.com',exact:true}).click();await page.getByRole('button',{name:'设置',exact:true}).click();
 await page.getByRole('switch',{name:'显示账号',exact:true}).click();
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
 await page.getByRole('button',{name:'Claude first@example.com',exact:true}).click();await page.getByRole('button',{name:'设置',exact:true}).click();
 await page.getByRole('button',{name:'移除账号',exact:true}).click();
 await expect(page.getByText('终端登录与历史记录会保留。').first()).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByRole('button',{name:'取消',exact:true}).click();
 await page.getByRole('button',{name:'返回',exact:true}).click();await expect(page.getByText('first@example.com',{exact:true})).toBeVisible();
});
test('update installation errors stay visible and do not restart',async({page})=>{
 await mockDesktop(page);await page.goto('/');
 await page.getByRole('button',{name:'更多',exact:true}).click();await page.getByRole('menuitem',{name:'检查更新',exact:true}).click();
 await page.getByRole('button',{name:'检查更新',exact:true}).click();
 await expect(page.getByRole('status')).toContainText('9.9.9');
 await page.getByRole('button',{name:'安装并重启',exact:true}).click();await expect(page.getByRole('status')).toContainText('更新安装失败');
});
for(const [locale,settings] of [['en','General Settings'],['zh-Hant','一般設定'],['ja','一般設定'],['ko','일반 설정']])test(`localized navigation ${locale}`,async({page})=>{
 await mockDesktop(page,locale);await page.goto('/');await page.locator('header button').last().click();
 await expect(page.getByRole('menuitem',{name:settings,exact:true})).toBeVisible();
});

test('confirmed account removal leaves contiguous tray numbering',async({page})=>{
 await mockDesktop(page);await page.goto('/');
 await page.getByRole('button',{name:'Claude first@example.com',exact:true}).click();
 await page.getByRole('button',{name:'设置',exact:true}).click();
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
 await page.getByRole('button',{name:'更多',exact:true}).click();await page.getByRole('menuitem',{name:'服务配置'}).click();
 await page.getByRole('button',{name:'排序',exact:true}).click();
 await page.locator('.configured-account').nth(1).getByRole('button',{name:/上移/}).click();
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
 await page.getByRole('button',{name:'设置',exact:true}).click();
 await page.mouse.move(0,0);
 await page.getByRole('button',{name:'移除账号',exact:true}).focus();await page.keyboard.press('Enter');
 const control=page.locator('.remove-account [data-mode]');
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
 await page.getByRole('button',{name:'设置',exact:true}).click();
 await page.getByRole('button',{name:'移除账号',exact:true}).click();
 await page.waitForTimeout(300);
 await page.getByRole('group').getByRole('button',{name:'移除账号',exact:true}).click();
 const control=page.locator('.remove-account [data-mode]'),spinner=control.locator('svg');
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
